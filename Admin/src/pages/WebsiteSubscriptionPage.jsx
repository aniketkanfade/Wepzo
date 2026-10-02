import { useEffect, useState } from 'react';
import { CalendarClock, CreditCard, Globe2 } from 'lucide-react';
import api from '../api/axios';

const panel = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
const dateText = value => value ? new Date(value).toLocaleString() : '—';

function remainingText(expiresAt, now) {
  if (!expiresAt) return 'No expiry';
  const remaining = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return 'Expired';
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return `${days} days, ${hours} hours, ${minutes} minutes`;
}

export default function WebsiteSubscriptionPage() {
  const [website, setWebsite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    let active = true;
    api.get('/websites').then(({ data }) => {
      if (!active) return;
      const list = Array.isArray(data) ? data : [];
      setWebsite(list.find(item => item.purchase?.status === 'paid' || (item.status === 'published' && !item.purchase)) || list[0] || null);
    }).catch(requestError => {
      if (active) setError(requestError.response?.data?.message || 'Subscription details could not be loaded.');
    }).finally(() => { if (active) setLoading(false); });
    const timer = window.setInterval(() => setClock(Date.now()), 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  if (loading) return <main className="mx-auto max-w-4xl p-6 text-sm text-slate-500">Loading subscription details...</main>;
  if (error) return <main className="mx-auto max-w-4xl p-6"><div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div></main>;
  if (!website) return <main className="mx-auto max-w-4xl p-6"><section className={panel}><h1 className="text-xl font-bold text-slate-900">Plan & Subscription</h1><p className="mt-2 text-sm text-slate-600">No purchased website is linked to this account yet.</p></section></main>;

  const purchase = website.purchase || {};
  const subscription = purchase.type === 'subscription';
  const remaining = remainingText(purchase.expiresAt, clock);
  return <main className="mx-auto max-w-4xl space-y-5 p-1">
    <header><h1 className="text-2xl font-bold text-slate-900">Plan & Subscription</h1><p className="mt-1 text-sm text-slate-500">Payment term starts when the payment is verified.</p></header>
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Website</p><h2 className="mt-1 text-xl font-bold text-slate-900">{website.name || 'My Website'}</h2><p className="mt-1 text-sm text-slate-600">{website.domain?.fullDomain || website.domain?.name || 'No domain'}</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{purchase.status === 'paid' ? 'Paid' : 'Published'}</span></div>
      <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <div className="flex items-start gap-3"><span className="rounded-lg bg-blue-50 p-2 text-blue-800"><CreditCard size={18}/></span><div><p className="text-xs text-slate-500">Purchase</p><p className="mt-1 text-sm font-semibold text-slate-900">{subscription ? purchase.planName || 'Subscription' : 'Full purchase'}</p><p className="mt-1 text-sm text-slate-600">Paid ₹{Number(purchase.amount || website.totalAmount || 0).toLocaleString('en-IN')}{Number(purchase.balanceDue) > 0 ? ` · balance ₹${Number(purchase.balanceDue).toLocaleString('en-IN')}` : ''}</p></div></div>
        <div className="flex items-start gap-3"><span className="rounded-lg bg-emerald-50 p-2 text-emerald-800"><CalendarClock size={18}/></span><div><p className="text-xs text-slate-500">{subscription ? 'Time remaining' : 'Validity'}</p><p className="mt-1 text-sm font-semibold text-slate-900">{subscription ? remaining : 'No expiry'}</p>{subscription && <p className="mt-1 text-xs text-slate-500">{purchase.subscriptionDurationValue || 30} {purchase.subscriptionDurationUnit || 'day'} term</p>}</div></div>
        <div className="flex items-start gap-3"><span className="rounded-lg bg-slate-100 p-2 text-slate-700"><Globe2 size={18}/></span><div><p className="text-xs text-slate-500">Domain</p><p className="mt-1 text-sm font-semibold text-slate-900">{website.domain?.fullDomain || 'Not connected'}</p></div></div>
        <div><p className="text-xs text-slate-500">Payment verified</p><p className="mt-1 text-sm font-semibold text-slate-900">{dateText(purchase.paidAt)}</p>{purchase.expiresAt && <p className="mt-1 text-xs text-slate-500">Expires {dateText(purchase.expiresAt)}</p>}</div>
      </div>
    </section>
  </main>;
}