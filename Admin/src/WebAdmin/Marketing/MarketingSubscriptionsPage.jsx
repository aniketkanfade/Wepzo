import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, CreditCard, Pencil, Plus, Search, Users, X } from 'lucide-react';
import api from '../../api/axios';

const money = (amount, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount || 0));
const dateLabel = value => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const statusStyle = status => ({ paid: 'bg-emerald-50 text-emerald-700', pending: 'bg-amber-50 text-amber-700', expired: 'bg-rose-50 text-rose-700', none: 'bg-slate-100 text-slate-500' }[String(status || '').toLowerCase()] || 'bg-slate-100 text-slate-600');

export default function MarketingSubscriptionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [plans, setPlans] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', priceMode: 'fixed', fixedAmount: '', percent: 30, durationValue: 30, durationUnit: 'day', isDefault: false });
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => ['paid', 'pending', 'expired', 'none'].includes(searchParams.get('status')) ? searchParams.get('status') : 'all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [subscriptionsResponse, plansResponse] = await Promise.all([
        api.get('/marketing/subscriptions'), api.get('/website-subscription-plans?moduleSlug=marketing'),
      ]);
      setRows(Array.isArray(subscriptionsResponse.data) ? subscriptionsResponse.data : []);
      setPlans(Array.isArray(plansResponse.data) ? plansResponse.data : []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Marketing subscriptions could not be loaded.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreatePlan = () => {
    setEditingPlanId('');
    setForm({ name: '', description: '', priceMode: 'fixed', fixedAmount: '', percent: 30, durationValue: 30, durationUnit: 'day', isDefault: false });
    setFormError(''); setFormOpen(true);
  };
  const openEditPlan = plan => {
    setEditingPlanId(plan._id);
    setForm({ name: plan.name || '', description: plan.description || '', priceMode: plan.priceMode || 'fixed', fixedAmount: plan.fixedAmount || '', percent: plan.percent || 30, durationValue: plan.durationValue || 30, durationUnit: plan.durationUnit || 'day', isDefault: Boolean(plan.isDefault) });
    setFormError(''); setFormOpen(true);
  };

  const savePlan = async event => {
    event.preventDefault(); setSaving(true); setFormError('');
    try {
      if (editingPlanId) await api.put(`/website-subscription-plans/${editingPlanId}`, { ...form, moduleSlug: 'marketing' });
      else await api.post('/website-subscription-plans', { ...form, moduleSlug: 'marketing', status: true });
      setForm({ name: '', description: '', priceMode: 'fixed', fixedAmount: '', percent: 30, durationValue: 30, durationUnit: 'day', isDefault: false });
      setFormOpen(false); await load();
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || 'Plan could not be created.');
    } finally { setSaving(false); }
  };

  const visibleRows = useMemo(() => rows.filter(row => {
    const matchesQuery = `${row.user?.name || ''} ${row.user?.email || ''} ${row.planName || ''}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === 'all' || row.status === statusFilter);
  }), [rows, query, statusFilter]);
  const activeCount = rows.filter(row => row.status === 'paid').length;
  const pendingCount = rows.filter(row => row.status === 'pending').length;
  const noPlanCount = rows.filter(row => row.status === 'none').length;

  return <main className="mx-auto max-w-6xl space-y-5 pb-10">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Admin / Web / Marketing</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Marketing subscriptions</h1><p className="mt-2 text-sm text-slate-600">Review each Marketing user’s current plan, payment status, and renewal date.</p></div><button type="button" onClick={openCreatePlan} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"><Plus size={16}/>Create plan</button></header>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <section className="grid gap-4 sm:grid-cols-3"><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="flex items-center gap-2 text-xs text-slate-500"><Users size={15}/> Marketing users</p><b className="mt-3 block text-2xl text-slate-900">{rows.length}</b></article><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="flex items-center gap-2 text-xs text-slate-500"><CreditCard size={15}/> Active subscriptions</p><b className="mt-3 block text-2xl text-emerald-700">{activeCount}</b></article><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">Pending / no plan</p><b className="mt-3 block text-2xl text-slate-900">{pendingCount} / {noPlanCount}</b></article></section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Marketing plans</h2><p className="mt-1 text-xs text-slate-500">Plans created here are scoped to the Marketing module.</p></div><span className="text-xs text-slate-500">{plans.length} plans</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{plans.map(plan => <article key={plan._id} className="rounded-lg border border-slate-200 p-4"><div className="flex items-start justify-between gap-2"><b className="text-sm text-slate-900">{plan.name}</b><button type="button" onClick={() => openEditPlan(plan)} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"><Pencil size={12}/>Edit</button></div><span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${plan.status === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{plan.status === false ? 'Inactive' : 'Active'}</span><p className="mt-2 text-lg font-bold text-slate-900">{plan.priceMode === 'fixed' ? money(plan.fixedAmount) : `${plan.percent}% of website total`}</p><p className="mt-1 text-xs text-slate-500">Every {plan.durationValue} {plan.durationUnit}{Number(plan.durationValue) === 1 ? '' : 's'}</p>{plan.description && <p className="mt-2 text-xs text-slate-600">{plan.description}</p>}</article>)}{!loading && !plans.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No Marketing plans yet. Create one to offer a subscription plan.</p>}</div></section>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">User subscriptions</h2><p className="mt-1 text-xs text-slate-500">Open a user to review payment history and connected accounts.</p></div><div className="flex flex-wrap gap-2"><label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2"><Search size={14} className="text-slate-400"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search users or plans" className="w-40 border-0 text-sm outline-none"/></label><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All statuses</option><option value="paid">Active / paid</option><option value="pending">Pending</option><option value="expired">Expired</option><option value="none">No plan</option></select></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr>{['User', 'Plan', 'Paid', 'Renewal', 'Payments', 'Status', ''].map(label => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{visibleRows.map(row => <tr key={row.user.id} onClick={() => navigate(`/marketing/users/${row.user.id}/accounts`)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"><td className="px-4 py-3"><b className="block text-slate-800">{row.user.name || 'Marketing user'}</b><span className="text-xs text-slate-500">{row.user.email}</span></td><td className="px-4 py-3">{row.planName || 'No plan'}{row.billingCycle && <small className="mt-1 block text-xs text-slate-500">{row.billingCycle}</small>}</td><td className="px-4 py-3">{money(row.amount,row.currency)}<small className="mt-1 block text-xs text-slate-500">{dateLabel(row.paidAt)}</small></td><td className="px-4 py-3">{dateLabel(row.renewalDate)}</td><td className="px-4 py-3">{row.payments}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${statusStyle(row.status)}`}>{row.status === 'none' ? 'No plan' : row.status}</span></td><td className="px-4 py-3 text-blue-700"><ArrowUpRight size={16}/></td></tr>)}{!loading && !visibleRows.length && <tr><td colSpan="7" className="px-5 py-12 text-center text-sm text-slate-500">No Marketing subscriptions match this filter.</td></tr>}</tbody></table>{loading && <p className="p-8 text-center text-sm text-slate-500">Loading subscriptions…</p>}</div>
    </section>
    {formOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setFormOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="marketing-plan-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 id="marketing-plan-title" className="text-lg font-bold text-slate-900">{editingPlanId ? 'Edit Marketing plan' : 'Create Marketing plan'}</h2><p className="mt-1 text-xs text-slate-500">This plan is available to Marketing website subscriptions.</p></div><button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div>{formError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}<form onSubmit={savePlan} className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-semibold text-slate-600 sm:col-span-2">Plan name<input required maxLength="80" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Starter, Pro, Business" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-blue-500"/></label><label className="grid gap-1.5 text-xs font-semibold text-slate-600 sm:col-span-2">Description<textarea rows="2" maxLength="300" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="What is included in this plan?" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-blue-500"/></label><label className="grid gap-1.5 text-xs font-semibold text-slate-600">Price type<select value={form.priceMode} onChange={event => setForm(current => ({ ...current, priceMode: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"><option value="fixed">Fixed amount</option><option value="percent">Percentage of website price</option></select></label>{form.priceMode === 'fixed' ? <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Amount (₹)<input required type="number" min="1" step="0.01" value={form.fixedAmount} onChange={event => setForm(current => ({ ...current, fixedAmount: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"/></label> : <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Percentage (%)<input required type="number" min="1" max="100" value={form.percent} onChange={event => setForm(current => ({ ...current, percent: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"/></label>}<label className="grid gap-1.5 text-xs font-semibold text-slate-600">Duration<input required type="number" min="1" max="3650" value={form.durationValue} onChange={event => setForm(current => ({ ...current, durationValue: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"/></label><label className="grid gap-1.5 text-xs font-semibold text-slate-600">Duration unit<select value={form.durationUnit} onChange={event => setForm(current => ({ ...current, durationUnit: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"><option value="day">Days</option><option value="month">Months</option><option value="year">Years</option></select></label><label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2"><input type="checkbox" checked={form.isDefault} onChange={event => setForm(current => ({ ...current, isDefault: event.target.checked }))}/>Make this the default Marketing plan</label><div className="flex justify-end gap-2 pt-2 sm:col-span-2"><button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : (editingPlanId ? 'Save changes' : 'Create plan')}</button></div></form></section></div>}
  </main>;
}
