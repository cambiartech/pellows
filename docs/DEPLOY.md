# Deploy — Netlify + Neon (stable WhatsApp webhook)

**Host:** Netlify. **DB:** Neon Postgres.  
Skip localtunnel. Skip Neon Functions hello scaffold.

---

## 1. Neon connection strings

| Env | Which string |
|-----|----------------|
| `DATABASE_URL` | **Pooled** (`…-pooler.…`) |
| `DIRECT_URL` | **Direct** (host **without** `-pooler`) |

Use `?sslmode=require` (drop `channel_binding=require`).

---

## 2. Netlify

1. Import `cambiartech/pellows` on [app.netlify.com](https://app.netlify.com).
2. **`npm run build` already syncs DB:** `prisma generate` → `db push` → **seed 9 LIVE listings** → `next build`.
3. Env vars (Production):

| Key | Required |
|-----|----------|
| `DATABASE_URL` / `DIRECT_URL` | Neon |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | `https://pellows.netlify.app` |
| `WHATSAPP_PHONE_NUMBER_ID` | **Yes for phone replies** |
| `WHATSAPP_ACCESS_TOKEN` | **Yes for phone replies** |
| `WHATSAPP_VERIFY_TOKEN` | `pellows-dev-verify` |
| Stripe keys | optional while paused |
| `PELLOWS_USE_LLM` | `0` |

4. After deploy open: **https://pellows.netlify.app/api/v1/admin/status**  
   - `liveListings` should be **≥ 9**  
   - `whatsappOutboundReady` should be **true**

### Why /chat said “No live stays”
`Listing` was empty (Neon screenshot). Conversations from `/chat` still create `Conversation` rows — that is **not** inventory.

### Why phone gets no reply
Inbound can create conversations; **outbound needs** `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` on Netlify. Without them the app dry-runs and never sends WhatsApp.

---

## 3. Meta webhook

Callback: `https://pellows.netlify.app/api/webhooks/whatsapp`  
Verify: `pellows-dev-verify` · Subscribe: **messages**
