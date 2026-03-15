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
- See price hints based on what runners have actually paid at that location
- Get warned about purchase limits before ordering too many items
- Track the run in real time

**For runners**
- Browse open requests near where you're already going
- Announce where you're heading — buyers order directly into your session
- Walk through a step-by-step flow: check in → get items → confirm prices → deliver
- Earn money for errands you were already running

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (Postgres + Realtime + Auth) |
| Fuzzy matching | Fuse.js |
| AI seeding | Google Gemini API |
| Payments | Stripe (planned) |
| Deployment | Vercel |

---

## Features built

- **Auth** — email/password signup and login with Supabase Auth, persistent sessions via localStorage
- **Home feed** — real-time request feed with category filtering and runner/buyer mode toggle
- **Post a request** — 4-step flow with live price hints and purchase limit warnings from crowdsourced history
- **Proactive runner sessions** — runners announce where they're heading, buyers order directly into their session
- **Runner flow** — step-by-step active run tracker: claimed → active → in transit → price confirmation → delivered
- **Crowdsourced pricing** — every run contributes to a hyperlocal price database; fuzzy matching resolves item name variants
- **Purchase limit warnings** — Gemini seeds known limits for new locations; runners confirm and correct over time
- **Fraud detection** — auto-flags price inflation 30%+ above historical average, requires explicit runner confirmation
- **Request expiry cron** — pg_cron job runs every 5 minutes and auto-expires stale open requests, keeping the feed clean
- **Ratings flow** — post-run ratings from both sides with weighted average seeded at 5.0
- **Profile page** — run history, request history, dual ratings, earnings stats
- **Real-time updates** — Supabase Realtime subscriptions on feed and active run pages

---

## Crowdsourced pricing pipeline

This is the feature that makes Lil Outing defensible over time.

After every completed run, the runner confirms what they actually spent on each item. Those prices feed an append-only `item_prices` table. When a buyer posts a new request at the same location, they see: *"💡 Usually $7.00 at Arsicault Bakery."*

The pipeline has four layers:

**1. Normalization**
Location names and item names are normalized before storage — "Arsicault Bakery", "arsicault", "Arsicault" all resolve to the same key. Item names go through a custom normalizer that handles plurals, abbreviations, and common variants ("choco chip cookie" → "chocolate chip cookie").

**2. Fuzzy matching with Fuse.js**
New item names are matched against existing canonical names using Fuse.js with a 0.35 similarity threshold. If a match is found, the new price is attributed to the canonical item — keeping the dataset clean without requiring runners to type exactly.

**3. Fraud detection**
When a runner submits a price more than 30% above the historical average for that item at that location, the app surfaces a warning: *"You entered $20 · avg is $7 (186% above avg)."* The runner must explicitly confirm before proceeding. The submission is written to `fraud_flags` with the full percentage delta for review.

**4. AI-assisted seeding with Gemini**
When a buyer posts a request at a location Lil Outing has never seen before, the app automatically queries Google Gemini to seed any known purchase limits for that location. Gemini's response is stored with `source: 'gemini'` and `confidence: 'low'` — it serves as a starting point until runners confirm or correct it from the ground. This means new locations aren't blank slates on day one, and the community data layer starts with something to validate against rather than nothing.

The data compounds with every run:
```
Week 1:   ~50 records    → suggestions for popular spots
Month 1:  ~500 records   → solid Inner Richmond + Mission coverage
Month 3:  ~5,000 records → citywide with high confidence
Year 1:   ~50,000 records → most accurate hyperlocal food DB in Bay Area
```

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
| DELIVERED | Runner confirms prices + marks delivered | 10-min auto-confirm window starts |
| COMPLETED | Buyer confirms or auto-confirm | Escrow releases, ratings prompted |
| EXPIRED | pg_cron fires every 5 min | Auto-expired, full refund |

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
- `item_prices` — crowdsourced price history by location (append-only)
- `location_limits` — crowdsourced + Gemini-seeded per-person purchase limits
- `fraud_flags` — automated + manual fraud detection with full audit notes

---

## Design decisions worth noting

**Why localStorage over IndexedDB for auth sessions**
Supabase's default IndexedDB session storage caused lock conflicts in development when multiple client instances were created across components. Switched to a custom localStorage adapter with a named storage key to eliminate the issue entirely — no more manual cache clearing between restarts.

**Singleton Supabase client**
A single shared client instance exported from `lib/supabase.ts` prevents the "Multiple GoTrueClient instances" warning and ensures consistent auth state across the app.

**Append-only event log**
`request_events` never deletes or updates — every status change, check-in, and note is a new row. This makes disputes easy to resolve and gives a full evidence trail for every transaction. Reviewable years later.

**Crowdsourced data as a moat**
Three append-only tables (`item_prices`, `location_limits`, `request_events`) get more valuable with every completed run. A competitor can copy the UI in a weekend. They can't copy two years of confirmed price data.

**Request expiry via pg_cron**
Rather than handling expiry in the application layer (which would require a running server process), expiry is handled by a pg_cron job directly in Postgres. Every 5 minutes it marks any open request past its `expires_at` as `expired`. This is more reliable than a Node.js cron — it runs even if the app server is down, and it's a single SQL statement with no external dependencies.

**Trust biased toward runners**
The platform auto-confirms delivery after 10 minutes to protect runners from buyers who ghost. Supply-side trust is existential — if runners don't feel protected, there's no marketplace.

**Auth race condition handling**
Supabase auth state fires before database writes complete on signup. `AuthContext.fetchProfile` retries up to 3 times with 800ms delays — the profile row is always ready by the third attempt.

**Hybrid AI + community data for location limits**
Gemini bootstraps purchase limit data for new locations using its training knowledge. Runner confirmations then validate or correct it. The two sources have explicit trust levels in the database (`source: 'gemini'` vs `source: 'runner'`, `confidence: 'low'` vs `confidence: 'high'`) so the app always knows how much to trust any given data point.

---

## Trust & safety

| Attack | Mitigation |
|---|---|
| Runner disappears with money | Stripe escrow — runner never paid until delivery confirmed |
| Fake price inflation | Crowdsourced baseline + 30% outlier detection + explicit confirmation required |
| Buyer claims non-delivery | GPS at delivery address + delivery photo + 10-min auto-confirm |
| New account abuse | First-run cap: max $30 total until 3 clean completions |
| Coordinated fraud | Device fingerprint + mutual transaction pattern flags |

---

## What's next

- [ ] Runner location limit survey — post-run prompt for runners to confirm or correct Gemini-seeded limits
- [ ] Stripe escrow — hold buyer funds at claim, release at completion
- [ ] Messages — in-run chat between buyer and runner
- [ ] Category-specific runner flows — bar/event line holding differs from food pickup
- [ ] React Native app — web is mobile-first but native makes more sense long term

---

## Portfolio context

> *"Ovn taught me how to build a marketplace. Lil Outing taught me how to make one people actually trust."*

| Ovn | Lil Outing |
|---|---|
| Email auth | Supabase Auth + session management |
| Static listings | Real-time 7-state machine |
| No payments | Stripe escrow flow |
| Single role | Dual role, single unified flow |
| No disputes | Full trust & safety system |
| Simple schema | Event sourcing + crowdsourced data pipeline |
| No data strategy | Append-only price DB with fuzzy matching + fraud detection + AI seeding |

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
GEMINI_API_KEY=your_gemini_api_key
```

```bash
npm run dev
```

---

*Built in SF. Named after the thing that makes cities worth living in — the lil outing. The coffee run. The farmers market loop. The standing in line because the croissant is worth it.*