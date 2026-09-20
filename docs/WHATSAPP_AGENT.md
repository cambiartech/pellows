# WhatsApp — do this now (from the Overview screen)

You are on **Customize use case → Integrate with API → Overview**.  
**Ignore Step 2 and Step 3** for tonight. Only **Step 1**.

---

## Click path (exact)

1. Left sidebar under **Basic setup** → click **Step 1**  
   (or the **Step 1. Try it out (5 min)** card / “Start using the API” if shown).

2. On that page you should see something like **API Setup**:
   - **Temporary access token** → click **Generate** / **Generate access token** → **copy the long token**
   - **Phone number ID** → a long number under the test “From” number → **copy it**  
     (this is **not** `+1555…` and **not** your `2348080…`)
   - Optional: **WhatsApp Business Account ID** — nice to have, we don’t require it in env yet

3. Still on Step 1: add **your personal WhatsApp** as a **To / test recipient**, send Meta’s sample message. When it arrives, you’re unblocked.

4. Paste into `.env.local` (restart `npm run dev` after):

```bash
WHATSAPP_PHONE_NUMBER_ID=paste_the_id_here
WHATSAPP_ACCESS_TOKEN=paste_the_token_here
WHATSAPP_VERIFY_TOKEN=pellows-dev-verify
```

5. **Stable HTTPS (recommended) — skip tunnels.**  
   `loca.lt` / ngrok mint a **random** subdomain each run (`odd-mugs-kneel`, etc.) — they die and change. Deploy once (Vercel preferred for this Next.js app; Netlify works but slower setup with Prisma). Set:

```bash
APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

   Plus hosted Postgres (`DATABASE_URL` / `DIRECT_URL`) — Docker localhost won’t work on Netlify/Vercel.

   Local-only stopgap: `npx localtunnel --port 3000` (URL changes every restart).

Then in Meta: **WhatsApp → Configuration**:

| Field | Value |
|-------|--------|
| Callback URL | `https://YOUR_STABLE_HOST/api/webhooks/whatsapp` |
| Verify token | `pellows-dev-verify` |
| Subscribe | **messages** |

6. WhatsApp the **test From number**: `2 bed Lekki Dec 20-27` → Pellows replies + pay link.

---

## Do **not** do yet

| Screen | Why skip |
|--------|----------|
| Step 2 Production setup | Own number + payment method — later |
| Step 3 Business verification | Already “In review” — wait; not needed for test number |
| `dev.meta.ai` / Muse | Blocked / optional — agent uses rules engine |

---

## What to send back here

Just these two strings (blur middle if you want):

1. `WHATSAPP_PHONE_NUMBER_ID=…`
2. `WHATSAPP_ACCESS_TOKEN=…` (first 12 + last 6 chars is enough to confirm; full paste into `.env.local` yourself is fine)

Then say “ngrok up” with the HTTPS URL if you want the webhook wired next.

---

## Code already waiting

- Verify: `GET /api/webhooks/whatsapp` (token `pellows-dev-verify`)
- Inbound: `POST /api/webhooks/whatsapp` → `handleGuestMessage` → reply via Cloud API
- Local twin (no Meta): `/chat`

Official Meta walkthrough: [Cloud API get started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/)
