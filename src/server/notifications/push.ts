import "server-only";
import { buildPushPayload } from "@block65/webcrypto-web-push";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { env, pushConfigured } from "@/server/env";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  /** Same tag = the browser replaces instead of stacking a duplicate. */
  tag: string;
};

export async function emitEvent(type: string, payload: Record<string, unknown>): Promise<number> {
  const [row] = await db()
    .insert(schema.notificationEvents)
    .values({ type, payload })
    .returning({ id: schema.notificationEvents.id });
  return row.id;
}

/** Thrown-like result for push services: 404/410 mean the subscription is gone. */
export class PushHttpError extends Error {
  constructor(public statusCode: number) {
    super(`push service responded ${statusCode}`);
  }
}

/** Encrypts (RFC 8291) and signs (VAPID, RFC 8292) with Web Crypto, then POSTs. Works on Workers and Node. */
export async function sendWebPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: PushPayload): Promise<void> {
  const e = env();
  const message = {
    data: JSON.stringify(payload),
    options: { ttl: 60 * 60 * 24, urgency: "high" as const, topic: payload.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) },
  };
  const req = await buildPushPayload(
    message,
    { endpoint: sub.endpoint, expirationTime: null, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    { subject: e.VAPID_SUBJECT!, publicKey: e.VAPID_PUBLIC_KEY!, privateKey: e.VAPID_PRIVATE_KEY! },
  );
  const res = await fetch(sub.endpoint, req);
  if (!res.ok) throw new PushHttpError(res.status);
}

/**
 * Sends one push per subscription for the event. A (event, subscription) row
 * is claimed first, so retries or concurrent workers never send duplicates.
 * Expired subscriptions (404/410) are deleted.
 */
export async function fanOutPush(
  eventId: number,
  payload: PushPayload,
  opts: { permission?: string; onlyUserId?: string } = {},
): Promise<{ sent: number; failed: number; expired: number; skipped: boolean }> {
  if (!pushConfigured()) return { sent: 0, failed: 0, expired: 0, skipped: true };

  const subs = await db()
    .select({
      id: schema.pushSubscriptions.id,
      userId: schema.pushSubscriptions.userId,
      endpoint: schema.pushSubscriptions.endpoint,
      p256dh: schema.pushSubscriptions.p256dh,
      auth: schema.pushSubscriptions.auth,
      permissions: schema.roles.permissions,
    })
    .from(schema.pushSubscriptions)
    .innerJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.pushSubscriptions.userId))
    .innerJoin(schema.roles, eq(schema.roles.key, schema.adminUsers.roleKey))
    .where(eq(schema.adminUsers.isActive, true));

  const eligible = subs.filter(
    (s) => (!opts.permission || s.permissions.includes(opts.permission)) && (!opts.onlyUserId || s.userId === opts.onlyUserId),
  );
  let sent = 0;
  let failed = 0;
  let expired = 0;

  await Promise.all(
    eligible.map(async (s) => {
      const claimed = await db()
        .insert(schema.pushDeliveries)
        .values({ eventId, subscriptionId: s.id, status: "pending" })
        .onConflictDoNothing()
        .returning({ eventId: schema.pushDeliveries.eventId });
      if (!claimed.length) return; // already delivered by another worker
      try {
        await sendWebPush(s, payload);
        sent++;
        await db()
          .update(schema.pushSubscriptions)
          .set({ lastSuccessAt: new Date(), failureCount: 0 })
          .where(eq(schema.pushSubscriptions.id, s.id));
        await markDelivery(eventId, s.id, "sent");
      } catch (err) {
        const status = err instanceof PushHttpError ? err.statusCode : 0;
        if (status === 404 || status === 410) {
          expired++;
          await db().delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, s.id));
        } else {
          failed++;
          await db()
            .update(schema.pushSubscriptions)
            .set({ failureCount: sql`${schema.pushSubscriptions.failureCount} + 1` })
            .where(eq(schema.pushSubscriptions.id, s.id));
          await markDelivery(eventId, s.id, "failed");
          console.error(`[push] delivery failed (status ${status || "n/a"})`);
        }
      }
    }),
  );
  // Subscriptions failing repeatedly are considered dead.
  await db().delete(schema.pushSubscriptions).where(sql`${schema.pushSubscriptions.failureCount} >= 10`);
  return { sent, failed, expired, skipped: false };
}

async function markDelivery(eventId: number, subscriptionId: string, status: string) {
  await db()
    .update(schema.pushDeliveries)
    .set({ status })
    .where(and(eq(schema.pushDeliveries.eventId, eventId), eq(schema.pushDeliveries.subscriptionId, subscriptionId)));
}

export async function saveSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent: string | null,
) {
  await db()
    .insert(schema.pushSubscriptions)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent?.slice(0, 300) })
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, failureCount: 0 },
    });
}

export async function removeSubscription(userId: string, endpoint: string) {
  await db()
    .delete(schema.pushSubscriptions)
    .where(and(eq(schema.pushSubscriptions.userId, userId), eq(schema.pushSubscriptions.endpoint, endpoint)));
}

export async function listSubscriptions(userId: string) {
  return db()
    .select({
      id: schema.pushSubscriptions.id,
      endpoint: schema.pushSubscriptions.endpoint,
      userAgent: schema.pushSubscriptions.userAgent,
      createdAt: schema.pushSubscriptions.createdAt,
      lastSuccessAt: schema.pushSubscriptions.lastSuccessAt,
    })
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.userId, userId));
}

export async function deleteSubscriptionsById(userId: string, ids: string[]) {
  if (!ids.length) return;
  await db()
    .delete(schema.pushSubscriptions)
    .where(and(eq(schema.pushSubscriptions.userId, userId), inArray(schema.pushSubscriptions.id, ids)));
}
