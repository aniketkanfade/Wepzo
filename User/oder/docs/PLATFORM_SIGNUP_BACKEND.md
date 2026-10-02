# Store subscription backend contract

The unified `/admin` portal includes a main-admin-only Subscriptions section. Its displayed monthly fee currently saves in this browser only; production must save the canonical amount in platform server settings and must never trust a price supplied by the browser. This repository currently contains only the Vite frontend, so the endpoints below must be implemented before subscription payments, account login, or subdomain provisioning can complete.

## Configuration

Set `VITE_PLATFORM_RAZORPAY_KEY_ID` to the platform's public Razorpay Key ID. Keep the matching Key Secret on the server. Do not use an individual store's payment gateway for this subscription: the store does not exist yet.

## Endpoints

- `POST /api/platform/signup/subscription` receives `storeName`, `ownerName`, `email`, `plan: "monthly"`, and `currency: "INR"`. Read the current price from server settings and create a Razorpay monthly subscription using the server-managed plan. Return `{ "subscriptionId": "sub_..." }`.
- `POST /api/platform/signup/complete` receives the signup fields and Razorpay Checkout result. Verify the payment signature and active subscription on the server, then create the owner, store, and tenant record. Provision the unique subdomain and return `{ "verified": true, "owner": { "name": "...", "email": "..." }, "store": { "id": "...", "name": "...", "subdomain": "my-store.example.com" }, "token": "..." }` only after the server confirms the payment.
- `POST /api/platform/login` verifies the owner credentials and returns `{ "owner": { "name": "...", "email": "...", "storeId": "...", "subdomain": "my-store.example.com" }, "token": "..." }`.
- `POST /api/platform/subscription/renewal` receives `{ "storeId": "...", "planId": "1m|3m|6m|12m" }`. The server must load the canonical plan price, collect and verify the platform payment, extend the store's existing expiry date, and return `{ "verified": true, "expiresAt": "ISO-8601 date" }`. Never accept a client supplied price or expiry date.

The admin UI currently saves the four renewal plan prices in this browser. Move those plan settings to the platform server before using multiple devices or accepting live payments. Until the renewal endpoint is implemented, the Recharge button reports that payment setup is unavailable and will not extend the plan.

The server also needs Razorpay webhook handling for subscription renewals and failures, a database that scopes products/settings/orders by `storeId`, and wildcard DNS plus host-based tenant routing for subdomains. The browser-side store-specific local storage is a development convenience; it is not shared between devices and is not a replacement for server-side tenant storage.
