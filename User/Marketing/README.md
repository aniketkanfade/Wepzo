# WEPZO Marketing connection

## Local run order

1. Start the Marketing app with `npm run dev`. Local `/api` and `/uploads` requests use the same WEPZO backend as the deployed apps, so users, assignments, and content share one data source.
2. No separate backend or API proxy target is needed for normal local use.
3. Start the Wepzo Admin app from `Admin` with `npm run dev` (admin: `http://localhost:3000`). Sign in with a Main Admin account and select **Web → Marketing** in the module switcher.
4. Create a user account for the Marketing module. You can register at `http://localhost:3001/#/register`, or use Wepzo Admin's existing registration flow and choose **Marketing** as the website module.
5. In Admin, open **Marketing** and add content. Select the Marketing user, platform, post/reel type, caption, release date, and suggested publish time. Admin-created content is assigned to that user.
6. Open `http://localhost:3001/#/login` or use **Open Marketing Workspace** from the Marketing user's Wepzo website dashboard. Sign in with the same Wepzo account. The workspace loads only the content assigned to that user.

## Connection details

- Marketing login and registration use the shared `POST /api/auth/login` and `POST /api/auth/register` endpoints with the `marketing` website module.
- The Admin Marketing page uses `GET /api/marketing/users`, `GET/POST /api/marketing/content`, and `PUT/DELETE /api/marketing/content/:id`.
- The user workspace uses `GET /api/marketing/content` and `PUT /api/marketing/content/:id`. The backend checks the signed-in user's role and account ID before returning or changing assigned content.
- Content is persisted by the shared backend data store and appears in both local previews and published sites.
- Set `VITE_MARKETING_APP_URL` in the Admin build when the Marketing app is hosted somewhere other than `http://localhost:3001/`.

OAuth account linking, real-time Meta/Google Ads data, payment checkout, and scheduled social publishing still need their platform credentials and server integrations. Until those are configured, the workspace shows connection requirements and does not claim posts were published.
