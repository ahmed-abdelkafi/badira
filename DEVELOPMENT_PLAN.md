# La Badira — Development Plan

Living document. Updated at the end of every phase.

---

## Phase 1 — Repository audit & reference research ✅

### 1.1 Repository audit (verified)

| Item | Finding |
|---|---|
| Existing code | **None.** The repository contained only a `picture/` folder (12 JPEGs, 1.2 MB). No framework, backend, routing, deployment config or integrations existed to preserve. |
| Toolchain on the dev machine | Node 24.13, npm 11.6, git 2.53, Python 3.14. **No Docker, no local PostgreSQL** → local dev uses `embedded-postgres` (real PostgreSQL 18 binaries, started by `npm run db:dev`). |
| Scaffold | Next.js **16.4** (App Router, Turbopack, `cacheComponents` + `partialPrefetching` enabled), React 19.3, Tailwind CSS 4.3, TypeScript 5. |

### 1.2 Image inventory (`picture/`)

All files were inspected visually. Originals stay untouched in `picture/`; the seed script imports them into the media library (`media_assets`) where they can be replaced from the admin without code changes.

| File | Size | Content | Category | Use |
|---|---|---|---|---|
| `0c99b11b…` | 1920×1280 | Bedroom at dusk, white arch framing the sea, pierced-metal pendant lamps, calligraphy plaques | Suites | **Hero candidate**, Fell Sea View |
| `2f7e0815…` | 1920×1280 | Close-up: berries & champagne flute, sofa, sea light | Suites / detail | Welcome amenity detail, editorial accent |
| `524449db…` | 1080×1380 (portrait) | Massage, hand treatment, "Spa by Clarins" towel | Spa | Spa section (portrait slot) |
| `5d42be76…` | 1536×1024 | **AI-generated collage** with an invented logo ("La Badira Hammamet" arch mark), not real photography | — | **Excluded.** Shows an unofficial logo and fake rooms; publishing it would misrepresent the hotel. Kept on disk, not imported. |
| `784aff1b…` | 2048×1365 | Rooftop terrace with jacuzzi, daybed, champagne, bay view | Suites (Nour-type terrace) | Nour Suite / Pools & sea / hero alternative |
| `8a253fd1…` | 1200×801 | Night courtyard pool, palms, arches, dome | Architecture / Pools | Architecture & events (night), pools |
| `a01508f6…` | 1920×1280 | Suite living room, mashrabiya screen, sea balcony | Suites | Yasmine / Legend gallery |
| `aaabb8b4…` | 1920×1280 | Bathroom, zellige-style white tiles, double vanity, bathtub | Suites / bathroom | Yasmine (verified "bath and shower") |
| `b437abbe…` | 567×567 | Infinity pool, white portico, open sea | Pools | Pools section (small source → only used at ≤ 600 px) |
| `b818b55e…` | 1920×1280 | Vanity with star-pattern screen, view into bedroom | Suites | Fell Standard gallery |
| `d7239db0…` | 1920×1280 | Bedroom, carved hexagonal side table, striped rug | Suites | Fell Standard main |
| `e226c6fd…` | 1920×1280 | Suite living/dining area, pierced cabinets, sea glimpse | Suites | Fell Superior / Nour gallery |

**Gaps (no real photography available):** restaurants/dining, beach, events/weddings, exterior daytime architecture, experiences, the six Legend suites individually. Sections without photography use typographic or architectural compositions (no stock images, per brief). The admin can upload real photos into each slot.

### 1.3 Reference site research (labadira.com, verified Nov 2026)

Verified facts used in content (source pages under `https://www.labadira.com/en/…`):

