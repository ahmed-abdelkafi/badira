import "server-only";
import { and, asc, desc, eq, gte, lte, or, sql, type SQL, type AnyColumn } from "drizzle-orm";
import { batch, db, isUniqueViolation, schema } from "@/server/db";
import { auditInsert } from "@/server/audit";
import { rateLimit } from "@/server/rate-limit";
import { generateReservationReference } from "@/lib/reference";
import { canTransition, type ReservationStatus } from "@/lib/reservation-status";
import type { ReservationRequest } from "@/lib/validation/reservation";
import { categoryLabel } from "@/lib/categories";
import { addDaysIso, formatDate, todayIso } from "@/lib/dates";
import type { Locale } from "@/i18n/config";
import { fanOutPush } from "@/server/notifications/push";

export class ReservationError extends Error {
  constructor(
    public code: "rate_limited" | "invalid_suite" | "not_found" | "invalid_transition" | "conflict",
    message?: string,
  ) {
    super(message ?? code);
  }
}

/* ------------------------------------------------------------------ */
/* Public submission                                                   */
/* ------------------------------------------------------------------ */

export async function createReservationRequest(input: ReservationRequest, ip: string | null) {
  // Abuse protection: per IP and per email.
  if (ip && !(await rateLimit(`reservation:ip:${ip}`, 5, 3600_000))) throw new ReservationError("rate_limited");
  const contactKey = input.email || input.phoneE164;
  if (!(await rateLimit(`reservation:contact:${contactKey}`, 5, 24 * 3600_000))) throw new ReservationError("rate_limited");

  let preferredSuiteId: string | null = null;
  if (input.preferredCategory.startsWith("suite:")) {
    const [suite] = await db()
      .select({ id: schema.suites.id })
      .from(schema.suites)
      .where(and(eq(schema.suites.slug, input.preferredCategory.slice(6)), eq(schema.suites.status, "active")));
    if (!suite) throw new ReservationError("invalid_suite");
    preferredSuiteId = suite.id;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = generateReservationReference();
    const id = crypto.randomUUID();
    try {
      // One atomic D1 batch: reservation + history + notification event.
      const [[row], , [event]] = await batch([
        db()
          .insert(schema.reservations)
          .values({
            id,
            reference,
            status: "pending",
            checkIn: input.checkIn,
            checkOut: input.checkOut,
            guests: input.guests,
            rooms: input.rooms,
            preferredCategory: input.preferredCategory,
            preferredSuiteId,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phoneE164,
            locale: input.locale,
            specialRequests: input.specialRequests ?? null,
            consentAt: new Date(),
          })
          .returning(),
        db().insert(schema.reservationHistory).values({ reservationId: id, action: "created", toStatus: "pending", meta: { source: "website" } }),
        db()
          .insert(schema.notificationEvents)
          .values({
            type: "reservation.created",
            payload: { reservationId: id, reference, name: `${input.firstName} ${input.lastName}`, checkIn: input.checkIn, checkOut: input.checkOut },
          })
          .returning({ id: schema.notificationEvents.id }),
      ]);
      return { id, reference, eventId: event.id as number, row: row as typeof schema.reservations.$inferSelect };
    } catch (err) {
      if (isUniqueViolation(err)) continue; // reference collision -> retry
      throw err;
    }
  }
  throw new ReservationError("conflict", "Could not allocate a unique reference");
}

/** Runs after the response is sent (via `after()`): Web Push to staff. No email by design (WhatsApp only). */
export async function notifyNewReservation(created: Awaited<ReturnType<typeof createReservationRequest>>) {
  const r = created.row;
  await fanOutPush(
    created.eventId,
    {
      title: `Nouvelle demande · ${r.reference}`,
      body: `${r.firstName} ${r.lastName} — ${formatDate(r.checkIn, "fr", "medium")} → ${formatDate(r.checkOut, "fr", "medium")}`,
      url: `/admin/reservations/${r.id}`,
      tag: `reservation-${r.reference}`,
    },
    { permission: "reservations.view" },
  );
}

