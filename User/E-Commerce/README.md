# Wepzo E-Commerce storefront

Responsive customer storefront for Wepzo websites. The app uses the existing Backend public shop APIs for catalogue data, customer sessions, delivery quotes and orders.

## Run locally

```powershell
cd User/E-Commerce
npm install
npm run dev
```

The storefront calls its same-origin `/api` endpoint. For local development, configure `VITE_API_PROXY_TARGET` in `.env.local` (copy `.env.example`) to point to the backend. Set up a published website and launch the storefront with its tenant ID:

```text
http://localhost:5173/?websiteId=YOUR_WEBSITE_ID
```

Optionally add `&moduleId=YOUR_WEBSITE_MODULE_ID` to check the module assignment too. The storefront persists the selected website ID in local storage and sends it as `X-Website-Id` on shop API requests. A matching custom domain can also be resolved by the backend.

## Environment variables

Production builds use the same-origin `/api` URL configured in `.env.production`; Vercel proxies those requests to the Render backend. For local development, copy `.env.example` to `.env.local` and set the website ID for a fixed storefront. `VITE_E_COMMERCE_API_URL` chooses this module's API, with `VITE_API_URL` as the shared fallback. `VITE_API_PROXY_TARGET` can proxy `/api` to a backend origin when needed.

## Connected backend routes

- `GET /api/shop/home` and `GET /api/shop/products`
- `POST /api/shop/quote`
- `POST /api/shop/auth/register` and `/api/shop/auth/login`
- `POST /api/shop/orders`

The backend scopes catalog, customer accounts and orders by website ID. E-commerce records are selected using that website's assigned module slug, separately from quick-commerce records.

Styling uses Tailwind CSS v4 through the Vite plugin, with storefront-specific CSS for the custom hero and product artwork.
