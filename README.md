# Trading App — Expo iPhone MVP

This MVP provides a dark-mode watchlist, Supabase persistence, and quotes requested from Twelve Data through a Supabase Edge Function. The Twelve Data API key stays server-side. It does not generate trading recommendations, use simulated prices, or place trades.

## Costs and data limitations

- **Expo Go:** free to use for local development/testing. Expo has paid build/deployment offerings, but this starter does not require them.
- **Supabase:** this starter can use the Free plan. Check the current limits and pricing at https://supabase.com/pricing; quotas and terms can change.
- **Twelve Data:** the Basic/free tier is $0, with limited API credits and a daily cap. Current pricing and which US/Canadian exchange data is included can change and depends on exchange entitlements. See https://twelvedata.com/pricing and https://twelvedata.com/stocks. As of the current pricing lookup, the free tier was reported as 8 credits/minute and 800/day, with US stocks/ETFs available and Canadian coverage limited to trial/EOD. Verify this in your account before relying on any symbol. One quote consumes credits per symbol, so keep the watchlist small and refresh sparingly. Do not upgrade or enable a paid plan without checking the listed price first.
- **Quotes may be delayed or unavailable.** The app displays only the provider's returned price and currency. It does not claim that a quote is real-time. Confirm exchange entitlements and timestamps in your Twelve Data dashboard.

## What you need

- iPhone with Expo Go installed.
- A computer with Node.js LTS.
- Your Supabase project and a Twelve Data account.

## Connect Supabase (beginner steps)

1. In GitHub, open this repository and choose **Code > Download ZIP**. Unzip it. Install Node.js LTS from https://nodejs.org/.
2. Open Terminal (Mac) or PowerShell (Windows) in the unzipped `Trading-App` folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env` in the project root. On macOS/Linux: `cp .env.example .env`; on Windows PowerShell: `Copy-Item .env.example .env`.
5. In your Supabase dashboard, open **Project Settings > API Keys** (or **Settings > API**). Copy **Project URL** into `EXPO_PUBLIC_SUPABASE_URL`, and your **publishable** (`sb_publishable_...`) key into `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The project's URL is the `https://<project-ref>.supabase.co` address shown on that settings page. The publishable key is meant to be used in a client app; it is not the secret/service-role key. Still, keep all private keys out of GitHub and never use `sb_secret_...` or `service_role` in this app.
6. In Supabase, go to **Authentication > Sign In / Providers** and enable **Anonymous Sign-Ins**. This creates a private anonymous user on first launch.
7. In **SQL Editor > New query**, paste `supabase/schema.sql` and click **Run**. The table uses Row Level Security so each anonymous user can access only its own rows.

## Connect Twelve Data securely

1. Sign in at https://twelvedata.com/ and open the dashboard/API key section. Create or copy your API key. Do not paste it into chat, the Expo app, `.env`, or GitHub.
2. Install the Supabase CLI by following https://supabase.com/docs/guides/cli, then open a terminal in the project folder and sign in: `npx supabase login`.
3. Link this local folder to the project shown in your Supabase URL: `npx supabase link --project-ref YOUR_PROJECT_REF` (replace the placeholder with the short project reference in the URL).
4. Store the provider key as a server-side function secret: `npx supabase secrets set TWELVE_DATA_API_KEY=YOUR_TWELVE_DATA_KEY`.
5. Deploy the quote function: `npx supabase functions deploy quotes`.
6. Verify Supabase Edge Functions are available on your plan. The app sends only the ticker list to this function; the function calls Twelve Data and sends back quote fields. The provider key never ships in the iPhone app.
7. To test, enter a ticker and pull down on the watchlist to refresh. Use the ticker format Twelve Data supports for the exchange (the exact Canadian notation may differ by listing). No quote or currency is invented when a ticker cannot be resolved.

## Start on iPhone with Expo Go

1. In the project folder, run `npx expo start`.
2. Scan the QR code using the Camera app on your iPhone, then choose to open it in Expo Go. Keep the computer and phone on the same Wi-Fi; if needed, stop Expo and run `npx expo start --tunnel`.
3. If you edit `.env`, stop and restart Expo so it reads the new values. The QR preview is for testing; it is not a public hosted app link.

## Included / not included yet

- Included: add/remove stock/ETF tickers, per-user Supabase watchlist, manual quote refresh, currency from the provider, graceful handling when quotes are missing.
- Not included: automatic market-hour monitoring, Canadian real-time entitlement, charts, portfolio, alerts, push notifications, news, fundamentals, AI signals, or backtesting. These should only be added after data availability, costs, and validation are understood. This MVP makes no recommendation and executes no trades.
- Anonymous accounts are device/session-specific and aren't a substitute for recoverable login. Add email authentication before treating the watchlist as durable across reinstalls/devices.

## Commands

- `npm install` — install dependencies.
- `npx expo start` — start Expo Go preview.
- `npx supabase functions deploy quotes` — deploy server-side quote function.
- `npm run typecheck` — check TypeScript types.
