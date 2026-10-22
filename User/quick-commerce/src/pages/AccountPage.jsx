import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Award, ClipboardList, Copy, Gift, Heart, Tag, UserRound, Wallet } from 'lucide-react';
import { shop } from '../api';
import { useAuthStore } from '../store/auth';
import { formatMoney, useSiteSettings } from '../store/siteSettings';

const sections = [
  ['profile', 'Profile Settings', UserRound],
  ['orders', 'My Orders', ClipboardList],
  ['wallet', 'Wallet', Wallet],
  ['coupons', 'Coupons', Tag],
  ['loyalty', 'Loyalty Points', Award],
  ['referral', 'Referral Code', Gift],
];

export default function AccountPage() {
  const { section = 'profile' } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const authLoading = useAuthStore(state => state.loading);
  const setSession = useAuthStore(state => state.setSession);
  const token = useAuthStore(state => state.token);
  const business = useSiteSettings(state => state.business);
  const [customer, setCustomer] = useState(user);
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([shop.me(), shop.orders(), shop.coupons()]).then(([profileResult, orderResult, couponResult]) => {
      if (cancelled) return;
      const profile = profileResult.status === 'fulfilled' ? profileResult.value?.user || user : user;
      setCustomer(profile);
      setForm({ name: profile.name || '', phone: profile.phone || '' });
      setOrders(orderResult.status === 'fulfilled' && Array.isArray(orderResult.value) ? orderResult.value : []);
      setCoupons(couponResult.status === 'fulfilled' && Array.isArray(couponResult.value) ? couponResult.value : []);
      if (profileResult.status === 'rejected') setError(profileResult.reason?.response?.data?.message || 'Could not load account details.');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  const activeSection = sections.some(([key]) => key === section) ? section : 'profile';
  const title = sections.find(([key]) => key === activeSection)?.[1] || 'Profile Settings';
  const wallet = customer?.walletByModule?.['quick-commerce'] || customer?.wallet || {};
  const walletBalance = Number(wallet.balance ?? customer?.walletBalance) || 0;
  const walletTransactions = wallet.transactions || customer?.walletTransactions || [];
  const loyaltyPoints = Number(customer?.loyaltyPoints ?? customer?.loyalty?.points) || 0;
  const referralCode = customer?.referralCode || '';
  const activeOrders = useMemo(() => orders.filter(order => !['delivered', 'cancelled', 'rejected'].includes(String(order.status || '').toLowerCase())), [orders]);

  if (authLoading) return <p className="py-10 text-center text-sm text-slate-500">Loading account...</p>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(`/account/${activeSection}`)}`} replace />;

  const saveProfile = async event => {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await shop.updateProfile(form);
      const updated = result.user || { ...customer, ...form };
      setCustomer(updated);
      setSession(token, updated);
      setNotice('Profile updated successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Profile could not be updated.');
    } finally { setSaving(false); }
  };

  const copyValue = async value => {
    try { await navigator.clipboard.writeText(value); setNotice('Copied to clipboard.'); }
    catch { setNotice(value); }
    window.setTimeout(() => setNotice(''), 2500);
  };

  return <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
    <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-wide text-brand-600">My account</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">{title}</h1></div>
    <div className="grid gap-5 md:grid-cols-[230px_minmax(0,1fr)]">
      <nav className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white p-2" aria-label="Account pages">
        {sections.map(([key, label, Icon]) => <Link key={key} to={`/account/${key}`} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${activeSection === key ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'}`}><Icon size={18}/>{label}</Link>)}
        <Link to="/c?wishlist=1" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"><Heart size={18}/>Favorites</Link>
        <Link to="/track" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"><ClipboardList size={18}/>Track Order</Link>
      </nav>
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        {loading ? <p className="py-10 text-center text-sm text-slate-500">Loading account...</p> : <>
          {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
          {activeSection === 'profile' && <form onSubmit={saveProfile} className="max-w-xl space-y-4">
            <label className="block text-sm font-medium text-slate-700">Full name<input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-500" /></label>
            <label className="block text-sm font-medium text-slate-700">Mobile number<input inputMode="numeric" maxLength={10} value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value.replace(/\D/g, '').slice(0, 10) }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-500" /></label>
            <label className="block text-sm font-medium text-slate-700">Email<input readOnly value={customer?.email || ''} className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500" /></label>
            <button disabled={saving} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save changes'}</button>
          </form>}
          {activeSection === 'orders' && <div className="space-y-3">{orders.length ? orders.map(order => <article key={order._id || order.orderNo} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><div><p className="font-bold text-slate-900">Order #{order.orderNo || order._id}</p><p className="mt-1 text-xs text-slate-500">{order.orderDate ? new Date(order.orderDate).toLocaleString() : ''} · {order.items || 0} item(s)</p><p className="mt-1 text-sm font-semibold text-slate-700">{formatMoney(order.amount, business)}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{order.status}</span><button type="button" onClick={() => navigate(`/track/${encodeURIComponent(order.orderNo || order._id)}`)} className="rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-700">Track</button></div></article>) : <p className="py-10 text-center text-sm text-slate-500">No orders yet. <Link to="/c" className="font-semibold text-brand-700">Start shopping</Link></p>}</div>}
          {activeSection === 'wallet' && <div><div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 p-5 text-white"><p className="text-sm text-slate-300">Wallet balance</p><p className="mt-2 text-3xl font-extrabold">{formatMoney(walletBalance, business)}</p></div><h2 className="mb-3 mt-6 font-bold text-slate-900">Recent transactions</h2>{walletTransactions.length ? <div className="divide-y divide-slate-100">{walletTransactions.map((transaction, index) => <div key={transaction._id || index} className="flex justify-between gap-3 py-3 text-sm"><span>{transaction.description || transaction.title || transaction.type || 'Wallet transaction'}</span><strong>{formatMoney(transaction.amount || 0, business)}</strong></div>)}</div> : <p className="text-sm text-slate-500">No wallet transactions yet.</p>}</div>}
          {activeSection === 'coupons' && <div className="grid gap-3 sm:grid-cols-2">{coupons.length ? coupons.map(coupon => <article key={coupon._id || coupon.code} className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-4"><p className="font-extrabold tracking-wide text-brand-700">{coupon.code}</p><p className="mt-1 text-sm font-semibold text-slate-800">{coupon.title || `${coupon.discount} off`}</p><p className="mt-1 text-xs text-slate-500">{coupon.minOrder ? `Minimum order ${formatMoney(coupon.minOrder, business)}` : 'No minimum order'}{coupon.expiry ? ` · Valid till ${coupon.expiry}` : ''}</p><button type="button" onClick={() => copyValue(coupon.code)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-brand-700"><Copy size={14}/>Copy code</button></article>) : <p className="py-10 text-center text-sm text-slate-500">No active coupons right now.</p>}</div>}
          {activeSection === 'loyalty' && <div className="rounded-2xl bg-amber-50 p-5"><div className="flex items-center gap-3 text-amber-700"><Award size={26}/><div><p className="text-sm font-medium">Available loyalty points</p><p className="text-3xl font-extrabold">{loyaltyPoints}</p></div></div><p className="mt-4 text-sm text-slate-600">Points balance from your account.</p></div>}
          {activeSection === 'referral' && <div className="rounded-2xl bg-violet-50 p-5"><Gift size={28} className="text-violet-700"/><h2 className="mt-3 text-lg font-bold text-slate-900">Invite friends</h2>{referralCode ? <><p className="mt-1 text-sm text-slate-600">Share your referral code with friends.</p><div className="mt-4 flex items-center gap-2"><code className="rounded-lg bg-white px-4 py-3 font-bold tracking-wider text-violet-800">{referralCode}</code><button type="button" onClick={() => copyValue(referralCode)} aria-label="Copy referral code" className="grid h-11 w-11 place-items-center rounded-lg bg-violet-700 text-white"><Copy size={17}/></button></div></> : <p className="mt-2 text-sm text-slate-600">A referral code is not available for this account yet.</p>}</div>}
        </>}
      </section>
    </div>
  </div>;
}
