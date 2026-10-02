import { formatMoney, useSiteSettings } from '../store/siteSettings';

export default function BillBreakdown({ quote, items }) {
  const business = useSiteSettings(s => s.business);
  if (!quote) return null;
  return (
    <dl className="text-sm space-y-1.5 text-slate-600">
      {items?.map(i => (
        <div key={i.id || i.name} className="flex justify-between">
          <dt>{i.name} × {i.qty}</dt>
          <dd>{formatMoney(i.price * i.qty, business)}</dd>
        </div>
      ))}
      <div className="flex justify-between border-t pt-2"><dt>Items Total</dt><dd>{formatMoney(quote.itemsTotal, business)}</dd></div>
      <div className="flex justify-between">
        <dt>Delivery{quote.zone?.name ? ` · ${quote.zone.name}` : ''}{quote.distanceKm != null ? ` · ${quote.distanceKm} km` : ''}</dt>
        <dd>{quote.freeDelivery || !quote.deliveryCharge ? 'FREE' : formatMoney(quote.deliveryCharge, business)}</dd>
      </div>
      {quote.searchCharge > 0 && (
        <div className="flex justify-between"><dt>Search Charge{quote.searchNote ? ` · ${quote.searchNote}` : ''}</dt><dd>{formatMoney(quote.searchCharge, business)}</dd></div>
      )}
      <div className="flex justify-between"><dt>Platform Fee</dt><dd>{formatMoney(quote.platformFee, business)}</dd></div>
      {!quote.deliverable && quote.message && <p className="text-xs text-rose-600 pt-1">{quote.message}</p>}
      <div className="flex justify-between font-bold text-slate-900 text-lg pt-2 border-t"><dt>Total Amount</dt><dd>{formatMoney(quote.total, business)}</dd></div>
    </dl>
  );
}
