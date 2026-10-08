# WEPZO Marketing connection

## Local run order

1. Start the shared Wepzo backend from `Backend` with `npm run dev` (API: `http://localhost:5000`). Marketing users, assignments, and content are saved in the backend's existing data store.
2. Start the Wepzo Admin app from `Admin` with `npm run dev` (admin: `http://localhost:3000`). Sign in with a Main Admin account and select **Web → Marketing** in the module switcher.
3. Create a user account for the Marketing module. You can register at `http://localhost:3001/#/register`, or use Wepzo Admin's existing registration flow and choose **Marketing** as the website module.
4. In Admin, open **Marketing** and add content. Select the Marketing user, platform, post/reel type, caption, release date, and suggested publish time. Admin-created content is assigned to that user.
5. Open `http://localhost:3001/#/login` or use **Open Marketing Workspace** from the Marketing user's Wepzo website dashboard. Sign in with the same Wepzo account. The workspace loads only the content assigned to that user.

## Connection details

- Marketing login and registration use the shared `POST /api/auth/login` and `POST /api/auth/register` endpoints with the `marketing` website module.
- The Admin Marketing page uses `GET /api/marketing/users`, `GET/POST /api/marketing/content`, and `PUT/DELETE /api/marketing/content/:id`.
- The user workspace uses `GET /api/marketing/content` and `PUT /api/marketing/content/:id`. The backend checks the signed-in user's role and account ID before returning or changing assigned content.
- Content is persisted in `Backend/data/wepzo-store.json` through the existing memory-store persistence layer.
- Set `VITE_MARKETING_APP_URL` in the Admin build when the Marketing app is hosted somewhere other than `http://localhost:3001/`.

OAuth account linking, real-time Meta/Google Ads data, payment checkout, and scheduled social publishing still need their platform credentials and server integrations. Until those are configured, the workspace shows connection requirements and does not claim posts were published.
