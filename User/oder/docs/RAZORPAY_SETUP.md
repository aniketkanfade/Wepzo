# Razorpay checkout configuration

The admin payment settings form stores the Razorpay Key ID and the URLs for the store's create-order and verify-payment API routes. The browser never stores a Razorpay Key Secret.

## Create-order API

The checkout sends a `POST` request to the configured create-order URL with this JSON body:

```json
{
  "amount": 50000,
  "currency": "INR",
  "items": [{ "id": 1, "name": "Everyday Tote", "quantity": 1, "price": 4598 }]
}
```

`amount` is in paise. The server must validate/recalculate the cart total using its own trusted product data, create a Razorpay order using its server-side Key Secret, and return the Razorpay order object (at minimum `id`, `amount`, and `currency`). Do not trust the amount or prices sent by the browser.

## Verify-payment API

After Razorpay Checkout succeeds, the browser sends the Checkout response fields plus the original server-created `order_id` to the configured verify-payment URL. The server must verify the Razorpay signature using its Key Secret and return `{ "verified": true }` only when the signature and payment are valid. Otherwise return an error response.

Keep the Key Secret in the server environment or secret manager. Never put it in the admin form, browser storage, or frontend bundle. Razorpay requires server-side order creation and signature verification; see the [official integration guide](https://razorpay.com/docs/payments/payment-gateway/react-native-integration/standard/build-integration-ios/?preferred-country=US).
