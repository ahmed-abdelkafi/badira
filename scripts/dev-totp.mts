/**
 * DEV ONLY — prints the current TOTP code of a LOCAL admin account (acts as an
 * authenticator app during local testing). Refuses --remote.
 *   npm run dev:totp -- owner@labadira.test
 */
import { generate } from "otplib";
import { d1Query, lit } from "./lib";
import { decrypt } from "../src/server/auth/crypto";

if (process.argv.includes("--remote")) throw new Error("dev:totp only works against the local database");
const email = process.argv.slice(2).find((a) => a.includes("@"))?.toLowerCase();
if (!email) throw new Error("usage: npm run dev:totp -- <email>");
const rows = d1Query<{ secret_enc: string | null; pending_secret_enc: string | null }>(
  `SELECT t.secret_enc, t.pending_secret_enc FROM two_factor_auth t JOIN admin_users u ON u.id = t.user_id WHERE lower(u.email) = ${lit(email)}`,
);
const enc = rows[0]?.secret_enc ?? rows[0]?.pending_secret_enc;
if (!enc) throw new Error("No TOTP secret for this user (open the 2FA setup page first).");
console.log(await generate({ secret: decrypt(enc) }));
