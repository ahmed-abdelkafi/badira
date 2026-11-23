import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { makeAdmin } from "../helpers/users";
import {
  addReservationNote,
  changeReservationStatus,
  createReservationRequest,
  getReservation,
  listReservations,
  logWhatsAppOpened,
  notifyNewReservation,
  reservationStats,
  ReservationError,
} from "@/server/services/reservations";
import { reservationRequestSchema } from "@/lib/validation/reservation";
import { REFERENCE_PATTERN } from "@/lib/reference";
import { addDaysIso, todayIso } from "@/lib/dates";

const D = (days: number) => addDaysIso(todayIso(), days);
import { resetDb } from "../helpers/db";

function request(overrides: Record<string, unknown> = {}) {
  const parsed = reservationRequestSchema().parse({
    checkIn: D(30),
    checkOut: D(34),
    guests: 2,
    rooms: 1,
    preferredCategory: "legend",
    firstName: "Amira",
    lastName: "Ben Salah",
    email: "amira@example.com",
    dialCode: "+216",
    phone: "92 000 000",
    consent: true,
    locale: "fr",
    ...overrides,
  });
  return parsed;
}

let adminId: string;
beforeEach(async () => {
  await resetDb();
  adminId = (await makeAdmin("agent@test.local", "reservations", "Correct-Horse-42", "Agent")).id;
});

describe("reservation submission", () => {
  it("stores a pending request with a unique reference, history and a notification event", async () => {
    const created = await createReservationRequest(request(), "10.0.0.1");
    expect(created.reference).toMatch(REFERENCE_PATTERN);
    const r = await getReservation(created.id);
    expect(r?.status).toBe("pending");
    expect(r?.phone).toBe("+21692000000");
    expect(r?.history.map((h) => h.h.action)).toEqual(["created"]);
    const events = await db().select().from(schema.notificationEvents);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "reservation.created", payload: { reference: created.reference } });
  });

  it("links a preferred suite by slug and rejects unknown or inactive suites", async () => {
    const [suite] = await db()
      .insert(schema.suites)
      .values({ slug: "nour", name: "Nour Suite", collection: "standard", inventoryCategory: "nour" })
      .returning();
    const ok = await createReservationRequest(request({ preferredCategory: "suite:nour" }), null);
    expect((await getReservation(ok.id))?.preferredSuiteId).toBe(suite.id);
    await expect(createReservationRequest(request({ preferredCategory: "suite:ghost" }), null)).rejects.toMatchObject({ code: "invalid_suite" });
    await db().update(schema.suites).set({ status: "inactive" });
    await expect(createReservationRequest(request({ preferredCategory: "suite:nour" }), null)).rejects.toBeInstanceOf(ReservationError);
  });

  it("rate-limits repeated submissions from one IP", async () => {
    for (let i = 0; i < 5; i++) await createReservationRequest(request({ email: `g${i}@example.com` }), "10.0.0.9");
    await expect(createReservationRequest(request({ email: "g6@example.com" }), "10.0.0.9")).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("never sends email (WhatsApp-only workflow) and does not fake push without VAPID keys", async () => {
    const created = await createReservationRequest(request(), null);
    await notifyNewReservation(created);
    const r = await getReservation(created.id);
    expect(r?.history.map((h) => h.h.action)).toEqual(["created"]);
    expect(await db().select().from(schema.pushDeliveries)).toHaveLength(0);
  });
});

