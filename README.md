# WEPZO Platform

Multi-tenant website builder platform with admin panel, role-based access control, component pricing, and live website designer.

## Project Structure

```
Wepzo/
├── Admin/          # React.js Admin Panel (Port 3000)
├── Backend/        # Node.js API Server (Port 5000)
├── User/           # User-facing app (future)
└── Delivery Patnr/ # Delivery partner app (future)
```

## Features

### Main Admin
- Full control over components, pricing, plans, roles & access
- Manage stores, users, and subdomain permissions
- Create website components with individual pricing (e.g., Header = ₹200)

### Website Designer
- Click **"Design Website"** in header to open builder sidebar
- Select module type: E-Commerce, Marketing, or General
- Add components with live preview on admin screen
- Running total amount calculation
- Domain options: Subdomain (₹500), Custom Domain (₹2000), or ZIP Export (Free)
- Download complete website as ZIP file

### Role-Based Access
- **Main Admin** - Full access to everything
- **Store Admin** - Products, orders, website design
- **Subdomain User** - Dashboard & website design only
- **Employee** - Products & orders only

## Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Backend

```bash
cd Backend
npm install
npm run migrate:memory-to-mongodb  # One-time: merge the existing JSON state into MongoDB
npm run dev     # Starts on http://localhost:5000
```

Set `MONGODB_URI` in `Backend/.env` before migration or startup. The backend now requires MongoDB and loads application state from the `wepzo_app_state` collection; it no longer reads or writes `Backend/data/wepzo-store.json`. The migration preserves existing MongoDB records when IDs conflict and adds local-only records. Keep the ignored JSON file as a local backup until the migration is verified.

**Default Admin Login:**
- Email: `admin@wepzo.com`
- Password: `admin123`

### Admin Panel

```bash
cd Admin
npm install
npm run dev     # Starts on http://localhost:3000
```

For production, the Admin uses the shared Render API URL from `Admin/.env.production`. Copy `Admin/.env.example` to `Admin/.env.local` to override it for local development. Optional module-specific variables override the shared API URL.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/components | List components |
| POST | /api/components | Create component (admin) |
| GET | /api/modules | List website modules |
| GET | /api/plans | List plans |
| POST | /api/websites | Create website project |
| POST | /api/websites/:id/components | Add component to website |
| POST | /api/websites/:id/domain | Setup domain |
| POST | /api/websites/:id/publish | Publish website |
| GET | /api/export/:id/zip | Download website ZIP |
| GET | /api/roles | List roles (admin) |
| GET | /api/access | List access sections |

## Website Module APIs and Data

The Admin selects an API URL from the active website module. By default, all modules use the existing `/api` server and module data is scoped by `X-Website-Module`. Set any of these Admin build variables to route a module to its own API server; each value must include `/api`:

| Module | Variable |
|---|---|
| Quick Commerce | `VITE_QUICK_COMMERCE_API_URL` |
| E-Commerce | `VITE_E_COMMERCE_API_URL` |
| Store Singlepage Web | `VITE_STORE_SINGLE_API_URL` |
| Marketing | `VITE_MARKETING_API_URL` |
| Information Web | `VITE_INFORMATION_WEB_API_URL` |

Use `VITE_API_URL` as the shared fallback URL. Separate Backend instances can still be scoped with a unique `PORT` and matching `WEBSITE_MODULE`; every instance now requires `MONGODB_URI` and persists shared application state in MongoDB. `WEBSITE_MODULE` locks the API to its module even if the client sends another module header. Use the same MongoDB database when instances should share data, or separate database URIs to isolate them.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Zustand, Recharts
- **Backend:** Node.js, Express, MongoDB, JWT Auth
- **Export:** Archiver (ZIP generation)
