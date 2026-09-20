# SEO & AI crawlers

Pellows must be discoverable by **Google** and usable by **AI agents/crawlers** (ChatGPT browsing, Perplexity, Gemini, etc.) — not only behind a login.

---

## Principles

1. **Public pages are crawlable** — home, search, listing details, join/agency landing  
2. **Structured data** — Schema.org `LodgingBusiness` / `Accommodation` / `Offer`  
3. **Machine-readable tools** — OpenAPI + `/llms.txt` pointing agents at our APIs  
4. **Fast, indexable HTML** — server-rendered listing/search shells where possible  
5. **Don’t block AI crawlers** unless legally required — allow GPTBot/ClaudeBot/etc. in robots (revisit if abuse)

---

## Build checklist

| ID | Item | Status |
|----|------|--------|
| S1 | `robots.txt` — allow public routes, disallow private `/host` ops if needed | ✅ |
| S2 | `sitemap.xml` — home, search, listings, join | ✅ (stays when LIVE) |
| S3 | Per-page metadata (title/description/OG) | ✅ root · expand per page |
| S4 | JSON-LD on listing + home | ⬜ |
| S5 | Public listing detail URLs `/stays/[slug]` (shareable + crawlable) | ⬜ |
| S6 | `llms.txt` — how AI agents should use Pellows | ✅ |
| S7 | OpenAPI doc URL linked from llms.txt + LLM tools | partial |
| S8 | Canonical URLs + OG images for stays | ⬜ |
| S9 | Performance: LCP on home/search (Core Web Vitals) | ⬜ |

---

## AI agent discovery path

```
AI crawler / ChatGPT Action
    → reads /llms.txt or OpenAPI
    → calls GET /api/v1/search + POST bookings/pay tools
    → guest completes pay on Pellows
```

Same inventory agencies imported — crawlers and WhatsApp hit **one search plane**.
