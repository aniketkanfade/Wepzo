import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, Link2, RefreshCw, Wallet } from 'lucide-react';
import api from '../../api/axios';

const money = (value, currency = 'INR') => Number.isFinite(Number(value))
  ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(Number(value))
  : '—';
const dateLabel = value => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function MarketingUserAccountsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get(`/marketing/users/${userId}/details`)
      .then(({ data }) => setDetails(data))
      .catch(requestError => setError(requestError.response?.data?.message || 'Account and payment details could not be loaded.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [userId]);

  if (loading && !details) return <section className="mx-auto max-w-6xl p-8 text-sm text-slate-500">Loading account details…</section>;
  if (error && !details) return <section className="mx-auto max-w-6xl space-y-4"><p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p><button type="button" onClick={() => navigate('/marketing/users')} className="text-sm text-blue-700">Back to users</button></section>;

  const subscription = details?.subscription;
  return <section className="mx-auto max-w-6xl space-y-5 pb-10">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Admin / Web / Marketing / Users</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Account & billing details</h1><p className="mt-2 text-sm text-slate-600">Review this user’s logged-in platform accounts, subscription, payments, and advertising spend.</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => navigate('/marketing/users', { state: { marketingUser: details?.user } })} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><ArrowLeft size={15}/> Back to user posts</button><button type="button" onClick={() => navigate('/marketing/users')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">All users</button><button type="button" disabled={loading} onClick={load} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Refresh</button></div>
    </header>
    {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
    <article className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><span className="grid h-12 w-12 place-items-center rounded-full bg-violet-50 font-bold text-violet-700">{details?.user?.name?.split(' ').map(part => part[0]).join('').slice(0, 2) || 'W'}</span><div className="min-w-0 flex-1"><h2 className="font-semibold text-slate-900">{details?.user?.name}</h2><p className="text-xs text-slate-500">{details?.user?.email}</p><p className="mt-1 break-all text-[10px] text-slate-400">Wepzo user ID: {details?.user?.id}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-emerald-700">{details?.user?.status || 'active'}</span></article>

    <div className="grid gap-4 xl:grid-cols-3">
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CreditCard size={17} className="text-orange-500"/>Subscription & payment</div>{subscription ? <><p className="mt-4 text-lg font-bold text-slate-900">{subscription.planName}</p><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><span className="text-slate-500">Status</span><b className="mt-1 block capitalize text-slate-800">{subscription.status}</b></div><div><span className="text-slate-500">Plan term</span><b className="mt-1 block text-slate-800">{subscription.billingCycle || subscription.type || '—'}</b></div><div><span className="text-slate-500">Paid</span><b className="mt-1 block text-slate-800">{money(subscription.amount)}</b></div><div><span className="text-slate-500">Plan total</span><b className="mt-1 block text-slate-800">{money(subscription.totalAmount)}</b></div><div><span className="text-slate-500">Paid on</span><b className="mt-1 block text-slate-800">{dateLabel(subscription.paidAt)}</b></div><div><span className="text-slate-500">Renews / expires</span><b className="mt-1 block text-slate-800">{dateLabel(subscription.renewalDate)}</b></div></div><p className="mt-3 break-all text-[10px] text-slate-500">Payment ID: {subscription.paymentId || 'Not paid / not recorded'}</p></> : <p className="mt-4 text-sm text-slate-500">No subscription or payment is recorded.</p>}
        <div className="mt-4 border-t border-slate-100 pt-3"><h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Payment history</h3><div className="mt-2 max-h-44 space-y-2 overflow-y-auto">{details?.payments?.length ? details.payments.slice().reverse().map((payment, index) => <div key={`${payment.transactionId || payment.orderId}-${index}`} className="flex items-start justify-between gap-2 rounded-md bg-slate-50 p-2 text-[10px]"><div><b className="block text-slate-700">{payment.planName} · {payment.status}</b><span className="break-all text-slate-500">{dateLabel(payment.paidAt || payment.createdAt)}{payment.transactionId ? ` · ${payment.transactionId}` : ''}</span></div><b className="shrink-0 text-slate-800">{money(payment.amount, payment.currency)}</b></div>) : <p className="text-xs text-slate-500">No payment records yet.</p>}</div></div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Link2 size={17} className="text-blue-600"/>Logged-in platform accounts</div><p className="mt-1 text-xs text-slate-500">Provider accounts connected by this Marketing user</p><div className="mt-4 space-y-3">{details?.accounts?.length ? details.accounts.map((account, index) => <div key={`${account.platform}-${index}`} className="rounded-lg bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><b className="text-xs text-slate-800">{account.platform}</b><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Connected</span></div>{account.targets?.length ? account.targets.map((target, targetIndex) => <div key={`${target.id}-${targetIndex}`} className="mt-3 border-t border-slate-200 pt-2 text-[11px]"><p className="font-medium text-slate-700">{target.label || 'Provider account'}</p><p className="mt-1 break-all text-slate-500">Account ID: {target.id || 'Not provided'}</p><p className="mt-1 text-slate-400">{target.kind || account.platform}{target.id === account.selectedTargetId ? ' · selected for publishing' : ''}</p></div>) : <p className="mt-2 text-[11px] text-slate-500">{account.accountName || 'Connection exists, but provider account details are unavailable.'}</p>}</div>) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No social or ads accounts are connected.</p>}</div><p className="mt-4 text-[10px] leading-4 text-slate-400">Provider passwords and access tokens are never shown. Only connected account names, IDs, and status are displayed.</p></article>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Wallet size={17} className="text-emerald-600"/>Advertising investment</div><p className="mt-4 text-2xl font-bold text-slate-900">{details?.adSpend?.total == null ? '—' : money(details.adSpend.total, details.adSpend.currency)}</p><p className="mt-1 text-xs text-slate-500">Recorded ad spend · last 30 days</p><div className="mt-4 space-y-2">{details?.adSpend?.platforms?.length ? details.adSpend.platforms.map((item, index) => <div key={`${item.platform}-${item.accountId || index}`} className="border-t border-slate-100 pt-2 text-xs"><div className="flex justify-between gap-2"><span className="text-slate-600">{item.platform} · {item.accountName}</span><b className="shrink-0 text-slate-800">{item.amount == null ? 'No spend data' : money(item.amount, item.currency)}</b></div>{item.message && <p className="mt-1 text-[10px] leading-4 text-amber-700">{item.message}</p>}</div>) : <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">No ads account connected.</p>}</div><p className="mt-4 text-[10px] leading-4 text-slate-400">Meta Ads spend comes from provider insights. Google Ads needs a developer token and customer account setup before spend can sync.</p></article>
    </div>
  </section>;
}
