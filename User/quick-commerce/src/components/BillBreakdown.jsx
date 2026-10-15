import { formatMoney, useSiteSettings } from '../store/siteSettings';

export default function BillBreakdown({ quote, items }) {
  const business = useSiteSettings(s => s.business);
  if (!quote) return null;
  const itemsPrice = items?.reduce((total, item) => {
    const price = Number(item.price) || 0;
    const mrp = Math.max(Number(item.mrp) || price, price);
    return total + mrp * (Number(item.qty) || 1);
  }, 0) ?? (Number(quote.itemsTotal) || 0);
  const productDiscount = Math.max(0, itemsPrice - (Number(quote.itemsTotal) || 0));
  const freeDelivery = quote.freeDelivery || Number(quote.deliveryCharge) === 0;
  return (
    <dl className="text-sm space-y-1.5 text-slate-600">
      {items?.map(i => (
        <div key={i.id || i.name} className="flex justify-between">
          <dt>{i.name} × {i.qty}</dt>
          <dd>{formatMoney(i.price * i.qty, business)}</dd>
        </div>
      ))}
      <div className="flex justify-between border-t pt-2"><dt>Items price</dt><dd>{formatMoney(itemsPrice, business)}</dd></div>
      {productDiscount > 0 && (
        <div className="flex justify-between text-emerald-600"><dt>Product discount</dt><dd>− {formatMoney(productDiscount, business)}</dd></div>
      )}
      <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(quote.itemsTotal, business)}</dd></div>
      {quote.couponDiscount > 0 && (
        <div className="flex justify-between text-emerald-600"><dt>Coupon discount</dt><dd>− {formatMoney(quote.couponDiscount, business)}</dd></div>
      )}
      <div className="flex justify-between">
        <dt>Delivery{quote.zone?.name ? ` · ${quote.zone.name}` : ''}{quote.distanceKm != null ? ` · ${quote.distanceKm} km` : ''}</dt>
        <dd className={freeDelivery ? 'font-medium text-emerald-600' : ''}>{freeDelivery ? 'FREE' : formatMoney(quote.deliveryCharge, business)}</dd>
      </div>
      {quote.searchCharge > 0 && (
        <div className="flex justify-between"><dt>Search Charge{quote.searchNote ? ` · ${quote.searchNote}` : ''}</dt><dd>{formatMoney(quote.searchCharge, business)}</dd></div>
      )}
      <div className="flex justify-between"><dt>Platform Fee</dt><dd>{formatMoney(quote.platformFee, business)}</dd></div>
      {quote.taxAmount > 0 && (
        <div className="flex justify-between">
          <dt>{quote.taxName || 'GST'}{quote.taxPercent ? ` (${quote.taxPercent}%)` : ''}{quote.taxIncluded ? ' (included)' : ''}</dt>
          <dd>{formatMoney(quote.taxAmount, business)}</dd>
        </div>
      )}
      {!quote.deliverable && quote.message && <p className="text-xs text-rose-600 pt-1">{quote.message}</p>}
      <div className="flex justify-between font-bold text-slate-900 text-lg pt-2 border-t"><dt>Total Amount</dt><dd>{formatMoney(quote.total, business)}</dd></div>
    </dl>
  );
}