describe("reservation decisions", () => {
  it("accepts a pending request, recording who and when", async () => {
    const { id } = await createReservationRequest(request(), null);
    const res = await changeReservationStatus({ actorId: adminId, reservationId: id, to: "confirmed", message: "Bienvenue" });
    expect(res.reservation.status).toBe("confirmed");
    expect(res.reservation.decidedBy).toBe(adminId);
    expect(res.reservation.decidedAt).toBeInstanceOf(Date);
    const r = await getReservation(id);
    const change = r!.history.find((h) => h.h.action === "status_changed")!;
    expect(change.h).toMatchObject({ fromStatus: "pending", toStatus: "confirmed", message: "Bienvenue", actorId: adminId });
    expect(change.actorName).toBe("Agent");
    const audit = await db().select().from(schema.auditLogs).where(eq(schema.auditLogs.action, "reservation.confirmed"));
    expect(audit[0]).toMatchObject({ actorId: adminId, entityId: id });
  });

  it("declines a request", async () => {
    const { id } = await createReservationRequest(request(), null);
    const res = await changeReservationStatus({ actorId: adminId, reservationId: id, to: "declined", message: "Complet" });
    expect(res.reservation.status).toBe("declined");
  });

  it("refuses invalid transitions (e.g. re-deciding a declined request)", async () => {
    const { id } = await createReservationRequest(request(), null);
    await changeReservationStatus({ actorId: adminId, reservationId: id, to: "declined" });
    await expect(changeReservationStatus({ actorId: adminId, reservationId: id, to: "confirmed" })).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(changeReservationStatus({ actorId: adminId, reservationId: id, to: "completed" })).rejects.toMatchObject({ code: "invalid_transition" });
  });

  it("serialises concurrent decisions so only one wins", async () => {
    const { id } = await createReservationRequest(request(), null);
    const results = await Promise.allSettled([
      changeReservationStatus({ actorId: adminId, reservationId: id, to: "confirmed" }),
      changeReservationStatus({ actorId: adminId, reservationId: id, to: "declined" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const changes = (await getReservation(id))!.history.filter((h) => h.h.action === "status_changed");
    expect(changes).toHaveLength(1);
  });

  it("emits an update event for real-time dashboards", async () => {
    const { id } = await createReservationRequest(request(), null);
    await changeReservationStatus({ actorId: adminId, reservationId: id, to: "confirmed" });
    const types = (await db().select().from(schema.notificationEvents)).map((e) => e.type);
    expect(types).toEqual(["reservation.created", "reservation.updated"]);
  });
});

describe("notes, WhatsApp log, listing and stats", () => {
  it("adds internal notes and logs WhatsApp openings without claiming delivery", async () => {
    const { id } = await createReservationRequest(request(), null);
    await addReservationNote(adminId, id, "  Client VIP  ");
    await addReservationNote(adminId, id, "   ");
    await logWhatsAppOpened(adminId, id, "accept", "fr");
    const r = await getReservation(id);
    expect(r!.notes.map((n) => n.n.body)).toEqual(["Client VIP"]);
    const wa = r!.history.find((h) => h.h.action === "whatsapp_opened")!;
    expect(wa.h.message).toMatch(/not tracked/i);
    expect(wa.h.meta).toMatchObject({ channel: "click_to_chat" });
  });

  it("searches, filters by status and date, and paginates", async () => {
    await createReservationRequest(request({ firstName: "Karim", email: "karim@example.com", checkIn: D(60), checkOut: D(62) }), null);
    const { id } = await createReservationRequest(request({ firstName: "Sonia", email: "sonia@example.com" }), null);
    await changeReservationStatus({ actorId: adminId, reservationId: id, to: "confirmed" });

    expect((await listReservations({ q: "karim" })).total).toBe(1);
    expect((await listReservations({ q: "Sonia Ben" })).total).toBe(1);
    expect((await listReservations({ q: "100%_" })).total).toBe(0);
    expect((await listReservations({ status: "confirmed" })).rows[0].firstName).toBe("Sonia");
    expect((await listReservations({ from: D(60) })).total).toBe(1);
    const paged = await listReservations({ pageSize: 5, page: 1 });
    expect(paged).toMatchObject({ total: 2, pages: 1 });
  });

  it("computes dashboard statistics", async () => {
    await createReservationRequest(request(), null);
    const { id } = await createReservationRequest(request({ email: "b@example.com", preferredCategory: "nour" }), null);
    await changeReservationStatus({ actorId: adminId, reservationId: id, to: "declined" });
    const s = await reservationStats();
    expect(s.total).toBe(2);
    expect(s.counts).toMatchObject({ pending: 1, declined: 1, confirmed: 0 });
    expect(s.trend).toHaveLength(30);
    expect(s.trend.at(-1)?.n).toBe(2);
    expect(s.byCategory.map((c) => c.category).sort()).toEqual(["legend", "nour"]);
  });
});