- **Positioning:** "Designed for luxury & peaceful escapes, La Badira is exclusively for adults over 16 years." Name meaning: "Badira — as luminous as the full moon". Concept: "La Badira … A Century of Hammamet", recreating the universe of travel in the 1930s, referencing artists who stayed in Hammamet (Paul Klee, André Gide, Arletty, Oscar Wilde, August Macke). Member of **The Leading Hotels of the World** (LHW / Leaders Club logos).
- **Contact:** BP437, Hammamet 8050, Tunisia · +216 70 018 180 · contact@labadira.com · Facebook/Instagram/LinkedIn/Twitter.
- **Suites:** Fell Standard 45 m² (oriental-style open space, beige & white) · Fell Sea View 45 m², overlooks the Bay of Hammamet, king or twin · Fell Superior 45 m², pool & sea view, king or twin · Yasmine 45 m², king or twin, very large bathroom with bath and shower, partial sea view from the bath · Nour 120 m², sitting room and bedroom, Italian bath and shower, terrace with outdoor whirlpool overlooking the sea · Legend suites (6), 160 m² each (stated on five pages), private pool overlooking the sea, fireplace. Leïla Menchari (Tunisian artist, Hermès windows; suite inaugurated 2025), Claudia Cardinale, Jean Cocteau, Georges Sebastian, Wallis Simpson, Paul Klee.
- **Dining** (Chef Ramzi Bouguila): Kamilah (Mediterranean & contemporary, 12:00–00:00), Adra (Tunisian, 19:00–00:00, closed Monday), Zahila (breakfast 07:00–11:00), Beach Grill (12:00–19:00, June–Sept), Pool Bar (10:00–20:00, April–Oct), Lobby Bar (08:00–00:00, library & fireplace), Sunset (16:00–00:00, June–Sept).
- **Spa by Clarins:** treatment cabins, hammams, yoga & fitness rooms, tea room, hair salon, nail bar, heated indoor pool with Mediterranean view. Online booking: `https://emea.spatime.com/hlbt8050` (preserved as an outbound link).
- **Concierge:** Clefs d'Or concierge organising cultural and sports activities. Brochures (concierge, MICE, wedding 2026–2027) are linked as PDFs on the official site.

### 1.4 Existing integrations to preserve

| Integration | Status | Decision |
|---|---|---|
| Spa booking (Spatime) | Live third-party link | Preserved as outbound link on the Spa page |
| Room booking engine | **None found** ("Book" buttons point to the homepage) | Build a *reservation request* workflow (no fake availability) |
| LHW Leaders Club | Outbound link `lhw.com/leaders-club-hub?hotel=6969` | Preserved in footer |
| Contact form | Endpoint not visible | Replaced by our own contact → reservation/enquiry flow |

### 1.5 Missing information / open questions (NOT invented)

