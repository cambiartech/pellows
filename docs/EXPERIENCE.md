# Holiday OS — vision & experience stack

**North star:** Book the *entire* holiday from chat — flight → short stay → experiences — starting with **Pellows pillows** (shortlets).Payments are the easy layer. **Conversation quality is the product.**

Guest help: [WhatsApp Flows FAQ](https://faq.whatsapp.com/1137338520520761?locale=en_US) · Brain: [TypeSafe Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

---

## Experience stack (chosen)

| Layer | Tech | Job |
|-------|------|-----|
| **Surface** | WhatsApp Cloud API | Where Lagos guests already live |
| **Presence** | [Typing indicators](https://developers.facebook.com/docs/whatsapp/cloud-api/typing-indicators/) | … dots while we think |
| **Onboarding** | Interactive welcome (buttons) → later **WhatsApp Flows** | OWO-style Get Started; forms for dates/guests |
| **Route / decide** | Rules now → **Jev (System One)** when keyed | Typed intent + confidence — no hallucinated tool calls |
| **Speak / tools** | LLM optional (`PELLOWS_USE_LLM=1`) + shared tools | Warm copy; search/hold/pay never invented |
| **Truth** | Postgres LIVE inventory + calendar | Same plane for WA, web, ChatGPT |
| **Pay** | Flutterwave USD + FX (keys later) | In-app; not the brand of the chat |

### Why Jev (not “replace ChatGPT”)

[Jev](https://docs.typesafe.ai/) does **not** write chat messages. It returns **typed decisions** (Choice / Score / Noul) with calibrated confidence in ~70–500ms. Perfect for:

- Intent: greeting vs search vs pick vs “book my flight” vs out-of-scope  
- Slot confidence: did we really hear “Lekki Dec 20–27”?  
- Guardrails: refuse inventing stays; escalate when confidence &lt; threshold  

**LLM** still owns natural language replies. **Our code** owns search/hold/pay.  
Set `TYPESAFE_API_KEY` + `PELLOWS_USE_JEV=1` when early access is live; until then rules decide.

### WhatsApp Flows (next UX tier)

Flows = native multi-screen forms in chat ([Meta best practices](https://developers.facebook.com/docs/whatsapp/flows/guides/bestpractices/)). Use for:

1. Dates + guests + vibe (endpoint-powered → live availability)  
2. Guest name / phone confirm  
3. Not for free-text “find me something chill” — that’s agent + tools  

Order: **typing + welcome + list/CTA** (shipped) → **Flow: book details** → **Flow: confirm** → holiday modules.

---

## Phased product (do not skip)

### Phase A — Shortlet excellence (now)
- [x] Typing indicator on inbound  
- [x] Welcome interactive (Find a stay / How it works)  
- [x] Stay list + Pay CTA  
- [x] Decision layer (rules + Jev hook)  
- [ ] Image header on welcome (Meta media upload)  
- [ ] WhatsApp Flow: dates/guests → search  
- [ ] Always-on LLM copy when key present (default on in prod)  
- [ ] Camera-roll photo upload for hosts  

### Phase B — Money + domain
- Flutterwave keys + confirm WA message  
- `pellows.stay` / `.xyz` DNS  

### Phase C — Holiday OS modules
Same agent tools, new domains: `search_flights`, `search_experiences`, itinerary hold.  
Inventory adapters (Amadeus / local OTAs / Realcorp) behind the same invoke plane.

### Phase D — LLM storefront
Hardened OpenAPI + ChatGPT Actions / Custom GPT + Gemini — not just `/llms.txt`.

---

## Guest promise

> Random text is fine. We show we’re listening (typing). We route with confidence. We only offer **live** inventory. We never invent a room. When you ask for a flight today, we say: pillow first — holiday next.