/* ------------------------------------------------------------------ */
/* Admin queries                                                       */
/* ------------------------------------------------------------------ */

export type ReservationFilters = {
  q?: string;
  status?: ReservationStatus | "all";
  from?: string; // check-in from (YYYY-MM-DD)
  to?: string; // check-in to
  sort?: "created_desc" | "created_asc" | "checkin_asc" | "checkin_desc";
  page?: number;
  pageSize?: number;
};

export async function listReservations(f: ReservationFilters) {
  const where: SQL[] = [];
  if (f.status && f.status !== "all") where.push(eq(schema.reservations.status, f.status));
  if (f.from) where.push(gte(schema.reservations.checkIn, f.from));
  if (f.to) where.push(lte(schema.reservations.checkIn, f.to));
  if (f.q?.trim()) {
    // "!" is the LIKE escape character, so user-typed % and _ match literally.
    const q = `%${f.q.trim().toLowerCase().replace(/[%_!]/g, (m) => `!${m}`)}%`;
    const like = (col: AnyColumn | SQL) => sql`lower(${col}) LIKE ${q} ESCAPE '!'`;
    where.push(
      or(
        like(schema.reservations.reference),
        like(schema.reservations.firstName),
        like(schema.reservations.lastName),
        like(schema.reservations.email),
        like(schema.reservations.phone),
        like(sql`${schema.reservations.firstName} || ' ' || ${schema.reservations.lastName}`),
      )!,
    );
  }
  const order = {
    created_desc: desc(schema.reservations.createdAt),
    created_asc: asc(schema.reservations.createdAt),
    checkin_asc: asc(schema.reservations.checkIn),
    checkin_desc: desc(schema.reservations.checkIn),
  }[f.sort ?? "created_desc"];
  const pageSize = Math.min(Math.max(f.pageSize ?? 25, 5), 100);
  const page = Math.max(f.page ?? 1, 1);
  const cond = where.length ? and(...where) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db()
      .select()
      .from(schema.reservations)
      .where(cond)
      .orderBy(order, desc(schema.reservations.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db().select({ total: sql<number>`count(*)` }).from(schema.reservations).where(cond),
  ]);
  return { rows, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getReservation(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db()
    .select({ r: schema.reservations, suiteName: schema.suites.name, decidedByName: schema.adminUsers.name })
    .from(schema.reservations)
    .leftJoin(schema.suites, eq(schema.suites.id, schema.reservations.preferredSuiteId))
    .leftJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.reservations.decidedBy))
    .where(eq(schema.reservations.id, id));
  if (!row) return null;
  const [history, notes] = await Promise.all([
    db()
      .select({ h: schema.reservationHistory, actorName: schema.adminUsers.name })
      .from(schema.reservationHistory)
      .leftJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.reservationHistory.actorId))
      .where(eq(schema.reservationHistory.reservationId, id))
      .orderBy(desc(schema.reservationHistory.createdAt), desc(schema.reservationHistory.id)),
    db()
      .select({ n: schema.reservationNotes, authorName: schema.adminUsers.name })
      .from(schema.reservationNotes)
      .leftJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.reservationNotes.authorId))
      .where(eq(schema.reservationNotes.reservationId, id))
      .orderBy(desc(schema.reservationNotes.createdAt)),
  ]);
  return { ...row.r, suiteName: row.suiteName, decidedByName: row.decidedByName, history, notes };
}

/* ------------------------------------------------------------------ */
/* Admin mutations                                                     */
/* ------------------------------------------------------------------ */

