# Credentials & rails — how to get what Pellows needs

Paste secrets into **`.env.local`** / Netlify env only (never commit).  
See [`.env.example`](../.env.example) for the full key list.

---

## Card rail — Nigeria + diaspora (Flutterwave + USD)

**Stripe paused** for NG merchant settlement. **Flutterwave** is the default card rail: charge guests in **USD** (FX markup), settle as configured in Flutterwave (NGN/USD). Hosts still list in NGN.

| Env | Purpose |
|-----|---------|
| `FLW_SECRET_KEY` | Flutterwave secret |
| `NEXT_PUBLIC_FLW_PUBLIC_KEY` | Public key (optional client) |
| `FLW_SECRET_HASH` | Webhook `verif-hash` |
| `CARD_RAIL_PROVIDER=flutterwave` | Force FLW |
| `FX_USD_NGN` | Mid rate NGN per USD (default `1600`) |
| `FX_MARKUP_BPS` | FX margin in bps (default `300` = 3%) |

Webhook: `https://pellows.stay/api/webhooks/flutterwave` (or Netlify URL until DNS live)

Checkout: `POST /api/v1/payments/flutterwave/checkout` · Confirm: `POST /api/v1/payments/flutterwave/confirm`

**Paystack** remains a fallback (`CARD_RAIL_PROVIDER=paystack`) if you prefer it later. Stripe code stays for an optional non-NG entity.

### Domains

- **Primary:** [pellows.stay](https://pellows.stay) — guest + WhatsApp pay links  
- **Alt:** [pellows.xyz](https://pellows.xyz)  
- Point both to Netlify; set `APP_URL` / `NEXT_PUBLIC_APP_URL` to `https://pellows.stay`

---

## Bank rail (transfer / virtual account)

**What we need**

| Env var | Meaning |
|---------|---------|
| `BANK_RAIL_BANK_NAME` | Bank shown to guest |
| `BANK_RAIL_ACCOUNT_NAME` | Account name |
| `BANK_RAIL_ACCOUNT_NUMBER` | Account / VA number |

**How to get them**

Pick one path:

**A. Dedicated settlement account (fastest)**  
Use a company bank account (or sub-account) and put the details in env. Guests transfer with a unique payment `reference` we already generate (`PEL-XXXX`). Someone (or a webhook later) matches credits → confirm.

**B. Paystack / Flutterwave Dedicated Virtual Account**  
1. Enable Transfers / Dedicated NUBAN in the provider dashboard.  
2. Create a VA per payment or a pooled account + reference matching.  
3. Give us the provider secret + how you want matching done — we’ll wire verify webhooks.

**C. Stripe (limited for NG local bank)**  
Stripe is weaker for Nigerian bank transfers; prefer A or B for Lagos Detty.

Until set, UI shows `PENDING_SETUP` — bookings still work with `devConfirm` in non-production.

---

## 3. Crypto rail (USDT)

**What we need**

| Env var | Meaning |
|---------|---------|
| `CRYPTO_DEFAULT_ASSET` | Usually `USDT` |
| `CRYPTO_DEPOSIT_ADDRESS` | Hot/warm wallet address guests send to |

**How to get them**

1. Create a **TRC20 USDT** deposit address (Tron) — or ERC20 if you prefer (note gas).
2. Use a custodial wallet (Exchange sub-account), Fireblocks, or a watched hot wallet.
3. Paste address into `CRYPTO_DEPOSIT_ADDRESS`.
4. Later: a watcher (TronGrid / Alchemy / exchange deposit webhook) calls our confirm API when `reference` amount lands.

**Safety:** Prefer a dedicated address (or memo/tag chain) so Detty traffic isn’t mixed with personal funds.

---

## 4. Meta WhatsApp Cloud API

**What we need**

| Env var | Meaning |
|---------|---------|
| `WHATSAPP_ACCESS_TOKEN` | Permanent / system-user token |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID (not the +234 display number) |
| `WHATSAPP_VERIFY_TOKEN` | Random string you invent for webhook verify |
| `NEXT_PUBLIC_APP_URL` / `APP_URL` | **Public HTTPS** URL (ngrok / Fly / Vercel) |

**How to get them**

1. [Meta for Developers](https://developers.facebook.com/) → Create app → type **Business**.
2. Add product **WhatsApp** → start with the test number, then add your own.
3. Copy **Temporary** access token (dev) or create a **System User** token (prod) from Business Manager.
4. Copy **Phone number ID** from WhatsApp → API Setup.
5. Set webhook callback URL to:  
   `https://YOUR_PUBLIC_URL/api/webhooks/whatsapp`  
   Verify token = same as `WHATSAPP_VERIFY_TOKEN`.  
   Subscribe to `messages`.
6. For local: [ngrok](https://ngrok.com/) `ngrok http 3000` → put that HTTPS URL in `NEXT_PUBLIC_APP_URL`.

Docs: [WhatsApp Cloud API getting started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started).

---

## 5. Partner OTAs & Realcorp (later)

| Source | What to apply for | What to hand us |
|--------|-------------------|-----------------|
| **Airbnb** | [Homes API](https://developer.withairbnb.com/) Partner Portal + Sandbox | Client id/secret |
| **Booking** | [Connectivity](https://developers.booking.com/) and/or Demand API | Partner id + secrets |
| **Realcorp** | Internal API (brief in [IMPORT_APIS.md](./IMPORT_APIS.md)) | Base URL + API key pattern |

Until then: agencies use **URL + iCal + CSV** on `/host/import`.

---

## 6. Ops secrets (already stubbed)

| Env | Purpose |
|-----|---------|
| `CRON_SECRET` | Protect `GET /api/cron/ical-sync` |
| `ADMIN_SECRET` | Verify agencies (`POST /api/v1/admin/hosts/:id/verify`) |
| `LLM_CHANNEL_SECRET` | External AI tool invoke |
| `GEMINI_API_KEY` | **Guest chat brain** (Google AI Studio) — required on Netlify for smart WA replies |
| `GEMINI_MODEL` | Optional public model id (omit from secrets scan) |
| `PELLOWS_USE_LLM` | Set `0` only to force rules engine |
| `OPENAI_API_KEY` | Optional fallback LLM |
| `MODEL_API_KEY` | Optional Muse (usually blocked) |
| `DATABASE_URL` | Postgres |

---

## Suggested order for you

1. **Stripe test keys** → in `.env.local` → Checkout wired. Finish Connect identity verify for **live**.  
2. **WhatsApp agent (core):** Meta tokens + **public HTTPS** + webhook — see **[WHATSAPP_AGENT.md](./WHATSAPP_AGENT.md)**.  
3. Bank account number for transfer instructions.  
4. USDT address if you want crypto for Detty.  
5. Partner OTA apps in parallel (slow).

When live Stripe webhook secret is ready:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```