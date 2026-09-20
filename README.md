# Pellows

**Agency network + search + book + pay.** Onboard Lagos shortlet agencies → guests (and AI agents) search live inventory → hold → pay in-app → keys.

Docs (organized): **[docs/](./docs/)**  
- **[BUILDS](./docs/BUILDS.md)** ← track every build to final product  
- [SCOPE](./docs/SCOPE.md) · [SEARCH](./docs/SEARCH.md) · [ROADMAP](./docs/ROADMAP.md) · [CONVERSATION_FLOW](./docs/CONVERSATION_FLOW.md)

## Stack

- **Next.js + TypeScript + Postgres + Prisma**
- Shared search/book/pay APIs for web, WhatsApp, and external LLMs
- Payments owned by Pellows (card · bank · crypto) via `/pay`

## Quick start

```bash
docker compose up -d
cp .env.example .env.local
npm install
npm run db:generate && npm run db:push && npm run db:seed
npm run dev
```

- Search: http://localhost:3000/search  
- Chat agent: http://localhost:3000/chat  
- Host / agency list: http://localhost:3000/host  

## Core idea

Chat is a **mouth**. Search over onboarded agencies is the **brain**. Booking + payment must be seamless or the product fails.
