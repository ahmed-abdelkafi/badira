import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db, schema } from "@/server/db";
import { makeAdmin } from "../helpers/users";
import { emitEvent, fanOutPush, listSubscriptions, removeSubscription, saveSubscription } from "@/server/notifications/push";
import { resetDb } from "../helpers/db";

const b64url = (buf: ArrayBuffer | Uint8Array) => Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString("base64url");

/** Real P-256 keys so the Web Crypto encryption (RFC 8291) and VAPID signing actually run. */
async function makeSubscriptionKeys() {
  const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  return { p256dh: b64url(await crypto.subtle.exportKey("raw", kp.publicKey)), auth: b64url(crypto.getRandomValues(new Uint8Array(16))) };
}

const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();
const realFetch = globalThis.fetch;
let keys: { p256dh: string; auth: string };

beforeAll(async () => {
  const vapid = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  process.env.VAPID_PUBLIC_KEY = b64url(await crypto.subtle.exportKey("raw", vapid.publicKey));
  process.env.VAPID_PRIVATE_KEY = (await crypto.subtle.exportKey("jwk", vapid.privateKey)).d!;
  process.env.VAPID_SUBJECT = "mailto:test@example.com";
  keys = await makeSubscriptionKeys();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = realFetch;
});

const payload = { title: "Nouvelle demande · LB-2611-ABCDEF", body: "Amira — 10 → 14 juin", url: "/admin/reservations/x", tag: "reservation-LB-2611-ABCDEF" };
const sub = (n: number) => ({ endpoint: `https://push.example.com/${n}`, keys });

let owner: string;
let editor: string;
beforeEach(async () => {
  await resetDb();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
  owner = (await makeAdmin("o@test.local", "owner")).id;
  editor = (await makeAdmin("e@test.local", "editor")).id;
});

describe("push subscriptions", () => {
  it("saves, upserts by endpoint and removes subscriptions (owner only)", async () => {
    await saveSubscription(owner, sub(1), "UA");
    await saveSubscription(owner, sub(1), "UA2");
    expect(await listSubscriptions(owner)).toHaveLength(1);
    await removeSubscription(editor, sub(1).endpoint);
    expect(await listSubscriptions(owner)).toHaveLength(1);
    await removeSubscription(owner, sub(1).endpoint);
    expect(await listSubscriptions(owner)).toHaveLength(0);
  });
});

describe("push fan-out (Web Crypto, RFC 8291 + VAPID)", () => {
  it("sends an encrypted, VAPID-signed request only to users allowed to see reservations", async () => {
    await saveSubscription(owner, sub(1), null);
    await saveSubscription(editor, sub(2), null);
    const res = await fanOutPush(await emitEvent("reservation.created", {}), payload, { permission: "reservations.view" });
    expect(res).toMatchObject({ sent: 1, failed: 0, skipped: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(sub(1).endpoint);
    const headers = init.headers as Record<string, string>;
    expect(headers["content-encoding"]).toBe("aes128gcm");
    expect(headers.authorization).toMatch(/^vapid t=.+, k=.+/);
    expect(headers.urgency).toBe("high");
    // Ciphertext, not the plaintext JSON.
    expect(Buffer.from(init.body as Uint8Array).toString("utf8")).not.toContain("LB-2611-ABCDEF");
  });

  it("never sends the same event twice to a subscription", async () => {
    await saveSubscription(owner, sub(1), null);
    const eventId = await emitEvent("reservation.created", {});
    await Promise.all([fanOutPush(eventId, payload), fanOutPush(eventId, payload)]);
    await fanOutPush(eventId, payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deletes expired subscriptions (404/410) and counts other failures", async () => {
    await saveSubscription(owner, sub(1), null);
    await saveSubscription(owner, sub(2), null);
    fetchMock.mockImplementation(async (url) => new Response(null, { status: String(url).endsWith("1") ? 410 : 500 }));
    const res = await fanOutPush(await emitEvent("reservation.created", {}), payload);
    expect(res).toMatchObject({ expired: 1, failed: 1 });
    const left = await db().select().from(schema.pushSubscriptions);
    expect(left.map((s) => s.endpoint)).toEqual([sub(2).endpoint]);
    expect(left[0].failureCount).toBe(1);
  });

  it("can target a single user (test notification)", async () => {
    await saveSubscription(owner, sub(1), null);
    await saveSubscription(editor, sub(2), null);
    await fanOutPush(await emitEvent("push.test", {}), payload, { onlyUserId: editor });
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([sub(2).endpoint]);
  });

  it("is skipped (not faked) when VAPID keys are missing", async () => {
    const saved = process.env.VAPID_PRIVATE_KEY;
    process.env.VAPID_PRIVATE_KEY = "";
    await saveSubscription(owner, sub(1), null);
    expect(await fanOutPush(await emitEvent("reservation.created", {}), payload)).toMatchObject({ skipped: true, sent: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
    process.env.VAPID_PRIVATE_KEY = saved;
  });
});
