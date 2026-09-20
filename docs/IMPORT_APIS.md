# Import APIs — Airbnb, Booking.com, Realcorp & others

**Understood:** Agencies already live on Airbnb / Booking / Realcorp should **link or import**, not re-type every flat. Manual wizard is for agencies with nothing online; **APIs + importers** are for everyone else.

---

## Strategy: all four, attainable first

We pursue **A + B + C + D**. Guests only care that stays are comfy and bookable.

1. **Ship now** — Import hub, URL drafts, iCal busy sync, manual wizard.
2. **Drop credentials when ready** — wire B1.25a/b/c + Realcorp without redesigning the hub.
3. **Demand API (B)** enriches guest choice with Booking inventory alongside agency flats — same search/chat UX.

---

## What you need to provide (credentials checklist)

Your screenshot is **Booking Demand API** (`/search` → `/availability` → `/orders/preview` → `/orders/create`) — that sells **Booking.com’s** inventory inside Pellows.  
Agency **import** (their flats onto Pellows) is a **different** product: Connectivity / Data Portability / iCal.

| Goal | Product to apply for | What to hand us when approved |
|------|----------------------|-------------------------------|
| **A. Agencies import their Booking listings** | [Connectivity APIs](https://developers.booking.com/) (Provider Portal) and/or [Data Portability API](https://developers.booking.com/) | Provider/partner ID · client id/secret · sandbox creds · env URLs · scopes allowed |
| **B. Guests book Booking.com hotels via Pellows** | **Demand API** — “Search, look and book” (what you screenshotted) | Affiliate/partner ID · API key or OAuth · sandbox base URL · payment handling rules from their docs |
| **C. Agencies sync Airbnb** | [Airbnb Homes API](https://developer.withairbnb.com/) Partner Portal | Client id/secret · sandbox access · listing/reservation scopes |
| **D. Realcorp one-click sync** | Their API (brief below) | Tenant API key pattern · base URL · sample unit JSON · webhook secret |
| **E. Ship without waiting** | Nothing from partners | We build iCal + URL + CSV now |

**Minimum to unblock official Booking Demand (goal B):** affiliate/partner account approved → sandbox credentials → production credentials later → note how payment is handled (they often require Booking’s payment flow on preview/create).

**Minimum to unblock agency import (goal A):** Connectivity **or** Portability approval — Demand alone does **not** pull an agency’s own listing into our Host model.

Store secrets in `.env.local` only (never commit): e.g. `BOOKING_DEMAND_CLIENT_ID`, `BOOKING_DEMAND_CLIENT_SECRET`, `AIRBNB_CLIENT_ID`, `AIRBNB_CLIENT_SECRET`, `REALCORP_API_BASE`, `REALCORP_API_KEY`.

---

## Official partner portals (reference)

| Platform | Docs | What it is for us | Gate |
|----------|------|-------------------|------|
| **Airbnb** | [developer.withairbnb.com](https://developer.withairbnb.com/) | **Homes API**: manage listings, sync availability, reservations. Sandbox V2 for testing. | 🔒 Partner / app approval |
| **Booking.com** | [developers.booking.com](https://developers.booking.com/) | **Connectivity APIs** (property owners manage via software) · **Demand API** (supply search — different product) · **Data Portability API** (user-authorized data move) · Metasearch Connect | 🔒 Provider / partner |
| **Realcorp** | *(ask them to publish)* | First-party shortlet units + calendar + rates | Internal / we define |

**Honest split**

| Now (no partner wait) | Later (partner access) |
|-----------------------|------------------------|
| Paste **iCal** → busy dates | Airbnb Homes API listing + reservation sync |
| Paste **listing URL** → draft fields (best-effort) | Booking Connectivity pull/push |
| **CSV** bulk | Booking Data Portability (agency OAuth “move my data”) |
| **Realcorp** signed sync | Full write-back / two-way |

We do **not** pretend public scrape = official Airbnb/Booking API.

---

## Sources we support (priority)

| Source | What we pull | How (realistic path) | Partner gate? |
|--------|--------------|----------------------|---------------|
| **Airbnb** | Listing basics + calendar | iCal URL (calendar now) → listing link import → [Homes API](https://developer.withairbnb.com/) later | Official API 🔒 |
| **Booking.com** | Listing basics + calendar | iCal + Connectivity / Data Portability later | Connectivity 🔒 |
| **Vrbo / others** | Calendar + listing URL | iCal + URL import | Varies |
| **Realcorp / boerP** | Units + blocks + rates | Signed API / webhook sync (same company) | We define with them |
| **CSV / Sheet** | Bulk units | Upload template | None |
| **Pellows Public API** | Create/update listings programmatically | REST for agencies & partners | API keys |

---

## Agency UX (“just link your stuff”)

```
Join Pellows
    → “I already list on…” [Airbnb] [Booking] [Realcorp] [None — add manually]
    → Paste listing URL and/or iCal link
    → Preview imported unit(s)
    → Confirm → LIVE on Pellows search
```

Calendar stays in sync via scheduled iCal pull until official channel APIs are available.

---

## API surface (build targets)

| Endpoint (planned) | Purpose |
|--------------------|---------|
| `POST /api/v1/imports/ical` | Attach inbound iCal → sync busy dates |
| `POST /api/v1/imports/listing-url` | Fetch/parse public listing URL → draft unit |
| `POST /api/v1/imports/csv` | Bulk create drafts |
| `POST /api/v1/imports/realcorp` | Pull units for linked Realcorp tenant |
| `GET/POST /api/v1/agency/listings` | Agency CRUD (their API key) |
| `POST /api/v1/agency/listings/:id/publish` | Go LIVE |

All imports create **DRAFT** first; agency taps **Publish** → searchable.

---

## What to ask Realcorp for (brief you can send)

Goal: one-click “sync my Realcorp shortlets → Pellows drafts.”

**Minimum v1**

1. **Auth** — tenant API key or OAuth client for Pellows (scoped per agency/tenant).
2. **List units** — `GET /units?tenantId=` → id, title, area/neighbourhood, beds/baths/guests, amenities, nightly rate + currency, photos[], status.
3. **Availability** — either iCal URL per unit **or** `GET /units/:id/blocks?from=&to=` (busy ranges).
4. **Stable IDs** — `realcorpUnitId` we store on Pellows listing (idempotent re-sync).
5. **Webhook (nice)** — `unit.updated` / `block.changed` so we don’t only poll.

**Optional v2**

- Push confirmed Pellows bookings back as blocks.
- Rates / min-nights / cleaning fee fields.
- Sandbox tenant for Detty demo.

**Out of scope for their first cut:** guest messaging, payments (Pellows owns pay rails).

---

## Realcorp path (once they ship)

Realcorp shortlet operators enable “Pellows” → we map `tenantId + shortletUnitId` → Pellows listing.  
Bookings confirmed on Pellows flow back as events. See SCOPE § Realcorp bridge.

---

## Partner application notes (Airbnb / Booking)

- **Airbnb Homes API** — apply via [Partner Portal](https://developer.withairbnb.com/); use Sandbox V2 while waiting. Target: manage listings + sync availability + reservations (read).
- **Booking Connectivity** — for channel-manager style property sync ([docs](https://developers.booking.com/)); **Data Portability** is a separate path if agencies authorize moving a copy of their data into Pellows.
- Until approved: **iCal + URL import + CSV** keep agencies shipping.

---

## Constraints (be honest with agencies)

- **Official Airbnb/Booking APIs** need partner approval — we don’t fake that.
- **iCal** is the universal calendar bridge *today*.
- **URL import** helps bootstrap title/photos/amenities where pages allow; always editable before LIVE.
- **Realcorp** can be first-class and deep once they expose the brief above.
