import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, X } from 'lucide-react';
import { useCart } from '../store/cart';
import { useLocationStore } from '../store/location';
import { useAuthStore } from '../store/auth';
import { shop } from '../api';
import BillBreakdown from '../components/BillBreakdown';
import CartItemRow from '../components/CartItemRow';
import LocationModal from '../components/LocationModal';
import { useSiteSettings } from '../store/siteSettings';

const PENDING_PAYMENT_KEY = 'wepzo-qc-pending-payment-order';

function loadCheckoutScript(src, name, ready) {
  if (ready()) return Promise.resolve(true);
  return new Promise(resolve => {
    const selector = `script[data-wepzo-checkout="${name}"]`;
    const existing = document.querySelector(selector);
    const script = existing || document.createElement('script');
    const finish = loaded => resolve(loaded && ready());
    script.addEventListener('load', () => finish(true), { once: true });
    script.addEventListener('error', () => finish(false), { once: true });
    if (!existing) {
      script.src = src;
      script.async = true;
      script.dataset.wepzoCheckout = name;
      document.head.appendChild(script);
    }
  });
}

function checkoutReturnUrl() {
  const url = new URL(window.location.href);
  ['wepzoOrderId', 'paymentGateway', 'paymentFlow', 'order_id'].forEach(key => url.searchParams.delete(key));
  return url.toString();
}

