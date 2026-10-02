# Platform storage add-on backend

The current storefront prototype keeps tenant records in browser `localStorage`. The admin UI estimates each store's usage from its `morrow-store-{storeId}-*` keys; this is useful for local development, but it does not provide a real gigabyte quota or shared cloud storage.

For production, store files in server-managed object storage and persist quotas per tenant. The platform admin storage limit and per-GB price must be saved server-side and must not be trusted from browser storage.

The current admin screen stores the configured per-store limit and price in browser storage for this prototype. Production should replace that local write with a platform-admin-only endpoint that saves `{ "limitGb": 10, "pricePerGb": 100 }` for a store and returns the canonical storage configuration. Usage should come from the server's object-storage records, not browser key sizes.

## Purchase endpoint

`POST /api/platform/storage/purchase` accepts:

```json
{ "storeId": "store-id", "additionalGb": 5 }
```

Authenticate the store owner from the server session, confirm that the owner controls `storeId`, validate the allowed package size, load the current price and existing limit from server settings, and collect and verify payment with the platform payment account. Never accept a client-supplied price or new quota. After successful verification, add the purchased capacity and return:

```json
{ "verified": true, "limitGb": 6, "purchasedGb": 5 }
```

On payment failure return a non-2xx status and do not change the quota. Enforce the resulting quota on all server-side upload endpoints.
