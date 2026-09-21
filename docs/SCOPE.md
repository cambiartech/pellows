# Pellows — Scope, Stack & Launch Plan

**Product:** Pellows (from “pillows”) — Realcorp’s guest-facing stay marketplace + AI booking agent. **North star:** full holiday OS (flight → stay → experiences), starting with shortlets.  
**Experience stack:** [EXPERIENCE.md](./EXPERIENCE.md) · **Parent:** boerP / Realcorp ERP (`../realcorp`)  
**Rule:** Separate codebase. Sync via adapters. Do **not** merge into Realcorp.  
**Roadmap diagrams:** see **[ROADMAP.md](./ROADMAP.md)** · **[CONVERSATION_FLOW.md](./CONVERSATION_FLOW.md)**

---

## 1. Product thesis

**Pellows aggregates shortlet agencies** (starting with Lagos). Guests and AI agents search **one inventory**. Matches pop from live agency units. Booking + payment are seamless in-app.

| Side | Job |
|------|-----|
| **Agencies** | Onboard once; push units + calendars; get bookings and payouts |
| **Guests** | Chat / web / LLM → search → hold → pay → keys |
| **Platform** | **Search is the product.** Calendar is truth. LLM never invents rooms. Payments we own. |

Tagline direction: *From chat to keys. Anywhere.*

### How it actually works

```
Agencies onboard → units go LIVE
        ↓
Guest (WhatsApp / ChatGPT / web) asks for a stay
        ↓
Pellows search (fast, availability-aware) across ALL agencies
        ↓
Guest picks → hold → pay in-app → calendar locked
```

We are **not** building “a clever chatbot with fake listings.”  
We are building the **search + book + pay layer** on top of a real agency network.

See **[SEARCH.md](./SEARCH.md)** for search architecture.  
See **[CONVERSATION_FLOW.md](./CONVERSATION_FLOW.md)** for how chat talks to that search.

---

## 2. Stack decision (locked)

| Layer | Choice | Why |
|-------|--------|-----|
| App | **Next.js (App Router) + TypeScript** | Same family as Realcorp; ships UI + API fast |
| DB | **PostgreSQL + Prisma** | Inventory, calendars, bookings, ledger; geo/search-ready |
| Search | **Postgres now** → **Typesense/Meilisearch when agencies scale** | Multi-agency LIVE inventory; availability in-query; see SEARCH.md |
| Agent | **Shared tool API** (`search`, `hold`, `pay`, `confirm`) | One brain for WhatsApp, web, ChatGPT, Gemini |
| Decide | **Rules → Jev (TypeSafe)** for intent/slots | Typed routing; no hallucinated tool calls |
| Speak | **LLM optional** (OpenAI / Meta) | Warm copy only; inventory from tools |
| Payments | **Pellows-owned rails** (card / bank / crypto) | Guests pay *us*; we settle hosts |
| Hosting | **Node host** (Vercel / Fly / Railway / bare) | Not Cloudflare Agents |
| Realcorp | **Webhook + ID map later** | Speed now; ERP sync after bookings work |

**Deleted:** Cloudflare Workers / Durable Objects / Agents SDK starter. It was scaffold inheritance, not a product decision.

---

## 3. Payments — “handled by us”

Guests never leave Pellows to “someone else’s checkout brand” as the product surface. We own:

1. **PaymentIntent** — amount, currency, booking, method, status  
2. **Ledger** — double-entry style credits/debits (guest → platform → host)  
3. **Methods**
   - `CARD` — card acquiring via processors *we* configure (Paystack / Stripe / etc. as rails, not the brand)
   - `BANK_RAIL` — account / virtual account / transfer instructions we issue
   - `CRYPTO` — deposit address + asset (e.g. USDT) we monitor and confirm on-chain / via custody partner

Settlement, refunds, and host payouts are Pellows domain. Realcorp receives booking/finance *events* later — it does not own guest checkout.

---

## 4. Launch plan (ASAP)

### Phase 0 — Foundation (this rewrite) ✅
- [x] Nuke CF Agents scaffold  
- [x] Next.js + Prisma + Postgres schema  
- [x] Search / booking / payment domain modules  
- [x] Public search API + LLM tool surface stubs  
- [x] WhatsApp webhook stub → tool pipeline  
- [x] `docker compose up` + seed + `npm run dev` verified (search + hold + crypto pay + confirm)  

### Phase 1 — Bookable MVP (target: days, not weeks)
1. [x] Host can create a **STAY** listing + calendar blocks (`/host`, APIs)  
2. [x] Guest search is **fast** (API + `/search`, Detty defaults)  
3. [x] Guest can hold → choose **card / bank / crypto** → confirm (`/book/[id]`)  
4. [x] **WhatsApp agent loop** — webhook + `/chat` simulator (rules now; LLM if `OPENAI_API_KEY`)  
5. [x] Demo inventory seeded (Lagos Detty + global)  

### Phase 2 — Everywhere you chat + agent distribution
1. Harden OpenAPI / MCP tool catalog so **any AI agent** can book via Pellows  
2. Slack + email/Gmail agent adapters (same tools)  
3. iCal in/out for OTA calendars  
4. Virtual tours surfaced in chat recommendations  

### Phase 3 — Realcorp bridge
1. `booking.confirmed` / `booking.cancelled` webhooks → Realcorp shortlets  
2. Inbound blocks from ERP reservations  
3. Tenant API key map  

### Phase 4 — Expand inventory kinds
1. **RENTAL** (longer stay)  
2. **EXPERIENCE** (dated activities)  
Same search + pay rails.

---

## 5. Hard product rules

1. **Calendar truth > LLM** — never invent availability or prices  
2. **Search is sacred** — every agent/channel hits the same search service  
3. **WhatsApp ≠ product** — channel adapter only  
4. **LLM channels ≠ separate backends** — same tools  
5. **Payments owned by Pellows** — card, bank, crypto  
6. **Global by default** — no Nigeria-only product assumptions  
7. **Stay separate from Realcorp** until the adapter is explicit  

---

## 6. Key routes (v0)

| Route | Purpose |
|-------|---------|
| `GET /api/v1/search` | Fast inventory search |
| `POST /api/v1/bookings` | Create hold / inquiry |
| `POST /api/v1/payments/intents` | Start card / bank / crypto payment |
| `POST /api/v1/payments/confirm` | Confirm payment (webhook or poll) |
| `GET\|POST /api/webhooks/whatsapp` | Meta Cloud API |
| `GET /api/v1/llm/tools` | Tool schema for external LLMs |
| `POST /api/v1/llm/invoke` | Execute a tool call from an LLM channel |

---

## 7. Success criteria — “launchable”

- Guest finds a live stay in &lt;200ms search path on modest inventory  
- Guest completes booking via web **or** WhatsApp  
- Payment settles via at least one of: card, bank rail, crypto  
- Confirmed booking hard-blocks calendar (no double book)  
- ChatGPT/Gemini can call our tool schema against real inventory  
- Pellows deploys without Realcorp running  

---

## 8. One-liner

> **Pellows is Realcorp’s sharp marketplace + chat-native booking edge: text WhatsApp (or any AI agent) → live search → pay (card/bank/crypto) → keys. One tool API, many surfaces — separate from the ERP, sync later.**
