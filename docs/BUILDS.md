# Pellows — Full Build List (track to final product)

**How to use this file:** check boxes as we ship. This is the single source of “what’s left.”  
Related: [SEARCH.md](./SEARCH.md) · [CONVERSATION_FLOW.md](./CONVERSATION_FLOW.md) · [SCOPE.md](./SCOPE.md) · [UI_BAR.md](./UI_BAR.md)

**Product in one line:** Onboard Lagos shortlet agencies → their units appear in search → guests book via WhatsApp / web / AI agents → pay in-app → calendar locks.

---

## Legend

| Mark | Meaning |
|------|---------|
| ✅ | Done |
| 🟡 | Next / in progress |
| ⬜ | Not started |
| 🔒 | Depends on partner / credentials (Meta, Paystack, etc.) |

---

## Wave 0 — Foundation ✅

- [x] **B0.1** Separate Pellows app (Next.js + Postgres + Prisma)
- [x] **B0.2** Domain: listings, calendar, bookings, payments, ledger, conversations
- [x] **B0.3** Search API (availability-aware)
- [x] **B0.4** Hold → payment intent → confirm
- [x] **B0.5** Web search + book pages
- [x] **B0.6** Chat simulator + WhatsApp webhook stub
- [x] **B0.7** LLM tool catalog (`/api/v1/llm/tools` + invoke)
- [x] **B0.8** Docs folder (`docs/`)
- [x] **B0.9** SEO baseline: `robots.txt`, `sitemap.xml`, `llms.txt`, root metadata
- [x] **B5.13+** JSON-LD + public `/stays/[slug]` pages (Wave 5B)

---

## Wave 1 — Agency onboarding ✅

Goal: an agency can join in minutes, list units, go live — **no engineer needed on-site.**

### 1A — Smooth signup & workspace

- [x] **B1.1** Agency account: sign up with business name, phone, WhatsApp, email (`/join`)
- [x] **B1.2** Simple login (password) — `/login`
- [x] **B1.3** Agency workspace dashboard: units count, LIVE vs draft (`/host`)
- [x] **B1.4** Invite staff (optional): owner + ops roles (`/host/settings`, `/invite/[token]`)

### 1B — Add inventory the easy way

- [x] **B1.5** **Add unit wizard** (mobile-friendly): `/host/new` — area taps → rate → amenities → publish
- [x] **B1.6** **Bulk import** (CSV template + `/host/import` + `POST /api/v1/imports/csv`)
- [x] **B1.7** Duplicate unit (“same building, another flat”) — `/api/v1/listings/:id/duplicate`
- [x] **B1.8** Pause / go LIVE toggle (instant search include/exclude)
- [x] **B1.9** Edit rates & amenities without re-creating (`/host/[id]`)

### 1B-API — Link existing platforms (all 4 paths)

Comfy stays for guests = inventory from **wherever agencies already list**. See [IMPORT_APIS.md](./IMPORT_APIS.md).

**Attainable now**

- [x] **B1.19** **Import hub UI**: `/host/import` — Airbnb · Booking · Realcorp · Manual · CSV
- [x] **B1.20** **iCal link API** — `POST /api/v1/imports/ical` → busy dates
- [x] **B1.21** **Listing URL import API** — `POST /api/v1/imports/listing-url` → DRAFT
- [x] **B1.24** Scheduled iCal re-sync — `GET /api/cron/ical-sync` (+ `CRON_SECRET`) · last-sync on edit

**Partner / Realcorp (creds → wire)**

- [x] **B1.22** **Realcorp import API** — stub `POST /api/v1/imports/realcorp` → 501 until `REALCORP_API_BASE` 🔒
- [x] **B1.23** **Agency Listings API** (API key) — `GET/POST /api/v1/agency/listings` + rotate key in Settings
- [x] **B1.25a/b/c** Partner status stub — `GET /api/v1/partners/status` (501 + env checklist) 🔒

**Definition of easy:** Agency pastes Airbnb/Booking URL + iCal → preview → Publish → searchable. Partner APIs deepen sync later without changing the hub.

### 1C — Calendar without pain

- [x] **B1.10** Visual calendar: block owner dates / maintenance (`HostMonthCalendar` on edit)
- [x] **B1.11** Paste **iCal URL** → sync busy dates (import hub + edit + cron)
- [x] **B1.12** Clear conflict warnings (`GET /listings/:id/availability`)

### 1D — Money & trust

- [x] **B1.13** Payout profile: bank account and/or crypto wallet (`/host/settings`)
- [x] **B1.14** Booking inbox: new holds, confirmed, guest contact (`/host/bookings`)
- [x] **B1.15** Agency terms / commission display (`/api/v1/agency/terms` + Settings)

### 1E — Field onboarding kit (for your Lagos agency visits)

- [x] **B1.16** Public **“Join Pellows”** landing (`/join`)
- [x] **B1.17** One-pager: “how you get bookings + payouts” (`/for-agencies`)
- [x] **B1.18** Admin: mark agency Verified (`POST /api/v1/admin/hosts/:id/verify` + `ADMIN_SECRET`)

**Definition of done for Wave 1 ✅:** Agency can signup on a phone, add units (wizard/CSV/URL), go LIVE, manage calendar/conflicts, see inbox & payouts, invite staff. Partner OTAs wire when credentials land.

---

## Wave 2 — Search that scales 🟡

