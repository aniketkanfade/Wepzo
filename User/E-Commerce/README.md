# Wepzo E-Commerce storefront

Responsive customer storefront for Wepzo websites. The app uses the existing Backend public shop APIs for catalogue data, customer sessions, delivery quotes and orders.

## Run locally

```powershell
cd User/E-Commerce
npm install
npm run dev
```

The storefront calls its same-origin `/api` endpoint. Local development proxies `/api` and `/uploads` to the same WEPZO backend used by every Vercel storefront, so admin updates and customer pages read the same server data. Set up a published website and launch the storefront with its tenant ID:

```text
http://localhost:5173/?websiteId=YOUR_WEBSITE_ID
```

Without a `websiteId`, local development previews the main E-Commerce site at `wepzo.in`. To preview a tenant site, add its ID to the URL as shown above. Optionally add `&moduleId=YOUR_WEBSITE_MODULE_ID` to check the module assignment too. The storefront sends the selected website ID as `X-Website-Id` on shop API requests. A matching custom domain can also be resolved by the backend. Set `VITE_WEBSITE_HOST` only when you need local development to preview a different published domain.

## Environment variables

Local and production builds use the same `/api` path. Vercel and local Vite proxies route it to the shared backend at `https://wepzo.onrender.com`; tenant identity still comes from the website ID or published domain. For a fixed local storefront, set the website ID in `.env.local`.

## Connected backend routes

- `GET /api/shop/home` and `GET /api/shop/products`
- `POST /api/shop/quote`
- `POST /api/shop/auth/register` and `/api/shop/auth/login`
- `POST /api/shop/orders`

The backend scopes catalog, customer accounts and orders by website ID. E-commerce records are selected using that website's assigned module slug, separately from quick-commerce records.

Styling uses Tailwind CSS v4 through the Vite plugin, with storefront-specific CSS for the custom hero and product artwork.
