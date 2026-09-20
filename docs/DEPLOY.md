# Deploy — Vercel + Neon (stable WhatsApp webhook)

Skip localtunnel/ngrok. This app is **Next.js on Vercel** with **Neon Postgres**.

Do **not** run the Neon “hello.ts / neon deploy Functions” scaffold — that is a different product. We only need Neon’s **database connection strings**.

---

## 1. Neon (Postgres)

1. Open project [rough-sun-58029227](https://console.neon.tech/) (or your Neon dashboard).
2. Branch **production** → **Connection details**.
3. Copy:
   - **Pooled** connection → `DATABASE_URL` (for the app / Prisma adapter)
   - **Direct** (non-pooled) → `DIRECT_URL` (for `prisma db push` / migrations)

Optional CLI (login once on your machine):

```bash
npm i -g neonctl@latest   # or: neon@latest
neonctl auth
# Connection string:
neonctl connection-string rough-sun-58029227 --branch production
```

Skip `neon skills`, `neon mcp`, `neon config init`, and `neon deploy` unless you intentionally want Neon Functions later.

Locally you can put those URLs in `.env.local` (gitignored) and run:

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

---

## 2. GitHub

Repo: [https://github.com/cambiartech/pellows](https://github.com/cambiartech/pellows)

```bash
git branch -M main
git remote add origin https://github.com/cambiartech/pellows.git   # once
git push -u origin main
```

Secrets stay out of git (`.env*` ignored; `.env.example` is the template).

---

## 3. Vercel

1. [vercel.com/new](https://vercel.com/new) → Import `cambiartech/pellows`.
2. Framework: Next.js (auto).
3. **Environment variables** (Production + Preview):

| Key | Notes |
|-----|--------|
| `DATABASE_URL` | Neon pooled |
| `DIRECT_URL` | Neon direct |
| `APP_URL` | `https://YOUR_PROJECT.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | same |
| `CARD_RAIL_PROVIDER` | `stripe` |
| `STRIPE_SECRET_KEY` | from Stripe |
| `STRIPE_PUBLISHABLE_KEY` | |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta |
| `WHATSAPP_ACCESS_TOKEN` | Meta |
| `WHATSAPP_VERIFY_TOKEN` | `pellows-dev-verify` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | optional display |
| `PELLOWS_USE_LLM` | `0` |

4. Deploy. Then run schema once against Neon (local with Neon URLs, or Vercel CLI):

```bash
DATABASE_URL=… DIRECT_URL=… npx prisma db push
DATABASE_URL=… npx tsx prisma/seed.ts
```

5. Meta webhook Callback URL (stable):

`https://YOUR_PROJECT.vercel.app/api/webhooks/whatsapp`  
Verify token: `pellows-dev-verify` · Subscribe: **messages**

6. Stripe webhook: `https://YOUR_PROJECT.vercel.app/api/webhooks/stripe`

---

## Netlify?

Possible, but slower with Next 16 + Prisma. Prefer **Vercel**. No `netlify.toml` required for this path.
