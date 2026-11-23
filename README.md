# La Badira — website & reservation management platform

Luxury hotel website for **La Badira, Hammamet (Tunisia)** in **French, English and Arabic (RTL)**, with a secure staff dashboard to manage reservation requests, content and media.

Everything runs on **Cloudflare free plans**: Workers + D1 + R2 + Images. There is **no email** anywhere in the product: guests are answered on **WhatsApp**.

> **Live:** https://la-badira.abdelkafi-ahmed-techsup.workers.dev

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Requirements](#requirements)
4. [Quick start (local)](#quick-start-local)
5. [Environment variables](#environment-variables)
6. [Scripts](#scripts)
7. [Admin dashboard](#admin-dashboard)
8. [Reservation workflow](#reservation-workflow)
9. [Notifications](#notifications)
10. [Security](#security)
11. [Testing & quality](#testing--quality)
12. [Deployment](#deployment)
13. [Project layout](#project-layout)
14. [Content to verify](#content-to-verify)
15. [Git workflow](#git-workflow)
16. [Documentation](#documentation)

---

## Features

### Public website
- **Three languages:** French (default), English and Arabic. Arabic is fully right-to-left. Each language has localized URLs, metadata and `hreflang` alternates.
- **Pages:** home, concept, suites (catalog and detail page per suite), dining, spa, experiences, events, gallery, contact, privacy, and the reservation request page.
- **Suites catalog:**
  - **Standard:** Fell Standard, Fell Sea View, Fell Superior, Yasmine, Nour.
  - **Legend:** Leïla Menchari, Claudia Cardinale, Jean Cocteau, Georges Sebastian, Wallis Simpson, Paul Klee.
- **Cinematic motion:** Lenis smooth scrolling, GSAP, Motion and CSS scroll-driven reveals. All motion respects `prefers-reduced-motion`.
- **Optimized images:** photos are stored in R2 and served through a resize route that outputs AVIF/WebP at whitelisted sizes, with edge caching.
- **SEO:** per-page metadata, Open Graph, sitemap with language alternates, `robots.txt`.

### Staff dashboard (`/admin`)
- **Login:** password plus **mandatory two-factor authentication** with an authenticator app (Google / Microsoft Authenticator), and 10 one-time recovery codes.
- **Roles:** Owner, Manager, Reservations agent, Content editor.
- **Dashboard:** reservation statistics and chart.
- **Reservations:** list with filters, detail page, and confirm / decline / cancel / complete actions.
- **WhatsApp click-to-chat:** prefilled messages in the guest's language. They open WhatsApp; delivery is never claimed.
- **Live updates and browser push notifications** for new requests.
- **CMS:**
  - suites, dining / spa / experiences / events collections, gallery, media library;
  - page settings (hero, SEO), translation overrides, hotel settings;
  - users, audit log.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS 4 |
| Animation | GSAP, Lenis, Motion, CSS scroll-driven animations |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` |
| Database | Cloudflare D1 (SQLite) with Drizzle ORM |
| Media | Cloudflare R2 (storage) + Cloudflare Images (resize / transcode) |
| Auth | Custom: PBKDF2 browser proof + HMAC, DB sessions, TOTP (`otplib`), roles |
| Push | Web Push (VAPID) via `@block65/webcrypto-web-push` |
| Validation | Zod |
| Tests | Vitest with an in-memory libSQL database built from the D1 migrations |

---

## Requirements

- **Node.js ≥ 22** and npm.
- No Cloudflare account is needed for local development. Wrangler/Miniflare emulates D1, R2 and Images, with local state in `.wrangler/`.
- A Cloudflare account is required only to deploy. See [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Quick start (local)

```bash
# 1. Install dependencies
npm install

# 2. Local secrets
cp .dev.vars.example .dev.vars
#    - TOTP_ENCRYPTION_KEY: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
#    - VAPID keys:          npm run vapid
#    Put the VAPID public key in .env as NEXT_PUBLIC_VAPID_PUBLIC_KEY (see .env.example)

# 3. Local database and content
npm run db:migrate        # apply D1 migrations locally
npm run db:seed           # suites, content and photos from picture/ -> local D1 + R2

# 4. First administrator (owner)
ADMIN_PASSWORD='choose-a-strong-password' npm run admin:create -- --email you@example.com --name "Your Name" --role owner

# 5. Run
npm run dev               # http://localhost:3000  (Next dev with local Cloudflare bindings)
npm run preview           # http://localhost:8787  (real Workers runtime, closest to production)
```

Open http://localhost:3000/fr for the site and http://localhost:3000/admin for the dashboard.

On first login, every administrator must enrol an authenticator app by scanning a QR code and save the 10 recovery codes. Locally, `npm run dev:totp -- <email>` prints the current code.

> If you run Wrangler commands (seed, migrate) while `npm run dev` is running, restart the dev server afterwards.

---

## Environment variables

| Variable | Where | Secret | Purpose |
|---|---|---|---|
| `SITE_URL` | `wrangler.jsonc` vars / `.dev.vars` | no | Canonical site URL (links, sitemap, push) |
| `WHATSAPP_PROVIDER` | `wrangler.jsonc` vars | no | `click_to_chat` (opens WhatsApp, never auto-sends) |
| `TRUST_PROXY` | `wrangler.jsonc` vars / `.dev.vars` | no | Trust `CF-Connecting-IP` for rate limiting |
| `VAPID_SUBJECT` | `wrangler.jsonc` vars / `.dev.vars` | no | Contact URI for Web Push |
| `TOTP_ENCRYPTION_KEY` | `.dev.vars` / `wrangler secret` | **yes** | 32-byte key: encrypts 2FA secrets, HMACs passwords and recovery codes |
| `VAPID_PUBLIC_KEY` | `.dev.vars` / `wrangler secret` | no | Web Push public key |
| `VAPID_PRIVATE_KEY` | `.dev.vars` / `wrangler secret` | **yes** | Web Push signing key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `.env` (build time) | no | Public key exposed to the browser |

Bindings are defined in `wrangler.jsonc`: `DB` (D1 `la-badira`), `MEDIA` (R2 `la-badira-media`) and `IMAGES`.

> ⚠️ **Back up `TOTP_ENCRYPTION_KEY`.** If it is lost, every password, 2FA secret and recovery code becomes unusable. Never commit `.env`, `.dev.vars`, `.prod.vars` or `.data/`; they are listed in `.gitignore`.

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js dev server with local D1/R2/Images bindings |
| `npm run build` | Next.js production build |
| `npm run cf:build` | Build the Cloudflare Worker (OpenNext) |
| `npm run preview` | Build for Workers and run it locally in `workerd` |
| `npm run deploy` | Build and deploy to Cloudflare |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:watch` | Vitest (once / watch mode) |
| `npm run check` | Typecheck + lint + tests |
| `npm run db:generate` | Create a migration after editing `src/server/db/schema.ts` |
| `npm run db:migrate` / `db:migrate:remote` | Apply migrations to local / production D1 |
| `npm run db:seed [-- --remote]` | Seed content and photos (skips if already seeded) |
| `npm run admin:create -- --email … --name … --role owner [--remote]` | Create an administrator or reset a password |
| `npm run vapid` | Generate Web Push (VAPID) keys |
| `npm run dev:totp -- <email>` | **Local only:** print the current TOTP code of a local account |
| `npm run cf-typegen` | Regenerate binding types after editing `wrangler.jsonc` |

---

## Admin dashboard

| Section | Path | Permission |
|---|---|---|
| Dashboard | `/admin` | `reservations.view` |
| Reservations | `/admin/reservations` | `reservations.view` / `reservations.manage` |
| Suites | `/admin/suites` | `content.manage` |
| Content (dining, spa, experiences, events) | `/admin/content/[kind]` | `content.manage` |
| Gallery | `/admin/gallery` | `content.manage` |
| Media library | `/admin/media` | `media.manage` |
| Pages (hero, SEO) | `/admin/pages` | `content.manage` |
| Translations | `/admin/translations` | `content.manage` |
| Settings | `/admin/settings` | `settings.manage` |
| Users | `/admin/users` | `users.manage` |
| Audit log | `/admin/audit` | `audit.view` |
| My account | `/admin/account` | any signed-in user |

### Roles

| Role | Permissions |
|---|---|
| **Owner** | Everything |
| **Manager** | Reservations, content, media, audit log |
| **Reservations agent** | View and manage reservations |
| **Content editor** | Content and media |

### Password reset
There is no email. An **owner** generates a **one-time reset link** in *Users* and sends it to the colleague personally, for example on WhatsApp. The link expires after 30 minutes and can be used only once.

---

## Reservation workflow

A guest submits a **request**, never a confirmed booking. The site always presents it as a request awaiting confirmation.

```
pending ──► confirmed ──► completed
   │            │
   ├──► declined └──► cancelled
   └──► cancelled
```

- A new request is stored as **`pending`** with a reference code. Staff are notified by push and in the live dashboard.
- Only an authorised staff member can move it to **`confirmed`** or **`declined`**.
- Status changes use optimistic concurrency (`UPDATE … WHERE status = current`), so two staff members cannot decide the same request twice.
- Staff reply to the guest with **WhatsApp click-to-chat**, using a prefilled message in the guest's language.

---

## Notifications

- **Live dashboard:** the admin polls `/api/admin/events` every 10 seconds while the tab is visible and every 60 seconds when hidden. New requests play a chime and show a counter in the tab title.
- **Browser push:**
  - Each staff member can enable notifications from the bell icon or *My account*.
  - Notifications arrive even when the dashboard is closed, through the service worker `public/admin-sw.js`, and stay on screen until clicked.
  - Push requires HTTPS (or localhost) and the browser's permission.
- **WhatsApp:** links open WhatsApp with a prefilled message to the guest. The platform never sends messages itself and never claims a message was delivered.

---

## Security

- **Passwords:**
  - The browser derives a PBKDF2-SHA256 proof (600,000 iterations), so the plain password never reaches the server.
  - The server stores only an HMAC of that proof.
  - This design fits within the Workers Free CPU limit.
- **2FA:** TOTP is mandatory. Secrets are encrypted with AES-256-GCM, codes cannot be replayed, and recovery codes are stored as HMAC.
- **Sessions:** random tokens in `HttpOnly`, `Secure`, `SameSite` cookies. Only their SHA-256 hash is stored in D1.
- **Rate limiting** on login, 2FA and reservation submission.
- **Role-based access** checked on the server for every page and action. The middleware is only a first, optimistic gate.
- **Audit log** of sensitive actions: logins, status changes, user and content edits.
- **Security headers** (HSTS, `X-Frame-Options: DENY`, referrer policy and others) are set in `next.config.ts`; `public/_headers` sets long-term caching for static assets.
- Login forms use `POST` and stay disabled until the page is ready, so credentials can never end up in a URL.

---

## Testing & quality

```bash
npm run check      # typecheck + lint + 75 tests
npm run build      # production build
```

The 75 Vitest tests run against an in-memory SQLite database built from the same migrations as D1. They cover:
- **Authentication:** browser proof and server HMAC, sessions, rate limiting.
- **TOTP 2FA:** enrolment, replay protection, recovery codes, owner reset.
- **Access:** password reset, roles, middleware route protection.
- **Reservations:** submission, validation, confirm / decline, concurrent decisions.
- **WhatsApp:** URLs and templates in FR/EN/AR.
- **Web Push:** encryption and VAPID signing with real keys (network mocked), de-duplicated delivery.
- **i18n:** dictionary parity across FR/EN/AR.

---

## Deployment

Production runs on Cloudflare Workers. The full procedure is in [DEPLOYMENT.md](DEPLOYMENT.md). In short:

```bash
npx wrangler login
npx wrangler secret bulk .prod.secrets.json     # TOTP_ENCRYPTION_KEY + VAPID keys (file is gitignored)
npm run db:migrate:remote
npm run db:seed -- --remote                    # only seeds an empty database
ADMIN_PASSWORD='…' npm run admin:create -- --email … --name … --role owner --remote
npm run deploy
```

---

## Project layout

```
picture/                      original hotel photography (seed source)
public/
  brand/                      logo mark (SVG)
  admin-sw.js                 service worker for staff push notifications
  admin-manifest.webmanifest  admin app manifest + icons
  _headers                    static asset security headers
scripts/                      seed, create-admin, vapid, dev-totp (+ wrangler helpers)
drizzle/                      D1 migrations
wrangler.jsonc                Worker, D1, R2 and Images bindings
open-next.config.ts           OpenNext adapter configuration
src/
  app/(site)/[lang]/          public pages (fr | en | ar)
  app/(admin)/admin/          admin: login, 2FA, password reset, dashboard, CMS
  app/api/                    health check, admin live events
  app/media/[...key]/         R2 media + resizing route
  components/site/            public UI (header, footer, suites, gallery, motion)
  components/admin/           admin UI (forms, tables, notifications)
  i18n/                       configuration, routes, FR/EN/AR dictionaries
  lib/                        shared helpers (validation, dates, WhatsApp, SEO)
  server/                     server-only: db, auth, services, notifications, media
  middleware.ts               locale routing + optimistic admin gate (edge)
  styles/globals.css          design tokens and global styles
tests/                        Vitest suites and helpers
```

---

## Content to verify

The hotel owner asked for missing suite details to be filled with placeholder values. These values are **not real hotel information** and are marked **`PLACEHOLDER (to verify)`** in `scripts/seed-data.ts` and in each suite's internal notes in the admin. They cover occupancy, bedding, amenities and the photo assigned to each suite.

Verify and correct them in the admin (*Suites*) before relying on them publicly. See [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) for the full list of open items.

---

## Git workflow

- `main` is protected by convention: changes arrive only through pull requests, never by direct pushes.
- Branch prefixes: `feature/`, `fix/`, `refactor/`, `test/`, `docs/`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/), e.g. `feat: …`, `fix: …`, `docs: …`.
- Run `npm run check` and `npm run build` before opening a pull request.

---

## Documentation

| Document | Content |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Architecture decisions: Cloudflare stack, data model, auth, media, notifications |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Cloudflare setup, secrets, migrations, seeding, first admin |
| [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) | Audit, verified facts, decisions, placeholder data and open items |