export async function changeReservationStatus(input: {
  actorId: string;
  reservationId: string;
  to: ReservationStatus;
  message?: string;
  ip?: string | null;
}) {
  const [current] = await db().select().from(schema.reservations).where(eq(schema.reservations.id, input.reservationId));
  if (!current) throw new ReservationError("not_found");
  if (!canTransition(current.status, input.to)) throw new ReservationError("invalid_transition");
  const decided = input.to === "confirmed" || input.to === "declined";
  // Optimistic concurrency: only succeeds if nobody changed the status meanwhile.
  const [result] = await db()
    .update(schema.reservations)
    .set({ status: input.to, ...(decided ? { decidedAt: new Date(), decidedBy: input.actorId } : {}) })
    .where(and(eq(schema.reservations.id, current.id), eq(schema.reservations.status, current.status)))
    .returning();
  if (!result) throw new ReservationError("invalid_transition");
  await batch([
    db().insert(schema.reservationHistory).values({
      reservationId: current.id,
      actorId: input.actorId,
      action: "status_changed",
      fromStatus: current.status,
      toStatus: input.to,
      message: input.message?.trim() || null,
    }),
    auditInsert({
      actorId: input.actorId,
      action: `reservation.${input.to}`,
      entityType: "reservation",
      entityId: current.id,
      meta: { reference: current.reference, from: current.status, to: input.to },
      ip: input.ip,
    }),
    db().insert(schema.notificationEvents).values({ type: "reservation.updated", payload: { reservationId: current.id, reference: current.reference, status: input.to } }),
  ]);

  return { reservation: result };
}

export async function addReservationNote(actorId: string, reservationId: string, body: string) {
  const text = body.trim().slice(0, 4000);
  if (!text) return;
  await batch([
    db().insert(schema.reservationNotes).values({ reservationId, authorId: actorId, body: text }),
    db().insert(schema.reservationHistory).values({ reservationId, actorId, action: "note_added" }),
  ]);
}

/** Records that staff OPENED a WhatsApp conversation — not that a message was delivered. */
export async function logWhatsAppOpened(actorId: string, reservationId: string, template: string, locale: string) {
  await db().insert(schema.reservationHistory).values({
    reservationId,
    actorId,
    action: "whatsapp_opened",
    message: `WhatsApp conversation opened (template: ${template}, ${locale}). Delivery is not tracked for click-to-chat.`,
    meta: { template, locale, channel: "click_to_chat" },
  });
}

/* ------------------------------------------------------------------ */
/* Dashboard statistics                                                */
/* ------------------------------------------------------------------ */

export async function reservationStats() {
  const since = new Date(Date.now() - 31 * 86_400_000);
  const [byStatus, recentRows, byCategory, recent] = await Promise.all([
    db().select({ status: schema.reservations.status, n: sql<number>`count(*)` }).from(schema.reservations).groupBy(schema.reservations.status),
    db().select({ createdAt: schema.reservations.createdAt }).from(schema.reservations).where(gte(schema.reservations.createdAt, since)),
    db()
      .select({ category: schema.reservations.preferredCategory, n: sql<number>`count(*)` })
      .from(schema.reservations)
      .groupBy(schema.reservations.preferredCategory)
      .orderBy(desc(sql`count(*)`)),
    db().select().from(schema.reservations).orderBy(desc(schema.reservations.createdAt)).limit(8),
  ]);
  const counts: Record<ReservationStatus, number> = { pending: 0, confirmed: 0, declined: 0, cancelled: 0, completed: 0 };
  for (const s of byStatus) counts[s.status] = s.n;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  // Daily counts for the last 30 days, in the hotel's time zone.
  const today = todayIso();
  const perDay = new Map<string, number>();
  for (const r of recentRows) {
    const day = todayIso(r.createdAt);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  const trend = Array.from({ length: 30 }, (_, i) => {
    const day = addDaysIso(today, i - 29);
    return { day, n: perDay.get(day) ?? 0 };
  });
  return { counts, total, trend, byCategory, recent };
}

export async function recentActivity(limit = 12) {
  return db()
    .select({ a: schema.auditLogs, actorName: schema.adminUsers.name })
    .from(schema.auditLogs)
    .leftJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.auditLogs.actorId))
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(limit);
}

export function preferredCategoryLabel(value: string, locale: Locale, suiteName?: string | null) {
  return value.startsWith("suite:") && suiteName ? suiteName : categoryLabel(value, locale);
}
