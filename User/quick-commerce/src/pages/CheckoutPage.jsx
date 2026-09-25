import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../store/cart';
import { useLocationStore } from '../store/location';
import { useAuthStore } from '../store/auth';
import { shop } from '../api';
import BillBreakdown from '../components/BillBreakdown';

export default function CheckoutPage() {
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
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!user) navigate(`/login?next=/checkout`, { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (user) setForm(f => ({ ...f, customer: user.name || f.customer, phone: user.phone || f.phone }));
  }, [user]);

  useEffect(() => {
    if (!items.length) return;
    shop.quote({
      lat: loc?.lat,
      lng: loc?.lng,
      couponCode,
      items: items.map(i => ({ id: i.id, productId: i.productId, variantId: i.variantId, qty: i.qty })),
    }).then(setQuote).catch(() => setQuote(null));
  }, [items, loc?.lat, loc?.lng, subtotal(), couponCode]);

  const place = async (e) => {
    e.preventDefault();
    if (!items.length) return navigate('/cart');
    if (!token) return navigate('/login?next=/checkout');
    shop.setToken(token);
    if (quote && !quote.deliverable) return alert(quote.message || 'Delivery nahi ho sakti');
    setSaving(true);
    try {
      const order = await shop.placeOrder({
        ...form,
        lat: loc?.lat,
        lng: loc?.lng,
        couponCode,
        items: items.map(i => ({ id: i.id, productId: i.productId, variantId: i.variantId, qty: i.qty })),
      });
      clear();
      navigate(`/track/${order.orderNo}`);
    } catch (err) {
      if (err.response?.status === 401) {
        useAuthStore.getState().logout();
        navigate('/login?next=/checkout', { replace: true });
        return;
      }
      alert(err.response?.data?.message || 'Order fail.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;
  if (!items.length) {
    return <p className="text-center py-20 text-slate-500">Cart empty hai — pehle items add karo.</p>;
  }

  return (
    <form onSubmit={place} className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-2xl border p-5">
          <h2 className="font-bold mb-3">Delivery Address</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <input required value={form.customer} onChange={e => set('customer', e.target.value)} placeholder="Name" className="px-3 py-2 border rounded-lg text-sm" />
            <input required value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone" className="px-3 py-2 border rounded-lg text-sm" />
          </div>
          <textarea required value={form.address} onChange={e => set('address', e.target.value)}
            className="mt-3 w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
        </div>
        <div className="bg-white rounded-2xl border p-5">
          <h2 className="font-bold mb-3">Payment Method</h2>
          {['COD', 'UPI', 'Wallet'].map(p => (
            <label key={p} className="flex items-center gap-2 text-sm py-1.5">
              <input type="radio" name="pay" checked={form.payment === p} onChange={() => set('payment', p)} />
              {p === 'COD' ? 'Cash on Delivery' : p === 'UPI' ? 'UPI (demo)' : 'WEPZO Wallet (demo)'}
            </label>
          ))}
        </div>
        <div className="bg-white rounded-2xl border p-5">
          <h2 className="font-bold mb-2">Delivery Instructions (Optional)</h2>
          <input value={form.instruction} onChange={e => set('instruction', e.target.value)}
            placeholder="e.g. Leave at door, gate no. 2" className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border p-5 h-fit">
        <h2 className="font-bold mb-3">Order Summary</h2>
        <BillBreakdown quote={quote} items={items} />
        <button type="submit" disabled={saving || (quote && !quote.deliverable)}
          className="w-full mt-4 py-3 rounded-xl bg-brand-600 text-white font-bold disabled:opacity-50">
          {saving ? 'Placing…' : 'Place Order'}
        </button>
        <p className="text-[11px] text-slate-400 mt-2">Order store accept kare tabhi rider assign hoga.</p>
      </div>
    </form>
  );
}
