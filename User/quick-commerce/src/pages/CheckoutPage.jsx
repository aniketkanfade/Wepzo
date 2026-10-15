import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { useCart } from '../store/cart';
import { useLocationStore } from '../store/location';
import { useAuthStore } from '../store/auth';
import { shop } from '../api';
import BillBreakdown from '../components/BillBreakdown';
import LocationModal from '../components/LocationModal';

export default function CheckoutPage({ backgroundLocation }) {
  const { items, subtotal, clear } = useCart();
  const couponCode = useCart(s => s.couponCode);
  const loc = useLocationStore(s => s.current);
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customer: user?.name || '',
    phone: user?.phone || '',
    address: loc?.line || '',
    payment: 'COD',
    instruction: '',
  });
  const [quote, setQuote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!user) navigate('/login?next=/checkout', { replace: true, state: { backgroundLocation } });
  }, [user, navigate, backgroundLocation]);

  useEffect(() => {
    if (user) setForm(f => ({ ...f, customer: user.name || f.customer, phone: user.phone || f.phone }));
  }, [user]);

  useEffect(() => {
    if (loc?.line) setForm(f => ({ ...f, address: loc.line }));
  }, [loc?.line]);

  useEffect(() => {
    if (!items.length) return;
    shop.quote({
      lat: loc?.lat,
      lng: loc?.lng,
      couponCode,
      moduleSlug: items[0]?.moduleSlug,
      items: items.map(i => ({ id: i.id, productId: i.productId, variantId: i.variantId, qty: i.qty })),
    }).then(setQuote).catch(() => setQuote(null));
  }, [items, loc?.lat, loc?.lng, subtotal(), couponCode]);

  const place = async (e) => {
    e.preventDefault();
    if (!items.length) return navigate('/cart', { state: { backgroundLocation } });
    if (!token) return navigate('/login?next=/checkout', { state: { backgroundLocation } });
    shop.setToken(token);
    if (quote && !quote.deliverable) return alert(quote.message || 'Delivery nahi ho sakti');
    setSaving(true);
    try {
      const order = await shop.placeOrder({
        ...form,
        lat: loc?.lat,
        lng: loc?.lng,
        couponCode,
        moduleSlug: items[0]?.moduleSlug,
        items: items.map(i => ({ id: i.id, productId: i.productId, variantId: i.variantId, qty: i.qty })),
      });
      clear();
      navigate(`/track/${order.orderNo}`);
    } catch (err) {
      if (err.response?.status === 401) {
        useAuthStore.getState().logout();
        navigate('/login?next=/checkout', { replace: true, state: { backgroundLocation } });
        return;
      }
      alert(err.response?.data?.message || 'Order fail.');
    } finally {
      setSaving(false);
    }
  };

  const closeCheckout = () => navigate('/cart', { state: { backgroundLocation } });

  if (!user) return null;
  if (!items.length) {
    return (
      <div className="fixed inset-0 z-[1100] flex justify-end">
        <div className="absolute inset-0 bg-slate-950/45" />
        <div className="relative h-full w-full max-w-[420px] bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold">Your Cart</h2>
            <button type="button" onClick={closeCheckout} aria-label="Close cart" className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100"><X size={20} /></button>
          </div>
          <p className="py-20 text-center text-slate-500">Cart empty hai — pehle items add karo.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[1100] flex justify-end" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeCheckout(); }}>
        <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" />
        <aside role="dialog" aria-modal="true" aria-labelledby="checkout-drawer-title" className="relative box-border flex h-full w-full min-w-0 max-w-[470px] flex-col overflow-hidden bg-white shadow-2xl animate-[qc-cart-in_.22s_ease-out]">
          <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-slate-100 px-5">
            <div className="flex items-center gap-2">
              <button type="button" onClick={closeCheckout} aria-label="Back to cart" className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100"><ArrowLeft size={19} /></button>
              <h2 id="checkout-drawer-title" className="text-xl font-extrabold tracking-tight text-slate-900">Checkout</h2>
            </div>
            <button type="button" onClick={closeCheckout} aria-label="Close checkout" className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X size={21} /></button>
          </header>

          <form onSubmit={place} className="box-border flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-slate-900">Delivery Address</h2>
                  <button type="button" onClick={() => setLocationModalOpen(true)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">Edit</button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <input required value={form.customer} onChange={e => set('customer', e.target.value)} placeholder="Name" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-orange-100" />
                  <input required value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-orange-100" />
                </div>
                <textarea required value={form.address} onChange={e => set('address', e.target.value)}
                  className="mt-2.5 min-h-[86px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-orange-100" rows={3} />
              </div>
              <div className="rounded-2xl border bg-white p-5">
                <h2 className="mb-3 font-bold">Payment Method</h2>
                {['COD', 'UPI', 'Wallet'].map(p => (
                  <label key={p} className="flex items-center gap-2 py-1.5 text-sm">
                    <input type="radio" name="pay" checked={form.payment === p} onChange={() => set('payment', p)} />
                    {p === 'COD' ? 'Cash on Delivery' : p === 'UPI' ? 'UPI (demo)' : 'WEPZO Wallet (demo)'}
                  </label>
                ))}
              </div>
              <div className="rounded-2xl border bg-white p-5">
                <h2 className="mb-2 font-bold">Delivery Instructions (Optional)</h2>
                <input value={form.instruction} onChange={e => set('instruction', e.target.value)}
                  placeholder="e.g. Leave at door, gate no. 2" className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div className="rounded-2xl border bg-white p-5">
                <h2 className="mb-3 font-bold">Order Summary</h2>
                <BillBreakdown quote={quote} items={items} />
                <button type="submit" disabled={saving || (quote && !quote.deliverable)}
                  className="mt-4 w-full rounded-xl bg-brand-600 py-3 font-bold text-white disabled:opacity-50">
                  {saving ? 'Placing…' : 'Place Order'}
                </button>
                <p className="mt-2 text-[11px] text-slate-400">Order store accept kare tabhi rider assign hoga.</p>
              </div>
            </div>
          </form>
        </aside>
      </div>
      {locationModalOpen && <LocationModal onClose={() => setLocationModalOpen(false)} />}
    </>
  );
}
