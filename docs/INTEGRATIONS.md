# Integrations — operator guide

**Who this is for:** anyone connecting rooms to Pellows, or keeping those connections running.  
**Not this file:** the contract we send Realcorp engineering is [REALCORP_INTEGRATION.md](./REALCORP_INTEGRATION.md).

Guests only ever search rooms we already stored. A WhatsApp reply does not wait on Realcorp, Airbnb, or Booking.com.

---

## Realcorp

A Realcorp tenant is listed only if that workspace turns Pellows on. Every other tenant stays invisible. There is no key that opens all of them.

### What the tenant does in Realcorp

1. Open Shortlets → Channels → **Pellows** and turn it on.
2. Copy two values from that screen:
   - **Tenant id** — that workspace only.
   - **Connection token** — proves this workspace opted in. It cannot read anyone else.
3. Turning Pellows off revokes the token. Their live rooms on Pellows pause on the next sync.

### What the agency does in Pellows

Log in at `/login`, then open **Import** (`/host/import`) → **Realcorp**.

| Field | What to enter |
|-------|----------------|
| Realcorp tenant id | Pasted from the Realcorp screen. |
| Connection token | Pasted once. After it is saved, the box can stay blank. |
| Use their nightly rate | On: guests see the Realcorp price. Off: add a markup. |
| Markup % | Only if their rate is off. `10` means guests see the ERP rate plus 10%. |

Press **Save and sync**.

- The first pull saves rooms as **drafts**. They are not in guest search yet.
- Open each room you want to sell and press **Go LIVE** once.
- After this workspace has a live Realcorp room, a **new apartment they post later publishes on its own**, with the same markup. Nobody presses sync for each new flat.
- A price change, a new photo, or a busy date updates the copy we already have.
- An apartment they archive drops out of search.

### What stays in sync without a button

Two background jobs, neither of them inside a guest message:

| Job | What it does |
|-----|----------------|
| Realcorp notifies Pellows | A new room, an edit, an archive, or a blocked date is written within seconds. |
| Pellows catch-up | Every few minutes we pull anything their notification missed. One slow tenant does not block the others. |

**Save and sync** is for the first connection, or when an operator wants a full pull now.

### When it fails

| What you see | What it means | What to do |
|--------------|----------------|------------|
| “Waiting on REALCORP_API_BASE” | Pellows does not have their API address yet. The tenant id and price choice are saved. | Ops sets `REALCORP_API_BASE`, then sync again. |
| “Turn Pellows on… paste the connection token” | This workspace has not opted in. | Tenant turns Pellows on in Realcorp and pastes the token. |
| Realcorp refused this workspace. Listings were paused. | The token was revoked or is wrong. Live rooms from that tenant are paused so guests cannot book a room we can no longer see. | Turn Pellows on again and paste a new token. |
| Rooms synced, guests cannot see them | They are still drafts. | Go LIVE on the rooms you want to sell. |

---

## Airbnb and Booking.com

These are not a live feed yet. We do not scrape their sites.

On **Import**, pick Airbnb or Booking.com:

1. Paste the **listing URL**. That creates a draft (title and what we can read from the page).
2. Paste the **iCal** link for that listing. Busy dates, including the guest name on the calendar, stay on the room.
3. Check the draft, then **Go LIVE**.

The calendar refreshes on a schedule (`/api/cron/ical-sync`). A new Airbnb listing does not appear until someone imports it. Official Airbnb and Booking partner APIs are still an application, not a connection an agency can turn on today.

---

## CSV

**Import → CSV bulk** for many rooms that are not on Realcorp. Upload creates drafts. Go LIVE when each one is ready. A CSV file does not keep updating itself.

---

## Manual

**Import → Manual**, or **Add a stay**, for one apartment typed in by hand. Same rule: draft until Go LIVE.

---

## Pellows ops

Agencies never see these. They live in the server environment, not in the import form.

| Setting | Why it exists |
|---------|----------------|
| `REALCORP_API_BASE` | Where we pull units. Guest chat never calls it. |
| `REALCORP_CLIENT_ID` / `REALCORP_CLIENT_SECRET` | Proves the caller is Pellows. Cannot list rooms. |
| `REALCORP_WEBHOOK_SECRET` | Checks the signature on `POST /api/webhooks/realcorp`. Until this is set, their notifications are refused. |
| `CRON_SECRET` | Protects `GET /api/cron/realcorp-sync` and `GET /api/cron/ical-sync`. |

Webhook they must call:

`https://pellows.stay/api/webhooks/realcorp`

Until that domain is live, use the Netlify host with the same path.

Point a scheduler at the catch-up every few minutes:

`GET /api/cron/realcorp-sync` with `Authorization: Bearer <CRON_SECRET>`

---

## What we do not do yet

- Take payment inside Realcorp. The guest pays on Pellows.
- Write a Pellows booking back onto their room board.
- List a tenant who never turned Pellows on.
- Pull Airbnb or Booking inventory through their official APIs.
