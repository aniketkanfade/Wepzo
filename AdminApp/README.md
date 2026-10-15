# Wepzo Admin Mobile

React Native (Expo) mobile foundation for the Wepzo admin panel. It reuses the
web admin's `/auth/login`, `/website-modules`, and `/dashboard` APIs and keeps
the signed-in user and token in native secure storage.

## Run

```bash
npm install
npm start
```

Use the Expo terminal shortcuts to open the app in an Android emulator or iOS
simulator. The default API URL is `http://10.0.2.2:5000/api` on Android
emulators and `http://localhost:5000/api` on iOS simulators.

For a physical device:

1. Start the backend from `Backend/` with `npm start`.
2. Find the computer's Wi-Fi IPv4 address with `ipconfig` (for example,
   `192.168.1.20`); do not use `localhost` or `10.0.2.2` on a physical phone.
3. Connect the phone and computer to the same Wi-Fi and allow Node.js through
   Windows Firewall on private networks.
4. In the app login screen, enter
   `http://<computer-ipv4>:5000/api` under **Backend server address**, then tap
   **Test server connection**. A successful test should say “WEPZO API is
   running”; the saved address is reused on later launches.

You can instead copy `.env.example` to `.env`, replace the example IP in
`EXPO_PUBLIC_API_URL`, and rebuild the app. Android permits HTTP for this
development setup; use HTTPS for a production/public server. Optional
module-specific API URLs can also be configured in `.env`.

## Included

- Native login using the existing admin credentials.
- Native Admin account registration using the backend authentication API.
- Dashboard cards, period selection, sales totals, recent orders, and pull to
  refresh, backed by `/dashboard`.
- A native side navigation panel for dashboard, orders, products, stores,
  customers, settings, and account. Workspace switching is shown only to
  `main_admin`.
- Native order detail and store detail flows, including store products,
  orders, and settings tabs.
- Native order status updates, store request approval/rejection, and customer
  block/unblock actions.
- Product catalog and stock browsing.
- Workspace selection backed by `/website-modules`, with the same five default
  admin workspaces used by the web admin when the API has no module record.
- Profile, role/workspace details, and sign out.

This is the first native conversion phase, not full feature parity with the
web admin yet. Promotions, categories, delivery tools, reports, and full
business settings need their own React Native screens and will be added in
later phases. The mobile app uses the backend directly; the Admin web app does
not need to be running.
