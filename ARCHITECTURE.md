# La Badira — Architecture

## 1. Stack (Cloudflare)

| Layer | Choice | Why |
|---|---|---|
| Runtime / hosting | **Cloudflare Workers** via `@opennextjs/cloudflare` (OpenNext) | Owner's choice: everything on Cloudflare, global edge, one deployable |
| Framework | **Next.js 16** App Router, React 19, TypeScript (strict) | SSR for SEO, server actions, route handlers |
| Rendering | Per-request rendering from D1 (`dynamic = "force-dynamic"`); **Cache Components disabled** | OpenNext does not fully support Cache Components yet (PR #1318). Edits are live immediately; static assets & images cached at the edge |
| Database | **Cloudflare D1** (SQLite) + **Drizzle ORM** (`drizzle-orm/d1`), migrations in `drizzle/` applied with `wrangler d1 migrations apply` | Native binding, no connection management |
| Atomicity | D1 `batch()` (atomic) + optimistic `UPDATE … WHERE status = <current>` | D1 has no interactive transactions / row locks |
| Photos | **R2** bucket (binding `MEDIA`); `/media/<key>` route streams originals | Durable, cheap, no egress fees |
| Image optimisation | **Cloudflare Images binding**: uploads re-encoded (≤3200 px JPEG + blur placeholder); `/media/<key>?w=&q=` returns AVIF/WebP from a whitelist of sizes, cached with the Cache API; custom `next/image` loader | OpenNext's built-in optimiser can't read R2-served routes |
| Styling / motion | Tailwind 4 tokens; GSAP + ScrollTrigger, Lenis, Motion; CSS scroll-driven reveals | Unchanged |
| Auth | **Browser-side PBKDF2-SHA256 proof (600k iterations, salt = email) + server HMAC-SHA256 with a secret pepper**; DB sessions (SHA-256 of token), httpOnly/SameSite cookies | Fits the **Workers Free** 10 ms CPU limit; the password never leaves the browser; offline cracking cost equals server-side PBKDF2 and also needs the pepper |
| 2FA | TOTP (`otplib`), AES-256-GCM secrets, replay protection, recovery codes stored as **HMAC-SHA256** (keyed, indexed) | HMAC is safe for ~50-bit random codes and avoids 10 scrypt runs per attempt |
| Live updates | Dashboard **polls** `/api/admin/events?after=<id>` every 5 s while visible | Short requests suit Workers/D1 better than long SSE connections |
| Push | Web Push with **`@block65/webcrypto-web-push`** (RFC 8291 aes128gcm + VAPID, Web Crypto) + `fetch` | `web-push` needs Node APIs unavailable on Workers |
| Email | **None** (owner decision) | Guests are answered on WhatsApp; staff alerts via Web Push + live dashboard; password resets via owner-generated one-time links |
| WhatsApp | Click-to-chat `wa.me` + FR/EN/AR templates; Cloud API path documented | Never claims delivery |
| Tests | Vitest + **libSQL in-memory** (same SQLite dialect & migrations as D1) | Fast, no Cloudflare needed |

## 2. Directory layout

```
picture/                 original photography (seed source)
scripts/                 seed (builds SQL + photos → wrangler d1/r2), create-admin, vapid, dev-totp
drizzle/                 D1 migrations (SQLite)
wrangler.jsonc           Worker + D1 + R2 + Images bindings, vars
open-next.config.ts      OpenNext config (no incremental cache needed)
public/admin-sw.js       Service worker for admin Web Push
src/app/(site)/[lang]/   public pages
src/app/(admin)/admin/   admin
src/app/api/             health, admin event feed
src/app/media/[...key]/  R2 media + resizing
src/middleware.ts        locale negotiation + optimistic admin gate (edge runtime)
src/server/              db (D1 per request), auth, services, notifications, media
tests/                   Vitest suites
```

## 3. Public vs admin separation

- Two **separate root layouts** (`(site)/[lang]/layout.tsx`, `(admin)/admin/layout.tsx`): no shared client bundle, admin carries `noindex` and is excluded in `robots.txt`.
- Every admin page and **every server action** calls `requireAdmin(permission)` from the data access layer (`src/server/auth`). `middleware.ts` only does an optimistic cookie-presence redirect; it is never the security boundary.
- Server-only modules import `server-only`; secrets are read only in `src/server/env.ts`. Nothing secret is prefixed `NEXT_PUBLIC_` (only the VAPID *public* key is exposed).

## 4. Internationalization

- Locales: `fr` (default), `en`, `ar` (RTL). URL prefix strategy: `/fr/...`, `/en/...`, `/ar/...`. `middleware.ts` redirects locale-less paths using `Accept-Language`.
- `<html lang dir>` is set per locale; layout uses logical CSS properties (`ms-`, `pe-`, `start-`) so RTL mirrors correctly.
- **UI strings**: TypeScript dictionaries (`src/i18n/dictionaries/*`), overridable from Admin → Translations (DB `translations` table merged on top).
- **Content** (suites, restaurants, …): localized JSON columns `{ fr, en, ar }` with fallback `ar → fr → en`.
- Proper names (La Badira, suite names, Spa by Clarins, restaurant names) are never translated.
- `hreflang` alternates + `x-default` on every page.

## 5. Reservation workflow

```
Guest form ──► server action (Zod validation, honeypot, IP rate-limit)
           ──► D1 batch (atomic): insert reservation (status=pending, ref LB-YYMM-XXXXXX)
                            insert reservation_history(created)
                            insert notification_event(reservation.created)
           ──► after(): Web Push fan-out to staff (no email — replies go out on WhatsApp)
Dashboard ◄── polls /api/admin/events?after=<id> every 5 s (visible tabs only)
```

Status machine (enforced in `src/lib/reservation-status.ts`):

```
pending ──► confirmed ──► completed
   │            │
   ├──► declined└──► cancelled
   └──► cancelled
```

A request is **never** shown as a booking until an admin with `reservations.manage` moves it to `confirmed`. Every transition requires an explicit confirmation dialog and writes `reservation_history` (actor, from, to, message, timestamp) + `audit_logs`.

Reference format: `LB-` + `YYMM` + 6 chars from an unambiguous alphabet (no 0/O/1/I), generated with `crypto.randomInt`, unique-constrained in the DB with retry.

## 6. Security

- Passwords: PBKDF2-SHA256 proof computed in the browser (600 000 iterations, salt bound to the email), stored as HMAC-SHA256(pepper, proof), constant-time compare; policy (≥12 chars, 3 classes) enforced in the browser. Forms are POST-only and disabled until hydrated so a password can never end up in a URL.
- Sessions: 32-byte random token in cookie; only its SHA-256 is stored. 12 h absolute / 2 h idle; rotated on login and on 2FA completion. A session is `pending_2fa` until the TOTP step passes.
- Login rate limiting: `login_attempts` table, max 5 failures / 15 min per email and 20 per IP; same generic error for unknown user and wrong password.
- Password reset: an Owner generates a one-time link (random token, hash stored, 30-minute expiry, single use) and shares it personally; all sessions are revoked after reset. No email.
- TOTP secret: AES-256-GCM encrypted at rest; recovery codes: 10 × HMAC-SHA256 (keyed), consumed with a single conditional UPDATE. Secrets and codes are never logged.
- Admin 2FA reset: only `users.manage` (Owner) can reset another user's 2FA; audited.
- Server actions: Next.js built-in Origin check + SameSite cookies → CSRF protection. Route handlers that mutate check `Origin` explicitly.
- Uploads: format and dimensions read from the bytes (`image-size`), re-encoded by Cloudflare Images, 15 MB limit, random R2 keys, no user-controlled paths.
- Security headers: CSP, HSTS, X-Frame-Options DENY on admin, Referrer-Policy, Permissions-Policy.

## 7. Roles

| Role | Permissions |
|---|---|
| `owner` | everything incl. users, roles, 2FA reset, settings |
| `manager` | reservations.manage, content.manage, media.manage, reports |
| `reservations` | reservations.view, reservations.manage |
| `editor` | content.manage, media.manage |

## 8. Key decisions log

| Date | Decision | Reason |
|---|---|---|
| 2026-11-23 | Next.js 16 with Cache Components kept on | Default for new apps; ideal for a CMS-driven site (static shell + tag invalidation) |
| 2026-11-23 | Real PostgreSQL in dev via `embedded-postgres` instead of PGlite | Next build prerenders in multiple workers; an in-process DB can't be shared safely across them |
| 2026-11-23 | SSE over WebSockets | One-way server→admin stream is all that's needed; works behind any proxy; no extra service |
| 2026-11-23 | AI-generated collage excluded | Contains an invented logo and fictional rooms |
| 2026-11-23 | Reservation *request* system, no availability/prices | No booking engine or inventory integration exists |
| 2026-11-23 | Testimonials hidden until real ones are entered | No verified reviews were found on the official site |
| 2026-11-23 | Scroll reveals via CSS `animation-timeline: view()` instead of JS observers | Streamed (PPR) content hydrates after the layout; mutating classes from JS raced hydration. CSS is zero-JS and off the main thread; unsupported browsers show content statically |
| 2026-11-23 | `overflow: clip` instead of `overflow: hidden` on public pages | `hidden` creates a scroll container, which captures `view()` timelines |
| 2026-11-23 | 2FA mandatory for every admin | Guest personal data (names, phones, emails) is accessible from the dashboard |
| 2026-11-23 | Enrolment marks the session verified in DB, rotates the cookie on "continue" | Setting a cookie in the confirming action re-rendered the page and hid the one-time recovery codes |
| 2026-11-23 | Instant-navigation validation opt-in (`manual-warning`), public layout `instant = true`, admin `instant = false` | Public pages must be instant; admin pages intentionally block on the session |
| 2026-11-23 | Admin UI in French | Hotel staff language; public site trilingual |
| 2026-11-23 | **Migration to Cloudflare** (Workers + D1 + R2 + Images) at the owner's request | One platform, global edge, low cost |
| 2026-11-23 | Cache Components disabled; per-request rendering | Not fully supported by OpenNext yet |
| 2026-11-23 | `middleware.ts` (edge) instead of `proxy.ts` (node) | Node middleware is experimental on OpenNext; its bundle crashed on any request carrying cookies (`cookie` default-import interop) |
| 2026-11-23 | Own `/media` resizing route + custom `next/image` loader | OpenNext's optimiser fetches local images from static assets, not from R2-backed routes |
| 2026-11-23 | SSE replaced by short polling | Long-lived Worker connections + D1 polling per connection is costlier than a 5-s poll |
| 2026-11-23 | Brand identity designed: full moon inside a Tunisian horseshoe arch above the sea line | No official logo supplied; owner asked for one |
| 2026-11-23 | **Everything on free plans; email removed** (owner decision) | Password hashing moved to the browser (PBKDF2 proof + server HMAC) to fit Workers Free CPU; guest replies via WhatsApp only |