- [x] **B2.1** Ranking: area match → vibe/amenities → price → freshness
- [x] **B2.2** Facets: area, price band, bedrooms, amenities
- [x] **B2.3** Typo-tolerant text (“lekky” → Lekki) — alias map (+ Typesense later)
- [ ] **B2.4** Geo search (near landmark / map pin) when coords exist
- [ ] **B2.5** Search SLA: p95 &lt; 100ms on 1k+ LIVE units
- [ ] **B2.6** Typesense/Meilisearch projection when inventory grows
- [x] **B2.7** Agency pause → units drop from search instantly *(LIVE filter already)*

---

## Wave 3 — Guest book & pay (seamless) 🟡

- [ ] **B3.1** Real **card** rail — **Flutterwave** (USD charge + FX markup; NG settlement) 🔒
- [x] **B3.1b** Stripe Checkout retained (paused for NG merchants)
- [x] **B3.1c** USD dual-price on stay + pay pages (`FX_USD_NGN` / `FX_MARKUP_BPS`)
- [ ] **B3.2** Real **bank** rail (Flutterwave/Paystack DVA) 🔒
- [ ] **B3.3** Real **crypto** rail (deposit address + watcher) 🔒
- [ ] **B3.4** Remove `devConfirm` from production
- [ ] **B3.5** Pay receipt + WhatsApp “you’re confirmed” message
- [x] **B3.6** Concurrent hold safety (Serializable txn + expire stale HOLDs)
- [x] **B3.7** Cancellation v1 — `POST /api/v1/bookings/:id/cancel`

---

## Wave 4 — Chat & AI agents (distribution) 🟡

- [x] **B4.1** Meta WhatsApp Cloud API live (Netlify webhook + `messages` subscribed + published)
- [ ] **B4.2** Rich WhatsApp messages (buttons: pick stay / pay link)
- [ ] **B4.3** OpenAPI / MCP hardened for ChatGPT + Gemini
- [ ] **B4.4** Slack adapter (same tools)
- [ ] **B4.5** Email / Gmail-agent adapter
- [ ] **B4.6** Optional LLM NLU always-on (`OPENAI_API_KEY`) for freer chat

---

## Wave 5 — Guest web experience ⬜

- [ ] **B5.1** Search results with photos + map
- [x] **B5.2** Listing detail page (gallery, amenities, tour) — **public `/stays/[slug]` for SEO**
- [ ] **B5.3** Book → pay same as chat (one funnel)
- [ ] **B5.4** Guest “my booking” status page (link from WhatsApp)

---

## Wave 5B — SEO & AI crawlers ⬜

Build so Google **and** AI agents can discover inventory. See [SEO_AI.md](./SEO_AI.md).

- [ ] **B5.10** `robots.txt` — allow public pages; don’t block AI crawlers by default
- [ ] **B5.11** Dynamic `sitemap.xml` (home, search, stays, join)
- [ ] **B5.12** Metadata + Open Graph on all public pages
- [x] **B5.13** JSON-LD (`LodgingBusiness` / `Offer`) on stay pages
- [ ] **B5.14** `/llms.txt` — instructions for AI agents → search/book APIs
- [ ] **B5.15** Public OpenAPI URL documented for ChatGPT Actions / Gemini
- [x] **B5.16** Server-render stay pages for crawlers (not client-only empty shells)

---

## Wave 6 — Ops & Realcorp ⬜

- [ ] **B6.1** Platform admin: all agencies, units, bookings
- [ ] **B6.2** `booking.confirmed` → Realcorp shortlets webhook
- [ ] **B6.3** Realcorp blocks → Pellows calendar
- [ ] **B6.4** Basic analytics: searches, conversion, GMV per agency
- [ ] **B6.5** Deploy production (domain + HTTPS + DB backups)

---

## Wave 7 — Expand inventory types ⬜

- [ ] **B7.1** Longer **RENTAL** flows
- [ ] **B7.2** **EXPERIENCE** dated activities
- [ ] **B7.3** Multi-city beyond Lagos (same engine)

---

## Suggested order (so you can track “what’s next”)

| Order | Build IDs | Outcome |
|-------|-----------|---------|
| **1 (now)** | B1.1 → B1.5 → B1.8 → B1.16 | Agency signup + manual unit + LIVE |
| **2** | **B1.19 → B1.22** | **Link Airbnb/Booking iCal + Realcorp import** |
| **3** | B1.10 → B1.14 → B1.23 | Calendar UX + agency API |
| **4** | B5.10–B5.14 (SEO/AI early) | Crawlers + llms.txt while inventory grows |
| **5** | B2.1 → B2.3 | Search ranking / typos |
| **6** | B3.* + B4.1 | Real pay + live WhatsApp |
| **7** | B5.1–B5.4 + B6.* | Guest web + admin + Realcorp sync |

---

## Agency onboarding UX principles (non-negotiable)

1. **Phone-first** — most agencies will onboard on mobile with you present  
2. **&lt; 10 minutes to first LIVE unit**  
3. **No jargon** — “Add apartment” not “Create listing entity”  
4. **Defaults** — Lagos areas as taps (Lekki, VI, Ikoyi, Oniru, Yaba…)  
5. **Photos from camera roll** — not desktop-only upload hell  
6. **One big green button:** Publish / Go live  

---

## Progress snapshot

| Wave | Status |
|------|--------|
| 0 Foundation | ✅ Complete |
| 1 Agency onboarding | 🟡 **Next — start B1.1** |
| 2 Search scale | ⬜ |
| 3 Pay rails | ⬜ |
| 4 Chat / AI distribution | ⬜ |
| 5 Guest web | ⬜ |
| 6 Ops / Realcorp | ⬜ |
| 7 Expand types | ⬜ |

When you say go, we implement **B1.1 → B1.5 → B1.8** first (signup + add-unit wizard + LIVE toggle).