export default function CheckoutPage({ backgroundLocation }) {
  const { items, subtotal, clear } = useCart();
  const couponCode = useCart(s => s.couponCode);
  const loc = useLocationStore(s => s.current);
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);
  const business = useSiteSettings(s => s.business);
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
  const [paymentError, setPaymentError] = useState('');
  const [pendingPaymentOrder, setPendingPaymentOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PENDING_PAYMENT_KEY) || 'null'); } catch { return null; }
  });
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
    const allowed = [business?.codEnabled !== false && 'COD', business?.onlinePaymentEnabled === true && 'ONLINE'].filter(Boolean);
    if (!allowed.includes(form.payment)) setForm(current => ({ ...current, payment: allowed[0] || '' }));
  }, [business?.codEnabled, business?.onlinePaymentEnabled]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('wepzoOrderId');
    const gateway = params.get('paymentGateway');
    if (!orderId || !gateway || !token) return;
    shop.setToken(token);
    setSaving(true);
    setPaymentError('');
    shop.verifyPayment({ orderId })
      .then(result => {
        if (!result?.verified) throw new Error('Payment could not be verified.');
        clear();
        setPendingPaymentOrder(null);
        localStorage.removeItem(PENDING_PAYMENT_KEY);
        navigate(`/track/${result.order?.orderNo || orderId}`, { replace: true });
      })
      .catch(error => setPaymentError(error.response?.data?.message || error.message || 'Payment status could not be verified.'))
      .finally(() => {
        params.delete('wepzoOrderId');
        params.delete('paymentGateway');
        params.delete('paymentFlow');
        const query = params.toString();
        window.history.replaceState(window.history.state || {}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
        setSaving(false);
      });
  }, [token]);

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
    setPaymentError('');
    try {
      let order = form.payment === 'ONLINE' ? pendingPaymentOrder : null;
      if (!order) {
        order = await shop.placeOrder({
          ...form,
          lat: loc?.lat,
          lng: loc?.lng,
          couponCode,
          moduleSlug: items[0]?.moduleSlug,
          items: items.map(i => ({ id: i.id, productId: i.productId, variantId: i.variantId, qty: i.qty })),
        });
      }
      if (form.payment === 'ONLINE') {
        const retryOrder = { _id: order._id, orderNo: order.orderNo };
        setPendingPaymentOrder(retryOrder);
        localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(retryOrder));
        const payment = await shop.initiatePayment({ orderId: order._id, returnUrl: checkoutReturnUrl() });
        if (payment.provider === 'phonepe' && payment.redirectUrl) {
          window.location.assign(payment.redirectUrl);
          return;
        }
        if (payment.provider === 'razorpay') {
          if (!await loadCheckoutScript('https://checkout.razorpay.com/v1/checkout.js', 'razorpay', () => !!window.Razorpay)) throw new Error('Razorpay Checkout could not be loaded.');
          await new Promise((resolve, reject) => {
            const checkout = new window.Razorpay({
              key: payment.keyId,
              amount: payment.amount,
              currency: payment.currency,
              order_id: payment.orderId,
              name: business.businessName || 'WEPZO',
              description: `Order ${order.orderNo}`,
              prefill: { name: form.customer, email: user?.email || '', contact: form.phone },
              modal: { ondismiss: () => { setPaymentError('Payment was not completed. Retry to continue.'); resolve(false); } },
              handler: async response => {
                try {
                  const verified = await shop.verifyPayment({ orderId: order._id, ...response });
                  if (!verified?.verified) throw new Error('Payment could not be verified.');
                  clear();
                  setPendingPaymentOrder(null);
                  localStorage.removeItem(PENDING_PAYMENT_KEY);
                  navigate(`/track/${verified.order?.orderNo || order.orderNo}`);
                  resolve(true);
                } catch (error) { reject(error); }
              },
            });
            checkout.on('payment.failed', event => reject(new Error(event.error?.description || 'Payment failed. Retry to continue.')));
            checkout.open();
          });
        } else if (payment.provider === 'cashfree' && payment.paymentSessionId) {
          if (!await loadCheckoutScript('https://sdk.cashfree.com/js/v3/cashfree.js', 'cashfree', () => typeof window.Cashfree === 'function')) throw new Error('Cashfree Checkout could not be loaded.');
          const cashfree = window.Cashfree({ mode: payment.environment || 'sandbox' });
          const result = await cashfree.checkout({ paymentSessionId: payment.paymentSessionId, redirectTarget: '_self' });
          if (result?.error) throw new Error(result.error.message || 'Cashfree checkout failed.');
        } else if (payment.provider !== 'razorpay') throw new Error('The active payment gateway returned an invalid checkout session.');
      } else {
        clear();
        setPendingPaymentOrder(null);
        localStorage.removeItem(PENDING_PAYMENT_KEY);
        navigate(`/track/${order.orderNo}`);
      }
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
        <div className="relative h-full w-full max-w-[480px] bg-white p-6">
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
        <aside role="dialog" aria-modal="true" aria-labelledby="checkout-drawer-title" className="relative box-border flex h-full w-full min-w-0 max-w-[480px] flex-col overflow-hidden bg-white shadow-2xl animate-[qc-cart-in_.22s_ease-out]">
          <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-slate-100 px-5">
            <div className="flex items-center gap-2">
              <button type="button" onClick={closeCheckout} aria-label="Back to cart" className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100"><ArrowLeft size={19} /></button>
              <h2 id="checkout-drawer-title" className="text-xl font-extrabold tracking-tight text-slate-900">Checkout</h2>
            </div>
            <button type="button" onClick={closeCheckout} aria-label="Close checkout" className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X size={21} /></button>
          </header>

          <form id="qc-checkout-form" onSubmit={place} className="box-border flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><MapPin size={16} className="text-brand-600" />Delivery Address</h2>
                  <button type="button" onClick={() => setLocationModalOpen(true)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">Edit</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input required value={form.customer} onChange={e => set('customer', e.target.value)} placeholder="Name" className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-orange-100" />
                  <input required value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone" className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-orange-100" />
                </div>
                <textarea required value={form.address} onChange={e => set('address', e.target.value)}
                  placeholder="Full delivery address"
                  className="mt-2 h-16 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-orange-100" rows={2} />
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <h2 className="mb-2.5 text-sm font-bold text-slate-900">Payment Method</h2>
                {[
                  ...(business?.codEnabled !== false ? [{ id: 'COD', label: 'Cash on Delivery' }] : []),
                  ...(business?.onlinePaymentEnabled === true ? [{ id: 'ONLINE', label: `Pay online via ${business.paymentGateway || 'gateway'}` }] : []),
                ].map(({ id, label }) => (
                  <label key={id} className="flex items-center gap-2 py-1.5 text-sm">
                    <input type="radio" name="pay" checked={form.payment === id} onChange={() => set('payment', id)} />
                    {label}
                  </label>
                ))}
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <h2 className="mb-2 text-sm font-bold text-slate-900">Delivery Instructions (Optional)</h2>
                <input value={form.instruction} onChange={e => set('instruction', e.target.value)}
                  placeholder="e.g. Leave at door, gate no. 2" className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <h2 className="mb-3 text-sm font-bold text-slate-900">Order Summary</h2>
                <ul className="mb-3 space-y-2 border-b border-slate-100 pb-3">
                  {items.map(item => <CartItemRow key={item.cartKey || item.id} item={item} business={business} />)}
                </ul>
                <BillBreakdown quote={quote} items={items} showItems={false} />
                <p className="mt-2 text-[11px] text-slate-400">Order store accept kare tabhi rider assign hoga.</p>
              </div>
            </div>
            <footer className="qc-checkout-footer shrink-0 border-t border-slate-100 bg-white px-4 pt-3">
              {paymentError && <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{paymentError}</p>}
              <button type="submit" form="qc-checkout-form" disabled={saving || (quote && !quote.deliverable) || !form.payment}
                className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white disabled:opacity-50">
                {saving ? 'Placing…' : 'Place Order'}
              </button>
            </footer>
          </form>
        </aside>
      </div>
      {locationModalOpen && <LocationModal onClose={() => setLocationModalOpen(false)} />}
    </>
  );
}
