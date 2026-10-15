import api from '../../../../api/axios';

const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const amount = value => {
  const number = Number(value);
  return `₹${(Number.isFinite(number) ? number : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getAmount = (...values) => {
  const value = values.find(item => item !== undefined && item !== null && item !== '');
  return Number(value) || 0;
};

function lineItemsFor(order) {
  const rows = Array.isArray(order.products) && order.products.length
    ? order.products
    : Array.isArray(order.details) ? order.details : [];
  if (rows.length) return rows.map(item => {
    const qty = Number(item.qty ?? item.quantity) || 1;
    const total = getAmount(item.total, item.lineTotal, item.amount, Number(item.price ?? item.unitPrice ?? 0) * qty);
    const unit = getAmount(item.unitPrice, item.price, qty ? total / qty : 0);
    return { name: item.name || item.orderName || 'Item', variant: item.variant || item.unit || '', qty, unit, total };
  });

  const total = getAmount(order.itemsTotal, order.billing?.itemsPrice, order.bill?.itemsTotal, order.amount, order.total);
  const qty = Number(order.items) || 1;
  return [{ name: 'Order items', variant: '', qty, unit: total / qty, total }];
}

async function storeInfoFor(order) {
  const existing = order.storeInfo || {};
  if (existing.address && existing.phone && existing.email && (existing.gstin || existing.GSTIN)) return existing;
  try {
    const { data } = await api.get('/stores');
    const match = (Array.isArray(data) ? data : []).find(item =>
      (order.storeId && [item._id, item.storeId].some(id => String(id || '') === String(order.storeId)))
      || (order.store && item.name === order.store)
    );
    if (!match) return existing;
    return {
      ...match,
      ...existing,
      address: existing.address || match.address || match.addressEn || '',
      phone: existing.phone || match.phone || '',
      email: existing.email || match.email || '',
      gstin: existing.gstin || match.gstin || match.GSTIN || '',
    };
  } catch {
    return existing;
  }
}

function invoiceHtml(order, storeInfo) {
  const bill = order.billing || order.bill || {};
  const lines = lineItemsFor(order);
  const itemTotal = getAmount(bill.itemsPrice, bill.itemsTotal, order.itemsTotal, lines.reduce((sum, item) => sum + item.total, 0));
  const subtotal = getAmount(bill.subtotal, bill.itemsTotal, order.subtotal, itemTotal);
  const couponDiscount = getAmount(bill.couponDiscount, bill.discount, order.couponDiscount);
  const deliveryFee = getAmount(bill.deliveryFee, bill.deliveryCharge, order.deliveryCharge);
  const platformFee = getAmount(bill.platformFee, order.platformFee);
  const taxAmount = getAmount(bill.taxAmount, order.taxAmount);
  const taxName = bill.taxName || order.taxName || 'GST';
  const taxPercent = getAmount(bill.taxPercent, order.taxPercent);
  const deliveryTips = getAmount(bill.deliveryTips, bill.deliveryTip, order.deliveryTips, order.deliveryTip);
  const handlingFee = getAmount(bill.handlingFee, order.handlingFee);
  const total = getAmount(order.amount, order.total, bill.total);
  const customerAddress = [order.deliveryAddress || order.address || order.customerAddress, order.area, order.pincode, order.deliveryState]
    .filter(Boolean).join(', ');
  const customerPhone = order.deliveryContact || order.phone || order.customerPhone || '';
  const rider = order.rider || {};
  const partner = order.partnerDelivery || {};
  const vehicleNumber = rider.vehicleNumber || rider.vehicleNo || rider.vehicle_number || rider.vehicle_no || rider.registrationNumber || rider.registrationNo || rider.registration_number || rider.vehicleRegistration || rider.vehicleRegistrationNumber || rider.vehicleRegNo || rider.plateNumber || '';
  const storeAddress = storeInfo.address || storeInfo.addressEn || order.storeAddress || order.storeLocation || '';
  const storePhone = storeInfo.phone || order.storePhone || '';
  const storeEmail = storeInfo.email || order.storeEmail || '';
  const e = escapeHtml;
  const billRow = (label, value, className = '') => `<div class="bill-row ${className}"><span>${e(label)}</span><strong>${e(value)}</strong></div>`;
  const billRows = [
    billRow('Items price', amount(itemTotal)),
    billRow('Subtotal', amount(subtotal)),
    billRow('Coupon discount', `− ${amount(couponDiscount)}`),
    billRow('Delivery fee', amount(deliveryFee)),
    billRow('Platform fee', `+ ${amount(platformFee)}`),
    ...(taxAmount > 0 ? [billRow(`${taxName}${taxPercent ? ` (${taxPercent}%)` : ''}${bill.taxIncluded ? ' (included)' : ''}`, `+ ${amount(taxAmount)}`)] : []),
    billRow('Delivery man tips', `+ ${amount(deliveryTips)}`),
    billRow('Handling fee', `+ ${amount(handlingFee)}`),
  ].join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Order ${e(order.orderNo || order.orderId || '')}</title>
<style>
  *{box-sizing:border-box} body{font-family:Arial,sans-serif;margin:0;padding:28px;color:#0f172a;font-size:13px} .page{max-width:900px;margin:0 auto} header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1d4ed8;padding-bottom:16px;margin-bottom:18px} h1{font-size:22px;margin:0 0 6px} h2{font-size:14px;margin:0 0 12px;color:#1e3a8a}.muted{color:#64748b}.meta{font-size:12px;margin:0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0}.card{border:1px solid #dbe3ee;border-radius:10px;padding:14px}.card p{margin:5px 0;line-height:1.45;overflow-wrap:anywhere}.tag{display:inline-block;border:1px solid #dbe3ee;border-radius:5px;padding:5px 8px;margin:0 5px 5px 0}.items,.bill{width:100%;border-collapse:collapse}.items th,.items td{padding:9px 7px;border-bottom:1px solid #e2e8f0;text-align:left}.items th{background:#f8fafc;color:#475569;font-size:11px;text-transform:uppercase}.items .right{text-align:right}.bill{margin-top:12px}.bill-row{display:flex;justify-content:space-between;gap:20px;padding:6px 0;border-bottom:1px solid #f1f5f9}.bill-row strong{text-align:right}.grand{display:flex;justify-content:space-between;border-top:2px solid #cbd5e1;margin-top:8px;padding-top:12px;font-size:20px;font-weight:700;color:#1d4ed8}.footer{margin-top:24px;border-top:1px solid #e2e8f0;padding-top:10px;color:#64748b;font-size:11px}@media print{body{padding:0}.card{break-inside:avoid}}
</style></head><body><main class="page">
  <header><div><h1>Order #${e(order.orderNo || order.orderId || order._id)}</h1><p class="meta muted">${e(order.orderDate || order.date || order.createdAt || '')} · ${e(order.status || '')}</p></div><div class="tag">${e(order.orderType || order.deliveryType || 'Home Delivery')}</div></header>
  <section class="grid">
    <div class="card"><h2>Store details</h2><p><strong>${e(order.store || storeInfo.name || storeInfo.storeName || 'Store')}</strong></p>${storeAddress ? `<p>${e(storeAddress)}</p>` : '<p class="muted">Address not provided</p>'}${storePhone ? `<p>Phone: ${e(storePhone)}</p>` : ''}${storeEmail ? `<p>Email: ${e(storeEmail)}</p>` : ''}${storeInfo.gstin || storeInfo.GSTIN ? `<p>GSTIN: ${e(storeInfo.gstin || storeInfo.GSTIN)}</p>` : ''}</div>
    <div class="card"><h2>Customer details</h2><p><strong>${e(order.customer || 'Customer')}</strong></p>${customerAddress ? `<p>${e(customerAddress)}</p>` : '<p class="muted">Address not provided</p>'}${customerPhone ? `<p>Phone: ${e(customerPhone)}</p>` : '<p>Phone: Not provided</p>'}${order.customerEmail ? `<p>Email: ${e(order.customerEmail)}</p>` : ''}</div>
  </section>
  <section class="grid">
    <div class="card"><h2>${rider.name ? 'Delivery rider' : partner.providerName ? 'Delivery partner' : 'Delivery rider'}</h2>${rider.name ? `<p><strong>${e(rider.name)}</strong></p><p>Phone: ${e(rider.phone || 'Not provided')}</p><p>Vehicle: ${e(rider.vehicle || 'Not provided')}</p><p>Vehicle number: ${e(vehicleNumber || 'Not provided')}</p>` : partner.providerName ? `<p><strong>${e(partner.providerName)}</strong></p><p>Booking reference: ${e(partner.bookingReference || 'Not provided')}</p>${partner.courierName ? `<p>Courier: ${e(partner.courierName)}</p>` : ''}${partner.courierPhone ? `<p>Phone: ${e(partner.courierPhone)}</p>` : ''}${partner.trackingUrl ? `<p>Tracking: ${e(partner.trackingUrl)}</p>` : ''}` : '<p class="muted">Rider not assigned</p>'}</div>
    <div class="card"><h2>Payment details</h2><p>Method: <strong>${e(order.paymentMethod || order.payment || 'Not provided')}</strong></p><p>Status: <strong>${e(order.paymentStatus || 'Unpaid')}</strong></p><p>Delivery: ${e(order.deliveryType || order.orderType || 'Home Delivery')}</p></div>
  </section>
  <section class="card"><h2>Order items</h2><table class="items"><thead><tr><th>Item</th><th>Variant</th><th>Qty</th><th class="right">Unit price</th><th class="right">Amount</th></tr></thead><tbody>${lines.map(item => `<tr><td>${e(item.name)}</td><td>${e(item.variant || '—')}</td><td>${e(item.qty)}</td><td class="right">${e(amount(item.unit))}</td><td class="right">${e(amount(item.total))}</td></tr>`).join('')}</tbody></table>
    <div class="bill">${billRows}<div class="grand"><span>Total</span><span>${e(amount(total))}</span></div></div></section>
  <p class="footer">Thank you for your order.</p>
  <script>window.onload=function(){setTimeout(function(){window.print();},200);}</script>
</main></body></html>`;
}

export async function printOrderInvoice(order) {
  const win = window.open('', '_blank', 'width=900,height=900');
  if (!win) return alert('Popups allow karein print ke liye');
  win.document.write('<!doctype html><title>Preparing invoice…</title><p style="font:14px Arial;padding:24px">Invoice prepare ho raha hai…</p>');
  win.document.close();

  const storeInfo = await storeInfoFor(order);
  win.document.open();
  win.document.write(invoiceHtml(order, storeInfo));
  win.document.close();
}
