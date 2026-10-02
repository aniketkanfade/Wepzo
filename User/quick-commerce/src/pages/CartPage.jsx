import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../store/cart';
import { useLocationStore } from '../store/location';
import { useAuthStore } from '../store/auth';
import { shop } from '../api';
import BillBreakdown from '../components/BillBreakdown';
import { formatMoney, useSiteSettings } from '../store/siteSettings';

export default function CartPage() {
  const { items, setQty, remove, clear, subtotal } = useCart();
  const loc = useLocationStore(s => s.current);
  const user = useAuthStore(s => s.user);
  const business = useSiteSettings(s => s.business);
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    if (!items.length) return;
    shop.quote({
      lat: loc?.lat,
      lng: loc?.lng,
      moduleSlug: items[0]?.moduleSlug,
      items: items.map(i => ({ id: i.id, productId: i.productId, variantId: i.variantId, qty: i.qty })),
    }).then(setQuote).catch(() => setQuote(null));
  }, [items, loc?.lat, loc?.lng, subtotal()]);

  if (!items.length) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-lg font-bold">Your cart is empty</p>
        <Link to="/c" className="inline-block mt-4 px-5 py-2.5 rounded-full bg-brand-600 text-white text-sm font-semibold">Start shopping</Link>
      </div>
    );
  }

  const goCheckout = () => {
    if (!user) return navigate('/login?next=/checkout');
    navigate('/checkout');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-4">
        <div className="flex justify-between items-center mb-3">
          <h1 className="font-bold">Your Cart ({items.length} items)</h1>
          <button type="button" onClick={clear} className="text-xs text-rose-500 font-semibold">Clear Cart</button>
        </div>
        <ul className="divide-y">
          {items.map(it => (
            <li key={it.cartKey || it.id} className="py-3 flex gap-3">
              <img src={it.image} alt="" className="w-16 h-16 rounded-lg object-cover bg-slate-50" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold line-clamp-2">{it.name}</p>
                <p className="text-xs text-slate-400">{it.unit}</p>
                <p className="text-sm font-bold mt-1">{formatMoney(it.price, business)}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center border rounded-lg">
                  <button type="button" className="p-1.5" onClick={() => setQty(it.cartKey || it.id, it.qty - 1)}><Minus size={12} /></button>
                  <span className="w-6 text-center text-sm">{it.qty}</span>
                  <button type="button" className="p-1.5" onClick={() => setQty(it.cartKey || it.id, it.qty + 1)}><Plus size={12} /></button>
                </div>
                <button type="button" onClick={() => remove(it.cartKey || it.id)} className="text-rose-400"><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-5 h-fit">
        <h2 className="font-bold mb-3">Price Details</h2>
        <BillBreakdown quote={quote} />
        <button type="button" onClick={goCheckout}
          className="w-full mt-4 py-3 rounded-xl bg-brand-600 text-white font-bold">
          {user ? 'Proceed to Checkout' : 'Login to Checkout'}
        </button>
      </div>
    </div>
  );
}
