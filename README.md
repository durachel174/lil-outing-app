# Lil Outing

> A peer-to-peer errand marketplace for the Bay Area — where runners already heading somewhere fulfill requests for buyers.

**Live demo:** [lil-outing-app.vercel.app](https://lil-outing-app.vercel.app)

---

## The idea

Inspired by a Reddit post where someone paid $30 for a stranger to hold their spot in the In-N-Out line. That's already happening — Lil Outing just makes it safe, structured, and repeatable.

Runners announce where they're going. Buyers post what they need. If the paths align, a run happens. No detours. No wasted trips.

---

## What it does

**For buyers**
- Post a request (food pickup, grocery run, bar line, event queue)
- Set an offer amount and spending cap
- See runners already heading to that location
- Track the run in real time

**For runners**
- Browse open requests near where you're already going
- Claim a run with one tap
- Walk through a step-by-step flow: check in → get items → deliver
- Earn money for errands you were already running

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (Postgres + Realtime + Auth) |
| Payments | Stripe (planned) |
| Deployment | Vercel |

---

## Features built

- **Auth** — email/password signup and login with Supabase Auth, persistent sessions via localStorage
- **Home feed** — real-time request feed with category filtering and runner/buyer mode toggle
- **Post a request** — 4-step flow: category → location + details → item list → offer amount
- **Request detail** — full request info, buyer profile, estimated cost, claim button
- **Runner flow** — step-by-step active run tracker: claimed → active → in transit → delivered
- **Profile page** — run history, request history, ratings, earnings stats
- **Real-time updates** — Supabase Realtime subscriptions on feed and active run pages

---

## Database design

11-table Postgres schema with row-level security:

- `users` — profiles with dual ratings (as buyer + as runner), wallet balance, fraud flags
- `requests` — 7-state machine (open → claimed → active → in_transit → delivered → completed / disputed)
- `runner_sessions` — proactive runner announcements with location + capacity
- `request_items` — line items with estimated vs actual prices
- `request_events` — append-only audit trail for every status change
- `messages` — in-run chat between buyer and runner
- `ratings` — post-run ratings from both sides
- `transactions` — Stripe escrow tracking
- `item_prices` — crowdsourced price history by location
- `location_limits` — crowdsourced per-person purchase limits (e.g. Arsicault: 2 croissants max)
- `fraud_flags` — automated + manual fraud detection

---

## Design decisions worth noting

**Why localStorage over IndexedDB for auth sessions**
Supabase's default IndexedDB session storage caused lock conflicts in development when multiple client instances were created across components. Switched to a custom localStorage adapter with a named storage key (`lil-outing-auth`) to eliminate the issue entirely.

**Singleton Supabase client**
A single shared client instance exported from `lib/supabase.ts` prevents the "Multiple GoTrueClient instances" warning and ensures consistent auth state across the app.

**7-state request machine**
`open → claimed → active → in_transit → delivered → completed` (plus `disputed`) maps cleanly to the real-world runner flow and makes RLS policies straightforward — each state transition is guarded at the database level.

**Append-only event log**
`request_events` never deletes or updates — every status change, check-in, and note is a new row. This makes disputes easy to resolve and gives a full audit trail for trust and safety.

---

## What's next

- [ ] Ratings flow — post-run ratings from both buyer and runner
- [ ] Proactive runner sessions — "I'm heading to Arsicault, anyone need anything?"
- [ ] Category-specific runner flows — bar/event line holding is fundamentally different from food pickup
- [ ] Stripe escrow — hold buyer funds at claim, release at completion
- [ ] Messages — in-run chat between buyer and runner
- [ ] Mobile app — the web app is mobile-first but a native app makes more sense long term

---

## Running locally

```bash
git clone https://github.com/durachel174/lil-outing-app.git
cd lil-outing-app
npm install
```

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
npm run dev
```

---

*Built in SF. Named after the thing that makes cities worth living in — the lil outing. The coffee run. The farmers market loop. The standing in line because the croissant is worth it.*