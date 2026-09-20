# WhatsApp surface (clarified)

**Product intent:** Guest **texts Pellows on WhatsApp** and the **agent books** a short stay.  
Not a website click-to-chat widget.

→ Full setup checklist: **[WHATSAPP_AGENT.md](./WHATSAPP_AGENT.md)**

| Approach | Use? |
|----------|------|
| Cloud API webhook + guest agent | ✅ **This is the product** |
| `/chat` web simulator | ✅ Same agent, for testing |
| `wa.me` floating site button | ❌ Not the Pellows model |
| Meta Embedded Signup | Only if we onboard *other* businesses’ WABAs later |
| BSP inbox widgets | Optional ops tool, not the guest path |

Embedded Signup docs (partners only): [Meta Embedded Signup](https://developers.facebook.com/docs/whatsapp/embedded-signup/overview).
