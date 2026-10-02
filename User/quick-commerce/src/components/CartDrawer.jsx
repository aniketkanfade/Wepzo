import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShieldCheck, ShoppingBag, Tag, Trash2, Truck, X } from 'lucide-react';
import { useCart } from '../store/cart';
import { useLocationStore } from '../store/location';
import { useAuthStore } from '../store/auth';
import { shop } from '../api';
import { formatMoney, useSiteSettings } from '../store/siteSettings';

export default function CartDrawer({ onClose }) {
  const items = useCart(s => s.items);
  const couponCode = useCart(s => s.couponCode);
  const setCouponCode = useCart(s => s.setCouponCode);
  const setQty = useCart(s => s.setQty);
  const remove = useCart(s => s.remove);
  const subtotal = useCart(s => s.subtotal());
  const location = useLocationStore(s => s.current);
  const user = useAuthStore(s => s.user);
  const business = useSiteSettings(s => s.business);
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [couponOpen, setCouponOpen] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    if (!items.length) { setQuote(null); if (couponCode) setCouponCode(''); return; }
    let cancelled = false;
    shop.quote({
      lat: location?.lat,
      lng: location?.lng,
      moduleSlug: items[0]?.moduleSlug,
      couponCode,
      items: items.map(item => ({ id: item.id, productId: item.productId, variantId: item.variantId, qty: item.qty })),
    }).then(result => { if (!cancelled) setQuote(result); })
      .catch(() => { if (!cancelled) setQuote(null); });
    return () => { cancelled = true; };
  }, [items, items[0]?.moduleSlug, location?.lat, location?.lng, couponCode, setCouponCode]);

  const openCoupons = () => {
    setCouponOpen(true);
    setCouponError('');
    setCouponInput(couponCode);
    setCouponLoading(true);
    shop.coupons().then(setCoupons).catch(() => setCoupons([])).finally(() => setCouponLoading(false));
  };

  const applyCoupon = async codeValue => {
    const code = String(codeValue || '').trim().toUpperCase();
    if (!code) { setCouponError('Coupon code enter karein'); return; }
    setCouponError('');
    try {
      const result = await shop.quote({
        lat: location?.lat,
        lng: location?.lng,
        moduleSlug: items[0]?.moduleSlug,
        couponCode: code,
        items: items.map(item => ({ id: item.id, productId: item.productId, variantId: item.variantId, qty: item.qty })),
      });
      if (result.couponError) { setCouponError(result.couponError); return; }
      setCouponCode(code);
      setQuote(result);
      setCouponOpen(false);
    } catch (error) {
      setCouponError(error.response?.data?.message || 'Coupon apply nahi ho saka');
    }
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const goCheckout = () => {
    onClose();
    navigate(user ? '/checkout' : '/login?next=/checkout');
  };
  const total = quote?.total ?? subtotal;
  const freeDeliveryAt = 199;
  const remainingForFreeDelivery = Math.max(0, freeDeliveryAt - subtotal);
  const progress = Math.min(100, (subtotal / freeDeliveryAt) * 100);

  return (
    <div className="fixed inset-0 z-[70] flex justify-end" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" />
      <aside role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" className="relative flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl animate-[qc-cart-in_.22s_ease-out]">
        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} aria-label="Continue shopping" className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100"><ArrowLeft size={19} /></button>
            <h2 id="cart-drawer-title" className="text-xl font-extrabold tracking-tight text-slate-900">Your Cart ({items.reduce((sum, item) => sum + item.qty, 0)})</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close cart" className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X size={21} /></button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-orange-50 text-orange-500"><ShoppingBag size={29} /></span>
            <p className="mt-4 text-lg font-bold text-slate-900">Your cart is empty</p>
            <p className="mt-1 text-sm text-slate-500">Add something you love and it will show up here.</p>
            <button type="button" onClick={onClose} className="mt-5 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white">Start shopping</button>
          </div>
        ) : (
          <>
            <div className="shrink-0 px-4 pt-3">
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-emerald-700">
                <div className="flex items-center gap-2 text-sm font-semibold"><Truck size={19} />
                  {remainingForFreeDelivery > 0 ? `Add ${formatMoney(remainingForFreeDelivery, business)} more for FREE delivery` : 'You have unlocked FREE delivery'}
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-emerald-200"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} /></div>
                <div className="mt-1 flex justify-between text-[10px] text-emerald-700/70"><span>{formatMoney(subtotal, business)}</span><span>{formatMoney(freeDeliveryAt, business)}</span></div>
              </div>
            </div>

            <ul className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {items.map(item => (
                <li key={item.cartKey || item.id} className="rounded-xl border border-slate-100 bg-white p-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
                  <div className="flex gap-3">
                    <div className="grid h-[82px] w-[82px] shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50">
                      <img src={item.image} alt={item.name} className="h-full w-full object-contain mix-blend-multiply" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-800">{item.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{item.unit}</p>
                      <div className="mt-1.5 flex items-baseline gap-2"><strong className="text-base text-slate-900">{formatMoney(item.price, business)}</strong>{item.mrp > item.price && <del className="text-xs text-slate-400">{formatMoney(item.mrp, business)}</del>}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex h-8 items-center overflow-hidden rounded-full bg-slate-100">
                          <button type="button" aria-label={`Decrease ${item.name} quantity`} onClick={() => setQty(item.cartKey || item.id, item.qty - 1)} className="grid h-8 w-9 place-items-center text-slate-600 hover:bg-slate-200"><Minus size={14} /></button>
                          <span className="min-w-6 text-center text-sm font-semibold">{item.qty}</span>
                          <button type="button" aria-label={`Increase ${item.name} quantity`} onClick={() => setQty(item.cartKey || item.id, item.qty + 1)} className="grid h-8 w-9 place-items-center text-slate-600 hover:bg-slate-200"><Plus size={14} /></button>
                        </div>
                        <button type="button" aria-label={`Remove ${item.name}`} onClick={() => remove(item.cartKey || item.id)} className="grid h-8 w-8 place-items-center rounded-full text-rose-500 hover:bg-rose-50"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="shrink-0 border-t border-slate-100 bg-white px-4 pb-4 pt-2.5">
              <button type="button" onClick={openCoupons} className="mb-2.5 flex w-full items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">
                <span className="flex items-center gap-2"><Tag size={17} className="text-brand-600" /> {couponCode ? `Applied: ${couponCode}` : 'Apply Coupon'}</span><span className="text-lg leading-none">›</span>
              </button>
              <div className="space-y-1.5 px-1 text-[13px]">
                <div className="flex justify-between text-slate-600"><span>Item Total</span><span className="font-semibold text-slate-900">{formatMoney(quote?.itemsTotal ?? subtotal, business)}</span></div>
                {quote?.couponDiscount > 0 && <div className="flex justify-between text-emerald-600"><span>Coupon Discount</span><span>− {formatMoney(quote.couponDiscount, business)}</span></div>}
                <div className="flex justify-between text-slate-600"><span>Delivery Charge</span><span className={quote?.freeDelivery || quote?.deliveryCharge === 0 ? 'font-medium text-emerald-600' : 'font-semibold text-slate-900'}>{quote ? (quote.freeDelivery || !quote.deliveryCharge ? 'FREE' : formatMoney(quote.deliveryCharge, business)) : 'Calculated at checkout'}</span></div>
                {quote?.platformFee > 0 && <div className="flex justify-between text-slate-600"><span>Platform Fee</span><span>{formatMoney(quote.platformFee, business)}</span></div>}
              </div>
              <div className="mt-2.5 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                <div><p className="font-bold text-slate-900">Total Amount</p><p className="text-[10px] text-slate-500">Inclusive of all taxes</p></div>
                <strong className="text-xl font-extrabold text-slate-900">{formatMoney(total, business)}</strong>
              </div>
              {quote?.deliverable === false && quote?.message && <p className="mt-2 text-xs text-rose-600">{quote.message}</p>}
              <button type="button" onClick={goCheckout} disabled={quote?.deliverable === false} className="mt-2.5 flex w-full items-center justify-between rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/15 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
                <span>{user ? 'Proceed to Checkout' : 'Login to Checkout'}</span><span className="text-lg leading-none">›</span>
              </button>
              <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-slate-500"><ShieldCheck size={14} className="text-emerald-600" /> Secure checkout · Easy returns</div>
            </footer>
          </>
        )}
      </aside>
      {couponOpen && (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setCouponOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="coupon-title" className="w-full max-w-[390px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div><h3 id="coupon-title" className="font-bold text-slate-900">Apply Coupon</h3><p className="mt-0.5 text-xs text-slate-500">Choose an offer or enter a code</p></div>
              <button type="button" aria-label="Close coupons" onClick={() => setCouponOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X size={19} /></button>
            </div>
            <div className="flex gap-2 border-b border-slate-100 p-4">
              <input value={couponInput} onChange={event => setCouponInput(event.target.value.toUpperCase())} onKeyDown={event => { if (event.key === 'Enter') applyCoupon(couponInput); }} placeholder="Enter coupon code" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-brand-500" />
              <button type="button" onClick={() => applyCoupon(couponInput)} className="rounded-lg bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-700">Apply</button>
            </div>
            <div className="max-h-[min(48vh,390px)] space-y-2 overflow-y-auto p-4">
              {couponLoading && <p className="py-5 text-center text-sm text-slate-500">Loading coupons...</p>}
              {!couponLoading && coupons.length === 0 && <p className="py-5 text-center text-sm text-slate-500">No active coupons available right now.</p>}
              {coupons.map(coupon => {
                const eligible = subtotal >= Number(coupon.minOrder || 0);
                return <article key={coupon._id || coupon.code} className="rounded-xl border border-slate-200 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="font-extrabold tracking-wide text-brand-700">{coupon.code}</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{coupon.title || `${coupon.discount} off`}</p>
                      <p className="mt-1 text-xs text-slate-500">{coupon.minOrder ? `Minimum order ${formatMoney(coupon.minOrder, business)}` : 'No minimum order'}{coupon.store && coupon.store !== 'All Stores' ? ` · ${coupon.store}` : ''}</p>
                      {coupon.expiry && <p className="mt-1 text-[11px] text-slate-400">Valid till {coupon.expiry}</p>}
                    </div>
                    <button type="button" disabled={!eligible} onClick={() => applyCoupon(coupon.code)} className="shrink-0 rounded-lg border border-brand-500 px-3 py-1.5 text-xs font-bold text-brand-600 hover:bg-orange-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400">{eligible ? (couponCode === coupon.code ? 'Applied' : 'Apply') : 'Add items'}</button>
                  </div>
                </article>;
              })}
            </div>
            {couponError && <p role="alert" className="mx-4 mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{couponError}</p>}
            {couponCode && <button type="button" onClick={() => { setCouponCode(''); setCouponError(''); setCouponOpen(false); }} className="w-full border-t border-slate-100 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50">Remove applied coupon</button>}
          </section>
        </div>
      )}
      <style>{`@keyframes qc-cart-in { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
}
