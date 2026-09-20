# Deploy — Netlify + Neon (stable WhatsApp webhook)

**Host:** Netlify (not Vercel).  
**DB:** Neon Postgres.  
Skip localtunnel. Skip Neon “hello.ts / neon deploy Functions”.

---

## 1. Neon connection strings

From Neon console → project → **production** → Connect:

| Env | Which string |
|-----|----------------|
| `DATABASE_URL` | **Pooled** (`…-pooler.…`) |
| `DIRECT_URL` | **Direct** (same host **without** `-pooler`) |

Use `?sslmode=require` (drop `channel_binding=require` if Node/`pg` errors).

Push schema once from your laptop:

```bash
# with Neon URLs in .env.local
npx prisma db push
npx tsx prisma/seed.ts
```

---

## 2. Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → Import from Git → `cambiartech/pellows`.
2. Build: `npm run build` · Publish: `.next` (see `netlify.toml`).
3. **Site configuration → Environment variables** (Production):

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Neon pooled |
| `DIRECT_URL` | Neon direct |
| `APP_URL` | `https://YOUR-SITE.netlify.app` (set after first deploy, then redeploy) |
| `NEXT_PUBLIC_APP_URL` | same |
| `CARD_RAIL_PROVIDER` | `stripe` |
| `STRIPE_SECRET_KEY` | |
| `STRIPE_PUBLISHABLE_KEY` | |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | |
| `WHATSAPP_PHONE_NUMBER_ID` | |
| `WHATSAPP_ACCESS_TOKEN` | |
| `WHATSAPP_VERIFY_TOKEN` | `pellows-dev-verify` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | optional |
| `PELLOWS_USE_LLM` | `0` |

4. Deploy. Copy the site URL → set `APP_URL` / `NEXT_PUBLIC_APP_URL` → **Clear cache and deploy** again.

---

## 3. Point Meta + Stripe at Netlify

- WhatsApp: `https://YOUR-SITE.netlify.app/api/webhooks/whatsapp`  
  Verify token: `pellows-dev-verify` · Subscribe: **messages**
- Stripe: `https://YOUR-SITE.netlify.app/api/webhooks/stripe`

---

## Security

If a Neon password was pasted in chat/screenshots, **rotate it** in Neon → Roles → Reset password, then update Netlify env + `.env.local`.
