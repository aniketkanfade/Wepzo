import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, Phone } from 'lucide-react';
import { shop } from '../api';
import TrackMap from '../components/TrackMap';
import { formatEta } from '../utils/eta';
import { formatMoney, useSiteSettings } from '../store/siteSettings';

const STEPS = [
  { key: 'placed', label: 'Placed' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ofd', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
];

function stepIndex(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('deliver')) return 4;
  if (s.includes('out for') || s.includes('on the way') || s.includes('on-the-way') || s.includes('ofd') || s.includes('handover')) return 3;
  if (s.includes('process') || s.includes('prepar')) return 2;
  if (s.includes('accept')) return 1;
  return 0;
}

export default function TrackPage() {
  const { orderNo } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [query, setQuery] = useState(orderNo || '');
  const business = useSiteSettings(s => s.business);

  const load = (id) => {
    if (!id) return;
    shop.order(id).then(setOrder).catch(() => setOrder(null));
  };

  useEffect(() => { if (orderNo) load(orderNo); }, [orderNo]);

  useEffect(() => {
    if (!orderNo) return undefined;
    const t = setInterval(() => load(orderNo), 8000);
    return () => clearInterval(t);
  }, [orderNo]);

  const submit = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/track/${query.trim()}`);
  };

  const hasRider = !!(order?.rider?.name && order?.rider?.phone);
  const idx = order ? stepIndex(order.status) : 0;
  const bill = order?.bill || null;
  const details = Array.isArray(order?.details) ? order.details : [];
  const itemsTotal = Number(order?.itemsTotal ?? bill?.itemsTotal) || 0;
  const itemsPrice = details.length
    ? details.reduce((total, item) => {
      const price = Number(item.price) || 0;
      return total + Math.max(Number(item.mrp) || price, price) * (Number(item.qty) || 1);
    }, 0)
    : itemsTotal;
  const productDiscount = Math.max(0, itemsPrice - itemsTotal);
  const couponDiscount = Number(bill?.couponDiscount) || 0;
  const deliveryCharge = Number(order?.deliveryCharge ?? bill?.deliveryCharge) || 0;
  const freeDelivery = order?.freeDelivery || deliveryCharge === 0;
  const eta = formatEta(order?.etaMinutes);
  const onTheWay = idx >= 3;
  const routeEta = Number(order?.etaMinutes);
  const storeEtaMin = Number(order?.remainingStoreEtaMin ?? order?.storeEtaMin) || 0;
  const storeEtaMax = Number(order?.remainingStoreEtaMax ?? order?.storeEtaMax) || 0;
  const preDispatchEta = eta && (storeEtaMin > 0 || storeEtaMax > 0)
    ? `${(storeEtaMin || storeEtaMax) + routeEta} min`
    : eta;
  const displayEta = onTheWay ? eta : preDispatchEta;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <h1 className="text-xl font-bold">Track order</h1>
      <form onSubmit={submit} className="flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Order #WZP…"
          className="flex-1 px-3 py-2 border rounded-lg text-sm" />
        <button className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold">Track</button>
      </form>

      {!order && orderNo && <p className="text-slate-400 text-sm">Order nahi mili. Checkout ke baad yahan ID aayegi.</p>}

      {order && (
        <div className="bg-white rounded-2xl border p-5 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-400">Order #{order.orderNo}</p>
              <p className="font-bold">{order.status}</p>
              {(order.status === 'Pending' || !hasRider) && (
                <p className="text-sm text-amber-700 mt-1">
                  {order.status === 'Pending'
                    ? 'Waiting for rider — store accept kare tabhi rider assign hoga.'
                    : 'Waiting for rider — assign hone ke baad live route dikhega.'}
                </p>
              )}
            </div>
            {displayEta && (
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">Delivery time</p>
                <p className="text-2xl font-extrabold text-brand-700 leading-none">{displayEta}</p>
                {order.remainingKm != null && (
                  <p className="text-[11px] text-slate-500 mt-1">{order.remainingKm} km left</p>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-between gap-1">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex-1 text-center">
                <div className={`h-2 rounded-full ${i <= idx ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                <p className="text-[10px] mt-1 text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
          <TrackMap order={order} />
          {hasRider ? (
            <div className="flex items-center justify-between border rounded-xl p-3">
              <div>
                <p className="text-xs text-slate-400">Delivery Partner</p>
                <p className="font-semibold">{order.rider.name}</p>
                <p className="text-xs text-slate-500">{order.rider.vehicle}</p>
              </div>
              <div className="flex gap-2">
                <a href={`tel:${order.rider.phone}`} className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center"><Phone size={16} /></a>
                <span className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"><MessageCircle size={16} /></span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 border rounded-xl p-3">Rider abhi assign nahi hua. Time store se aapke pin tak ka estimate hai.</p>
          )}
          <ul className="text-sm text-slate-600">
            {(order.details || []).map((d, i) => (
              <li key={i}>{d.name} × {d.qty} — {formatMoney(d.price * d.qty, business)}</li>
            ))}
          </ul>
          <div className="text-sm space-y-1 border-t pt-2">
            <div className="flex justify-between"><span>Items price</span><span>{formatMoney(itemsPrice, business)}</span></div>
            {productDiscount > 0 && <div className="flex justify-between text-emerald-600"><span>Product discount</span><span>− {formatMoney(productDiscount, business)}</span></div>}
            <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(itemsTotal, business)}</span></div>
            {couponDiscount > 0 && <div className="flex justify-between text-emerald-600"><span>Coupon discount</span><span>− {formatMoney(couponDiscount, business)}</span></div>}
            <div className="flex justify-between"><span>Delivery{order.zone?.name ? ` · ${order.zone.name}` : ''}</span><span className={freeDelivery ? 'font-medium text-emerald-600' : ''}>{freeDelivery ? 'FREE' : formatMoney(deliveryCharge, business)}</span></div>
            {order.searchCharge > 0 && <div className="flex justify-between"><span>Search Charge</span><span>{formatMoney(order.searchCharge, business)}</span></div>}
            <div className="flex justify-between"><span>Platform Fee</span><span>{formatMoney(order.platformFee || 0, business)}</span></div>
            {(Number(order.taxAmount ?? bill?.taxAmount) || 0) > 0 && <div className="flex justify-between"><span>{bill?.taxName || order.taxName || 'GST'}{bill?.taxPercent ? ` (${bill.taxPercent}%)` : ''}{bill?.taxIncluded ? ' (included)' : ''}</span><span>{formatMoney(order.taxAmount ?? bill?.taxAmount, business)}</span></div>}
            <p className="flex justify-between pt-1 text-base font-bold"><span>Total Amount</span><span>{formatMoney(order.amount || order.total, business)}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
