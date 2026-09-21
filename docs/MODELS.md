# Model choice — Pellows guest agent

Not “pick a popular LLM.” Fit for **WhatsApp booking**: multi-step tool calls (`search` → `hold` → `pay`), sub-second feel, Lagos volume cost.

## Verdict (locked for Wave 4)

| Role | Model | Why |
|------|--------|-----|
| **Chat + tools (default)** | **Gemini 2.5 Flash** | Fastest TTFT / cheapest at volume; Google lists it for agentic + function calling ([docs](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash)). You already have keys. |
| **Routing / automation** | **Jev (TypeSafe)** when keyed | Typed intent + confidence — no chat strings, can’t type-error ([intro](https://typesafe.ai/blog/introducing-system-one-models-and-jev)). Complements Gemini; does not replace it. |
| **Fallback speak** | OpenAI `gpt-4o-mini` | Mature tool calling if Gemini down. |
| **Heavy reasoning later** | Claude Sonnet | Best for complex multi-step recovery — slower/pricier; use for ops/planning, not every WA turn. |
| **Offline** | Rules engine | Always works; dull but truthful. |

### Why not Claude / GPT-4o as default WA brain?

- **Claude Sonnet** — stronger tool reliability on hard graphs; ~2–3× slower and far more $ for every “hey / Lekki Detty” turn. Wrong default for chat volume.
- **GPT-4o** — excellent function calling; mid latency/cost. Fine as paid upgrade; not needed day-one if Gemini keys exist.
- **GPT-4o-mini** — OK cheap OpenAI fallback; Gemini Flash still wins WA snappiness in 2026 agent speed tests.

### Architecture (this is the “reasoning”)

```
Guest text
  → [Jev/rules] intent + slots + confidence
  → [Gemini Flash] natural reply + tool calls (only LIVE inventory)
  → WhatsApp typing + list/CTA / later Flows
```

Gemini **reasons in the tool loop**. Jev **gates** bad routes (flight ask → holiday_expand, not invent a jet).

## Setup (you)

`.env.local`:

```bash
GEMINI_API_KEY=your_google_ai_studio_key
# Optional — Netlify: set GEMINI_MODEL to the current Flash id (see Google AI docs)
# do not set PELLOWS_USE_LLM=0
```

Restart `npm run dev`. Hard-refresh `/chat`.

Optional force: `PELLOWS_LLM_PROVIDER=gemini|openai|meta`
