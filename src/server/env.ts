import "server-only";
import { z } from "zod";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const definedOnly = (o: Record<string, string | undefined>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ""));

/**
 * String configuration. On Cloudflare, `vars` and secrets from wrangler are
 * exposed on `process.env` by OpenNext; locally they come from `.dev.vars`.
 * Bindings (D1, R2, Images) are read via getCloudflareContext() instead.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("production"),
  SITE_URL: z.string().url().default("http://localhost:3000"),
  /** 32-byte key, base64 — encrypts TOTP secrets and keys recovery-code hashes. */
  TOTP_ENCRYPTION_KEY: z.string().min(40),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
  WHATSAPP_PROVIDER: z.enum(["click_to_chat", "cloud_api"]).default("click_to_chat"),
  /** Trust CF-Connecting-IP / X-Forwarded-For (true on Cloudflare). */
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
});

export type Env = z.infer<typeof schema>;

/** String vars/secrets from the Cloudflare context (needed in `next dev`, where .dev.vars are not on process.env). */
function cloudflareVars(): Record<string, string> {
  try {
    const cfEnv = getCloudflareContext().env as unknown as Record<string, unknown>;
    return Object.fromEntries(Object.entries(cfEnv).filter((e): e is [string, string] => typeof e[1] === "string"));
  } catch {
    return {}; // outside a Cloudflare request (tests, scripts)
  }
}

export function env(): Env {
  const parsed = schema.safeParse({ ...cloudflareVars(), ...definedOnly(process.env) });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  return parsed.data;
}

export function pushConfigured(): boolean {
  const e = env();
  return !!(e.VAPID_PUBLIC_KEY && e.VAPID_PRIVATE_KEY && e.VAPID_SUBJECT);
}
