# Trading App — Expo MVP starter

A dark-mode iPhone starter for a personal market watchlist. The first version supports adding/removing tickers and securely saving them to Supabase. It deliberately shows **no stock prices or AI signals yet**: those will be connected only after confirming your market-data provider and its plan. Nothing in this app places trades.

## What you need

- An iPhone with Expo Go installed.
- Node.js LTS on a computer.
- Your Supabase project.
- Your market-data provider's name (for example, Alpha Vantage, Finnhub, Polygon, or Twelve Data). Do not send API keys in chat or commit them to GitHub.

The starter uses the Supabase free tier and Expo Go; it does not add a paid API or service. Provider pricing and free-tier limits vary, so we will check your exact provider and plan before integrating it. Supabase/Expo terms can change; check their official pricing pages before deployment.

## Setup for a beginner

1. Install Node.js LTS from https://nodejs.org/.
2. Download this repository from GitHub (Code > Download ZIP), unzip it, then open a Terminal (Mac) or PowerShell (Windows) in the `Trading-App` folder.
3. Run `npm install`.
4. Copy `.env.example` to a new file named `.env` in the project root. Keep `.env` private; it is ignored by Git.
5. In Supabase, open **Project Settings > API** (or **Data API** in the newer dashboard). Copy the **Project URL** into `EXPO_PUBLIC_SUPABASE_URL`. Copy the **anon/public** or **publishable** key into `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Never use the `service_role` or secret key in this app.
6. In Supabase, open **Authentication > Sign In / Providers** and enable **Anonymous Sign-Ins**. This starter uses an anonymous account to isolate your watchlist. Add email login before using it as a long-term personal data store.
7. In Supabase, open **SQL Editor > New query**, paste the contents of `supabase/schema.sql`, and click **Run**. This creates a watchlist table with row-level security.
8. Restart Expo after editing `.env`: run `npx expo start`. Scan the QR code using Expo Go on your iPhone (same Wi-Fi network; tunnel mode is available with `npx expo start --tunnel`).

If you have not configured Supabase yet, the app still lets you try adding tickers in memory, but they disappear when it restarts. It does not show fake quotes.

## Market data and secrets

Please tell me the provider's exact name and the plan/tier shown in your provider dashboard. I can check its available exchanges, delayed/real-time coverage, CAD/USD support, usage limits, and cost before implementation. The provider API key must be stored as a **Supabase Edge Function secret** (server-side), not in `.env` or the iPhone app. Expo `EXPO_PUBLIC_` variables are bundled into the app and are not appropriate for secrets.

## Current limitations

- Watchlist persistence via Supabase (after setup); local in-memory fallback otherwise.
- No quotes, charts, AI-generated recommendations, portfolio, or notifications yet. The interface must not be interpreted as investment advice.
- Push notifications on iPhone usually require a physical device and later Expo/EAS/Apple configuration; Expo Go has platform and SDK limitations. We will confirm the current Expo setup before adding them.

## Useful commands

- `npm install` — install project dependencies.
- `npx expo start` — start the app and show its QR code.
- `npx expo start --tunnel` — try this if your iPhone cannot reach your computer over Wi-Fi.
- `npm run typecheck` — check TypeScript types.
