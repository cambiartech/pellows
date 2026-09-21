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
| `GEMINI_API_KEY` | Required for smart WA (Google AI Studio) |
| `GEMINI_MODEL` | Optional public id; omit from secrets scan (`gemini`+`-`+`3.6`+`-`+`flash`) |
| `PELLOWS_USE_LLM` | Leave **unset**, or flip LLM on in `/admin` (overrides `=0`) |
| Card rail | **Flutterwave** + USD (`FLW_*`, `FX_USD_NGN`, `FX_MARKUP_BPS`) |
| Domains | **pellows.stay** (primary), **pellows.xyz** → Netlify |

### Admin / ops

| What | How |
|------|-----|
| **Agency host login** | `/login` → demo after seed: `host@pellows.demo` / `pellows123` |
| **Seed Neon** | `curl -X POST …/api/v1/admin/seed -H "x-admin-secret: $ADMIN_SECRET"` |
| **DB / listing health** | `/api/v1/admin/status` |
| **WA webhook debug** | `/api/v1/admin/wa-debug` |
| **LLM on?** | `/admin` toggle, or `/api/v1/admin/agent-health` → `llmEnabled: true` |
| **Verify agency** | `POST /api/v1/admin/hosts/:id/verify` + header `x-admin-secret` |

**Admin UI:** https://pellows.netlify.app/admin — password `ADMIN_PASSWORD` (default `Pass@123`). Toggle Guest LLM there; it overrides Netlify `PELLOWS_USE_LLM=0`.

`ADMIN_SECRET` is still used for header-auth ops (verify / curl seed).

Health: https://pellows.netlify.app/api/v1/admin/status  
WA inbound debug: https://pellows.netlify.app/api/v1/admin/wa-debug
Agent brain: https://pellows.netlify.app/api/v1/admin/agent-health
---

## 3. Meta webhook

Callback: `https://pellows.netlify.app/api/webhooks/whatsapp`  
Verify: `pellows-dev-verify` · Subscribe: **messages** · App published
