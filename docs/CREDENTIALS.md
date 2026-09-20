# Credentials & rails — how to get what Pellows needs

Paste secrets into **`.env.local`** / Netlify env only (never commit).  
See [`.env.example`](../.env.example) for the full key list.

---

## Card rail — Nigeria (Stripe paused)

**Stripe does not onboard Nigerian businesses for receiving payouts** in the usual way. Keep Stripe code for a future foreign entity / diaspora guests if useful, but **do not rely on it for Cambiar/Pellows as an NG merchant.**

### Recommended for Pellows (NG)

| Processor | Best for | Notes |
|-----------|----------|--------|
| **[Paystack](https://paystack.com/)** | Default card + local methods | NG-native; ~1.5% + ₦100 local (cap ₦2k); T+1 settlement; Checkout / API. **Wire this next.** |
| **[Flutterwave](https://flutterwave.com/)** | Pan-Africa / multi-currency | Broader African methods; slightly higher local fees than Paystack. |
| Bank transfer / virtual account | Guests without cards | Paystack Dedicated Virtual Accounts or Flutterwave transfers — pairs with our `BANK_RAIL` UX. |
| Crypto (USDT) | Parallel rail | Keep deposit address + memo; settle off-ramp separately. |

**What we need for Paystack**

| Env var | Where |
|---------|--------|
| `PAYSTACK_SECRET_KEY` | [dashboard.paystack.com](https://dashboard.paystack.com) → Settings → API Keys |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Same page (public) |
| `CARD_RAIL_PROVIDER=paystack` | Forces Paystack on `/pay` |
| Webhook URL | `https://pellows.netlify.app/api/webhooks/paystack` *(to build)* |

### Stripe (paused / optional)

Only if you later have a supported entity outside NG. Existing Checkout code stays dormant when `CARD_RAIL_PROVIDER=paystack`.

| Env var | Where |
|---------|--------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API keys |
| `STRIPE_PUBLISHABLE_KEY` | Same |
| `STRIPE_WEBHOOK_SECRET` | Webhooks → signing secret |
| `CARD_RAIL_PROVIDER=stripe` | Only when intentionally using Stripe |

---

## 2. Bank rail (transfer / virtual account)

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
| `MODEL_API_KEY` | Optional Muse Spark brain ([quickstart](https://dev.meta.ai/docs/quickstart)) |
| `PELLOWS_USE_LLM` | `1` to use Muse/OpenAI instead of rules |
| `OPENAI_API_KEY` | Fallback LLM if no `MODEL_API_KEY` |
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