1. **Occupancy, bedding, amenities**: not published → **filled with plausible placeholder values at the owner's request** (Fell/Yasmine 2 guests, Nour 3, Legend 4; Leïla Menchari set to 160 m²). Every suite carries an internal note "PLACEHOLDER (to verify)". **Must be checked before launch.**
2. **Leïla Menchari suite area**: not stated on its page → left empty (other Legend suites: 160 m²).
3. **Official inventory "130 suites"** (from the brief's documentation): not found on the website → shown only in admin notes, not on the public site, until confirmed.
4. ~~WhatsApp number conflict~~ → **resolved by the owner: +216 25 062 098** (seeded, editable in *Admin → Coordonnées & WhatsApp*).
5. **Star rating, opening year, architect**: not published → not displayed.
6. **Restaurant, beach, events, exterior photography**: not in `picture/`.
7. ~~Official logo~~ → **designed at the owner's request**: full moon ("Badira") inside a Tunisian horseshoe arch above the sea line; favicon, Apple icon and admin icons generated (`public/brand/`, `src/app/icon.svg`).
8. **Testimonials:** none verified → the section is driven by admin-entered testimonials and stays **hidden until at least one is published**. No fake reviews.
9. **Arabic copy:** UI translations provided; editorial Arabic should be reviewed by a native copywriter.

---

## Phase plan & status

| # | Phase | Status |
|---|---|---|
| 1 | Repository audit & reference research | ✅ Done |
| 2 | Design system & visual direction | ✅ |
| 3 | Homepage & public website | ✅ |
| 4 | Suite catalog & detail pages | ✅ |
| 5 | Reservation request system | ✅ |
| 6 | Admin dashboard & authentication | ✅ |
| 7 | TOTP 2FA (Google / Microsoft Authenticator) | ✅ |
| 8 | WhatsApp click-to-chat (API-ready) | ✅ click-to-chat · Cloud API documented |
| 9 | Web Push & real-time (SSE) | ✅ (push needs on-device check) |
| 10 | Content management | ✅ |
| 11 | SEO, performance, accessibility, tests | ✅ (Lighthouse run pending on real hosting) |
| 12 | Production deployment documentation | ✅ DEPLOYMENT.md |

After each phase: `npm run typecheck`, `npm run lint`, `npm test`, update this file.

---

## Phase 2 — Design system (done)

- **Typography:** *Bodoni Moda* (display — high-contrast didone, fashion-editorial, period-true to the 1930s narrative) + *Jost* (body — geometric, Futura lineage, also 1920s–30s). Arabic: *Amiri* (display) + *IBM Plex Sans Arabic* (body), swapped automatically via `html[lang="ar"]`.
- **Tokens** in `src/styles/globals.css` (`@theme`): charcoal, ivory, sand, champagne, plus `champagne-deep` (#7A6444) and `stone` (#5F5950) for AA-compliant small text on ivory.
- **Components:** thin-border buttons with curtain fill (no pills), underline-draw links, hairline rules, mashrabiya star ornament, underline form fields, film-grain on dark fields.
- **Motion:** GSAP + ScrollTrigger (hero timeline, parallax, scale reveals, pinned horizontal gallery), Lenis (desktop/fine-pointer only), Motion (menu curtain, lightbox, page fade, form). Reveals use **CSS scroll-driven animations** (`animation-timeline: view()`): zero JS and no hydration risk. Unsupported browsers and `prefers-reduced-motion` show content statically.

## Phases 3–5 — Public site (done)

Routes (each in `/fr`, `/en`, `/ar`): home, concept, suites, suites/[slug] (11), dining, spa, experiences, events, gallery, contact, reservations, privacy + 404.
Homepage chapters each use a distinct composition: cinematic hero · editorial concept + artist marquee · sticky two-collection storytelling · menu-card dining list · portrait spa with ScaleReveal · full-bleed parallax pools · three-column experiences · split events · pinned horizontal gallery · testimonials (hidden until real ones exist) · contact.
Reservation request: two-step form, shared Zod schema client/server, honeypot, IP + email rate limits, unique `LB-YYMM-XXXXXX` reference, history + notification event in one transaction, guest/staff email + Web Push after response (`after()`). Verified end-to-end in the browser (row stored as `pending`, phone normalised to E.164, email logged as *not configured*).

**Known decisions:** the official-site WhatsApp number conflict still needs confirmation; suite photo assignments are provisional (flagged in each suite's internal notes).

## Phases 6–12 — Admin, security, CMS, SEO, tests (done)

- **Auth:** scrypt passwords, DB sessions (hashed tokens, 12 h absolute / 2 h idle), login rate limiting (email + IP), generic errors, password reset by single-use 30-min token (email, or owner-generated link when SMTP is absent), sign-out everywhere.
- **2FA (mandatory):** TOTP enrolment with QR + manual key, AES-256-GCM secret at rest, ±30 s drift, replay protection, 10 hashed recovery codes shown once, step-up TOTP to regenerate codes, owner-only 2FA reset (audited).
- **Roles:** owner, manager, reservations agent, content editor (permission matrix on the Users page).
- **Reservations:** dashboard KPIs + 30-day trend + by-category chart (validated colour, hover + table view), searchable/filterable/paginated list, detail with confirmation dialogs, personalised message (email if SMTP), WhatsApp panel (FR/EN/AR templates, editable, logs "opened" only), internal notes, full history with actor and timestamps, row-locked status transitions.
- **Real time:** SSE stream backed by `notification_events` (multi-instance safe) → toasts + live refresh; Web Push with VAPID, service worker, permission requested only on click, per-device management, test push, expired-subscription pruning, de-duplication via `push_deliveries`.
- **CMS:** suites (create/edit/archive/delete-guarded, multi-upload, main image, reorder, trilingual fields, SEO), restaurants/spa/experiences/events/testimonials (config-driven), gallery, media library (alt text ×3, replace-in-place, usage-aware delete), pages & SEO + homepage sections, UI translations overrides, contact & WhatsApp templates, users, audit log. Every edit invalidates the public cache tags → live immediately.
- **SEO:** per-page metadata, canonical + hreflang (+x-default), Open Graph/Twitter, `Hotel`/`LocalBusiness` and `Suite` JSON-LD, sitemap with alternates, robots, static prerendering of all public pages.
- **Tests:** 73 Vitest tests (see README). Production build passes.

## Verified in the browser (local)

Homepage chapters & animations, all public routes ×3 locales (200 / proper 404), RTL layout, mobile layouts (390 px), reservation submission → stored `pending`, admin login → mandatory 2FA enrolment → dashboard, reservation acceptance with history, suite edit → public page updated immediately.

## Not yet verified / remaining work

| Item | Status |
|---|---|
| Web Push on real devices | Logic covered by tests with a mocked push service; the browser permission flow must be checked on reception devices over HTTPS. |
| Email delivery | Code path tested in "not configured" mode only; needs real SMTP credentials. |
| Lighthouse / Core Web Vitals | To run on the production host (local dev numbers are not representative). |
| Playwright end-to-end suite | Not added (manual browser verification done instead). |
| Official logo, missing photography, Arabic copy review, WhatsApp number confirmation, suite occupancy/bedding | Waiting for the hotel (see §1.5). |
| Redirects from old WordPress URLs | Listed in DEPLOYMENT.md; to be added once final URLs are approved. |

---

## Phase 13 — Migration to Cloudflare (done, 2026-11-23)

Requested by the owner. Workers (OpenNext) + D1 + R2 + Images. See ARCHITECTURE.md §1 and DEPLOYMENT.md.

- Schema ported to SQLite (D1); migrations regenerated; transactions → atomic batches; row locks → optimistic conditional updates; Postgres-only SQL (casts, ILIKE, generate_series) rewritten.
- Media: R2 storage, Cloudflare Images normalisation on upload, own resizing route (AVIF/WebP, whitelisted sizes, edge cache), custom `next/image` loader.
- Email: Resend HTTP API. Push: Web Crypto implementation. Live updates: polling. Recovery codes: HMAC.
- Seed/admin scripts drive `wrangler d1 execute` / `wrangler r2 object put` (local or `--remote`).
- Logo + favicon designed; WhatsApp +216 25 062 098; placeholder suite data (flagged).
- Fixed along the way: media library page crashed (client-module constant used on the server); env vars not visible in `next dev` with `.dev.vars`.

**Verified in the real Workers runtime (`wrangler`/`workerd`, local):** all public routes ×3 locales, cookies/middleware, R2 photos + AVIF/WebP resizing, admin login (scrypt), 2FA enrolment + recovery codes, reservation submitted in Arabic → appeared live on the dashboard (toast, counters, chart), photo upload processed by the Images binding. Worker size 2.07 MiB gzip.

**Not yet done:** an actual deployment (needs the owner's Cloudflare login: `wrangler login`), Resend and push tested only with mocks, Lighthouse on the live domain.

## Phase 14 — Free plan, WhatsApp only (2026-11-23)

- Owner decisions: 100 % Cloudflare free plans; **no email** (WhatsApp only); Cloudflare account `15780e7671cf26656615e325996f1afa` (in `wrangler.jsonc`).
- Removed: Resend email, guest acknowledgements, decision emails, "forgot password" emails (→ owner-generated one-time link), `confirmation_email_sent_at` column (migration 0001). Guest email is now optional in the reservation form; phone/WhatsApp is the contact channel.
- Admin passwords: browser PBKDF2 proof + server HMAC (Workers Free CPU budget). Forms hardened (POST, disabled until hydrated).
- Verified: 75 tests; Worker build; login → 2FA in `workerd`.

## Deployed (2026-11-23)

- **Live:** https://la-badira.abdelkafi-ahmed-techsup.workers.dev (Workers Free) — D1 `la-badira` (WEUR, id 309b8435-a147-45ed-8465-5cabbfe45ccf), R2 `la-badira-media`, Images binding.
- Production seeded (11 suites, 11 photos, roles, settings with WhatsApp +216 25 062 098). Secrets uploaded (`wrangler secret bulk .prod.secrets.json`).
- Smoke test: all public routes ×3 locales 200, admin redirects to login, AVIF images from R2, sitemap uses the live URL. `wrangler tail` during 10 page loads: 10/10 `ok`, no `exceededCpu`.
- Next: owner creates their admin account (`npm run admin:create -- … --remote`), enrols 2FA, verifies placeholder suite data, then attach `labadira.com` (Workers → Domains & Routes) and update `SITE_URL`.
