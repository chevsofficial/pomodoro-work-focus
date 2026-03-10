# Pomodoro Focus

This project is a React Native + Expo application bootstrap that provides:

- TypeScript configuration
- Bottom tab navigation with React Navigation
- Zustand state management boilerplate
- Shared theme tokens for colors and spacing

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run start
   ```

3. Run the app on your preferred platform:

   ```bash
   npm run ios
   npm run android
   npm run web
   ```

Each tab currently renders placeholder content and is ready for further development.

## Web + Stripe (TomoFlow.app /app)

This app now supports web export (`npx expo export -p web`) and can be deployed under `/app` on `www.tomoflow.app`.

### Auth + feature gating

- Pomodoro timer is available without auth.
- Tasks and Analytics require a signed-in Supabase account.
- Pro entitlement on web is resolved from Supabase (`subscriptions` table first, then `profiles.is_pro` fallback).

### Stripe placeholders (required env)

Set these in local env / Vercel project settings:

- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder`
- `EXPO_PUBLIC_STRIPE_PRICE_ID=price_placeholder`
- `EXPO_PUBLIC_STRIPE_SUCCESS_URL=https://www.tomoflow.app/paywall?checkout=success`
- `EXPO_PUBLIC_STRIPE_CANCEL_URL=https://www.tomoflow.app/paywall?checkout=cancel`
- `EXPO_PUBLIC_STRIPE_CHECKOUT_API_URL=https://www.tomoflow.app/api/stripe/checkout`
- `STRIPE_SECRET_KEY=sk_test_placeholder`
- `STRIPE_WEBHOOK_SECRET=whsec_placeholder`

Checkout is initiated from Paywall on web via `/api/stripe/checkout`.

## Release checklist

- Increment `expo.ios.buildNumber` and `expo.android.versionCode` in `app.json` before every App Store or Play Store submission.
