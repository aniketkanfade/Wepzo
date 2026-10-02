export function printOrderInvoice(order) {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Order ${order.orderNo}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 8px 0; border-bottom: 1px solid #eee; }
  .label { color: #888; width: 140px; }
  .amount { font-size: 20px; font-weight: bold; color: #2563eb; margin-top: 16px; }
</style></head><body>
  <h1>Order #${order.orderNo || order.orderId}</h1>
  <p class="meta">${order.orderDate || order.date} · ${order.status}</p>
  <table>
    <tr><td class="label">Customer</td><td>${order.customer}</td></tr>
    <tr><td class="label">Phone</td><td>${order.phone || '—'}</td></tr>
    <tr><td class="label">Store</td><td>${order.store}</td></tr>
    <tr><td class="label">Items</td><td>${order.items}</td></tr>
    <tr><td class="label">Payment</td><td>${order.payment} (${order.paymentStatus || '—'})</td></tr>
    <tr><td class="label">Delivery</td><td>${order.deliveryType || 'Home Delivery'}</td></tr>
  </table>
  <p class="amount">₹ ${(order.amount || 0).toLocaleString('en-IN')}</p>
  <script>window.onload=function(){setTimeout(function(){window.print();},200);}</script>
</body></html>`;
  const win = window.open('', '_blank', 'width=700,height=800');
  if (!win) return alert('Popups allow karein print ke liye');
  win.document.write(html);
  win.document.close();
}
