/**
 * Create an administrator, or reset an existing one's password and role.
 *   npm run admin:create -- --email you@labadira.com --name "Your Name" --role owner [--remote]
 * The password is read from ADMIN_PASSWORD or prompted (never passed as an argument).
 * With --remote, the production TOTP_ENCRYPTION_KEY is read from .prod.vars (gitignored).
 * Two-factor enrolment is required at first login.
 */
import { createInterface } from "node:readline/promises";
import { DB_NAME, lit, target, wrangler } from "./lib";
import { passwordVerifier } from "../src/server/auth/crypto";
import { derivePasswordProof, passwordPolicyError } from "../src/lib/password";
import { defaultRoles } from "../src/server/auth/permissions";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const email = arg("email")?.trim().toLowerCase();
const name = arg("name") ?? "Administrator";
const role = arg("role") ?? "owner";
if (!email) throw new Error("--email is required");
if (!defaultRoles.some((r) => r.key === role)) throw new Error(`Unknown role ${role}`);

let password = process.env.ADMIN_PASSWORD;
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question("Password (min 12 chars, 3 character classes): ");
  rl.close();
}
const policy = passwordPolicyError(password);
if (policy) throw new Error(policy);

// Same scheme as the browser: PBKDF2 proof, then keyed HMAC with the server secret.
const hash = passwordVerifier(await derivePasswordProof(email, password));
const now = Date.now();
const statements = [
  ...defaultRoles.map(
    (r) => `INSERT OR IGNORE INTO roles (key, name, permissions, created_at, updated_at) VALUES (${lit(r.key)}, ${lit(r.name)}, ${lit(JSON.stringify(r.permissions))}, ${now}, ${now});`,
  ),
  `UPDATE admin_users SET password_hash = ${lit(hash)}, role_key = ${lit(role)}, is_active = 1, password_changed_at = ${now}, updated_at = ${now} WHERE lower(email) = ${lit(email)};`,
  `DELETE FROM sessions WHERE user_id IN (SELECT id FROM admin_users WHERE lower(email) = ${lit(email)});`,
  `INSERT INTO admin_users (id, email, name, password_hash, role_key, is_active, password_changed_at, created_at, updated_at)
     SELECT ${lit(crypto.randomUUID())}, ${lit(email)}, ${lit(name)}, ${lit(hash)}, ${lit(role)}, 1, ${now}, ${now}, ${now}
     WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE lower(email) = ${lit(email)});`,
];
wrangler(["d1", "execute", DB_NAME, target(), "--command", statements.join("\n")]);
console.log(`[admin] ${email} ready (role: ${role}, ${target()}).`);
