# Lil Outing

> A peer-to-peer errand marketplace for the Bay Area — where runners already heading somewhere fulfill requests for buyers.

**Live demo:** [lil-outing-app.vercel.app](https://lil-outing-app.vercel.app)

---

## The idea

It started with a Reddit post — someone paying $30 for a stranger to wait in the In-N-Out line and deliver it to their door. In-N-Out isn't on any delivery app. But someone was already going.

The Bay Area runs on hype food and long lines. Arsicault. Tartine. Rotating viral popups, limited croissant flavors, weekend food collabs. There are people willing to pay to skip the wait. And there are people already heading there who could earn a little extra just by being there.

Lil Outing connects them — not as a gig app, but as a community. The runner isn't doing a job. They're already going. The app just lets their outing count for someone else too.

**The runner isn't doing an errand. They're treating themselves to a morning in the city and also helping someone else get that good croissant. The croissant pays for itself.**

---

## Market gap

The closest competitors are dead:
- **Spotblaze** — line-sitting app, unpublished from Google Play July 2023
- **Placer** — NYC line-sitting app, no longer active
- **Same Ole Line Dudes** — NYC manual service, $50 base + $25/hr, never scaled

Generic platforms like TaskRabbit handle it as an afterthought — not real-time, fees up to 70%, too slow for "I need someone at Arsicault right now."

No dedicated, real-time, hyper-local, mobile-first platform exists for the Bay Area. The opportunity is real.

---

## What it does

**For buyers**
- Post a request — food pickup, grocery run, bar line, event queue
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
- **Profile page** — run history, request history, dual ratings, earnings stats
- **Real-time updates** — Supabase Realtime subscriptions on feed and active run pages
- **Proactive runner sessions** — runners announce where they're heading, buyers order directly into their session; both buyer-initiated and runner-initiated flows converge at the same request lifecycle

---

## Request lifecycle — 7-state machine

```
OPEN → CLAIMED → ACTIVE → IN_TRANSIT → DELIVERED → COMPLETED
                                                   ↘ EXPIRED / CANCELLED / DISPUTED
```

Both buyer-initiated and runner-initiated requests converge at CLAIMED and follow the same path.

| State | Triggered by | Key behavior |
|---|---|---|
| OPEN | Buyer posts | Visible in feed, expiry timer starts |
| CLAIMED | Runner claims | Removed from feed, Stripe holds payment |
| ACTIVE | Runner GPS check-in | Buyer notified, price confirmation step |
| IN_TRANSIT | Runner taps "On my way" | ETA shown to buyer |
| DELIVERED | Runner marks delivered | 10-min auto-confirm window starts |
| COMPLETED | Buyer confirms or auto-confirm | Escrow releases, ratings prompted |
| EXPIRED | No runner before expiry | Full refund, no charge |

---

## Database design

11-table Postgres schema with row-level security:

- `users` — profiles with dual ratings (as buyer + as runner), wallet balance, fraud flags
- `requests` — 7-state machine with full lifecycle tracking
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
Supabase's default IndexedDB session storage caused lock conflicts in development when multiple client instances were created across components. Switched to a custom localStorage adapter with a named storage key to eliminate the issue entirely — no more manual cache clearing between restarts.

**Singleton Supabase client**
A single shared client instance exported from `lib/supabase.ts` prevents the "Multiple GoTrueClient instances" warning and ensures consistent auth state across the app.

**Append-only event log**
`request_events` never deletes or updates — every status change, check-in, and note is a new row. This makes disputes easy to resolve and gives a full evidence trail for every transaction. Reviewable years later.

**Crowdsourced data compounds over time**
Three append-only tables (`item_prices`, `location_limits`, `request_events`) get more valuable with every completed run. After a year of runs Lil Outing would have the most accurate hyperlocal food price database in the Bay Area — something no competitor can replicate without the run history.

**Trust biased toward runners**
The platform auto-confirms delivery after 10 minutes to protect runners from buyers who ghost. GPS logs, photos, and chat timestamps are auto-evaluated on disputes. Supply-side trust is existential — if runners don't feel protected, there's no marketplace.

---

## Trust & safety

| Attack | Mitigation |
|---|---|
| Runner disappears with money | Stripe escrow — runner never paid until delivery confirmed |
| Fake price inflation | Crowdsourced price baseline + 30% outlier detection |
| Buyer claims non-delivery | GPS at delivery address + delivery photo + auto-confirm |
| New account abuse | First-run cap: max $30 total until 3 clean completions |

---

## What's next

- [ ] Stripe escrow — hold buyer funds at claim, release at completion
- [ ] Category-specific runner flows — bar/event line holding differs from food pickup
- [ ] Messages — in-run chat between buyer and runner
- [ ] React Native app — web is mobile-first but native makes more sense long term

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