import { desc, gt, inArray, and } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { getAdminOrNull } from "@/server/auth/dal";

const STREAMED_TYPES = ["reservation.created", "reservation.updated"];

/**
 * Live-update feed for the admin dashboard, polled every few seconds.
 * (Short polls suit Workers + D1 better than long-lived SSE connections.)
 *   GET /api/admin/events            → { cursor } (latest event id)
 *   GET /api/admin/events?after=123  → { cursor, events: [...] }
 */
export async function GET(req: Request) {
  const admin = await getAdminOrNull("reservations.view");
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const after = new URL(req.url).searchParams.get("after");
  const headers = { "Cache-Control": "no-store" };

  if (!after || !/^\d+$/.test(after)) {
    const [row] = await db().select({ id: schema.notificationEvents.id }).from(schema.notificationEvents).orderBy(desc(schema.notificationEvents.id)).limit(1);
    return Response.json({ cursor: row?.id ?? 0, events: [] }, { headers });
  }
  const rows = await db()
    .select()
    .from(schema.notificationEvents)
    .where(and(gt(schema.notificationEvents.id, Number(after)), inArray(schema.notificationEvents.type, STREAMED_TYPES)))
    .orderBy(schema.notificationEvents.id)
    .limit(50);
  const [latest] = await db().select({ id: schema.notificationEvents.id }).from(schema.notificationEvents).orderBy(desc(schema.notificationEvents.id)).limit(1);
  return Response.json(
    // A full page means more may follow: resume from the last delivered row.
    { cursor: rows.length === 50 ? rows[rows.length - 1].id : Math.max(latest?.id ?? 0, Number(after)), events: rows.map((r) => ({ id: r.id, type: r.type, ...r.payload })) },
    { headers },
  );
}
