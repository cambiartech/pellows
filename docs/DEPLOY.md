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

## 2. Netlify build (schema check only — no seed wipe)

`npm run build` = `prisma generate` → **`prisma db push`** (sync schema) → `next build`.

Seed is **manual** when you want demo data:

```bash
curl -X POST https://pellows.netlify.app/api/v1/admin/seed \
  -H "x-admin-secret: $ADMIN_SECRET"
# or locally: npx tsx prisma/seed.ts
```

### Env vars (Production)

| Key | Required |
|-----|----------|
| `DATABASE_URL` / `DIRECT_URL` | Neon |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | `https://pellows.netlify.app` |
| `WHATSAPP_PHONE_NUMBER_ID` | Yes |
| `WHATSAPP_ACCESS_TOKEN` | Yes |
| `WHATSAPP_VERIFY_TOKEN` | `pellows-dev-verify` |
| `PELLOWS_USE_LLM` | `0` |
| Card rail | **Flutterwave** + USD (`FLW_*`, `FX_USD_NGN`, `FX_MARKUP_BPS`) |
| Domains | **pellows.stay** (primary), **pellows.xyz** → Netlify |

Health: https://pellows.netlify.app/api/v1/admin/status  
WA inbound debug: https://pellows.netlify.app/api/v1/admin/wa-debug

---

## 3. Meta webhook

Callback: `https://pellows.netlify.app/api/webhooks/whatsapp`  
Verify: `pellows-dev-verify` · Subscribe: **messages** · App published
