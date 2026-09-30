# CryptoSentry

Real-time crypto alerts: watch X accounts for keywords (official X filtered stream), price targets
on Binance, and get notified on Telegram, Discord, email or SMS.

## Stack

- Next.js 16 (App Router, Node runtime) with long-running background workers in `src/instrumentation.ts`
- Better Auth (email/password + Google) on Postgres
- Supabase (Postgres + PostgREST) accessed server-side with the service role key
- X API v2 filtered stream (pay-per-use), Binance REST + WebSocket, Telegram Bot API
- Optional: OpenAI for tweet sentiment, Resend for email, Telnyx for SMS

## How the social pipeline works (and what it costs)

1. Active social alerts are turned into X stream rules, one per watched account:
   `from:handle (kw1 OR "two words") -is:retweet -is:reply -is:quote`.
   Keywords of every user watching the same account are merged into one rule.
2. X pushes only the posts matching a rule. Each delivered post is billed by X (about $0.005).
   We request `created_at` and `referenced_tweets` only, no user expansions.
3. The pipeline claims the tweet id in `processed_tweets` (survives restarts, no double notify),
   matches per alert with word-boundary keyword matching, runs optional AI sentiment, notifies.
4. Cost locks: plan limits (`src/lib/config/plan-limits.ts`) cap watched accounts, keywords per
   alert, replies opt-in and monthly matched tweets per user; `X_STREAM_MONTHLY_POST_CAP` is a
   global kill switch; `X_STREAM_MAX_RULES` stays under the 1000-rule pay-per-use limit.

Price alerts are evaluated by a single server worker (`src/lib/services/price/price-alert-worker.ts`)
fed by one Binance WebSocket; dashboards subscribe to it over SSE (`/api/alerts/stream`).

## Setup

1. `cp .env.example .env` and fill in the values. Never commit `.env`.
2. `npm install`
3. Create the auth tables first, then the app tables:
   ```bash
   npx @better-auth/cli migrate
   npx supabase migration up
   ```
4. Register the Telegram webhook (needs a public https URL and `TELEGRAM_WEBHOOK_SECRET`):
   ```bash
   npm run telegram:webhook -- https://your-domain.com
   ```
5. `npm run dev`

The X stream and the price worker start with the server. They need a persistent Node process
(one X connection per project), not a serverless deployment.

## Scripts

| Command                             | Purpose                                                          |
| ----------------------------------- | ---------------------------------------------------------------- |
| `npm run dev` / `build` / `start`   | Next.js                                                          |
| `npm test`                          | Pure matching / rule-building tests (`scripts/test-pipeline.ts`) |
| `npm run type-check`                | `tsc --noEmit`                                                   |
| `npm run lint`                      | oxlint                                                           |
| `npm run telegram:webhook -- <url>` | Register the Telegram webhook (`--info` to inspect)              |

In development, `POST /api/ingest/tweets` lets you push fake tweets through the pipeline without X
(disabled in production).

## Plans

|                         | Free     | Pro | Premium |
| ----------------------- | -------- | --- | ------- |
| Alerts (social + price) | 2        | 10  | 50      |
| X accounts watched      | 1        | 5   | 25      |
| Keywords per alert      | 3        | 10  | 20      |
| Matched tweets / month  | 40       | 500 | 3000    |
| Replies and quotes      | no       | no  | yes     |
| Channels                | Telegram | all | all     |
| REST API                | no       | no  | yes     |

Limits live in `src/lib/config/plan-limits.ts` and are enforced server-side.
