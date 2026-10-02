import { useEffect, useState } from 'react';
import { CreditCard, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import api from '../../api/axios';
import NavyToggle from '../../WebAdmin/Qucik commerce/components/NavyToggle';
import { LIST_CARD_BORDER as CARD_BORDER, listBtnNavy, listBtnOutline, listTheadClass, listTheadStyle, listThClass, listTdClass } from '../../constants/listTheme';

const EMPTY_PLAN = { name: '', description: '', priceMode: 'percent', percent: 30, fixedAmount: 0, durationValue: 30, durationUnit: 'day', status: true, isDefault: false };
const fieldClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export default function WebsiteSubscriptionPlansPage() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(EMPTY_PLAN);
  const [editingId, setEditingId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/website-subscription-plans');
      setPlans(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Subscription plans could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditingId('');
    setForm(EMPTY_PLAN);
    setError('');
    setFormOpen(true);
  };

  const openEdit = plan => {
    setEditingId(plan._id);
    setForm({ ...EMPTY_PLAN, ...plan, priceMode: plan.priceMode || 'percent', percent: Number(plan.percent) || 30, fixedAmount: Number(plan.fixedAmount) || 0, durationValue: Number(plan.durationValue) || 30, durationUnit: plan.durationUnit || 'day' });
    setError('');
    setFormOpen(true);
  };

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) await api.put(`/website-subscription-plans/${editingId}`, form);
      else await api.post('/website-subscription-plans', form);
      await load();
      setFormOpen(false);
      setEditingId('');
      setForm(EMPTY_PLAN);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Subscription plan could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async plan => {
    try {
      await api.put(`/website-subscription-plans/${plan._id}`, { status: plan.status === false });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Plan status could not be updated.');
    }
  };

  const removePlan = async plan => {
    if (!window.confirm(`Delete ${plan.name}?`)) return;
    try {
      await api.delete(`/website-subscription-plans/${plan._id}`);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Plan could not be deleted.');
    }
  };

  return <main className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="flex items-center gap-2 text-xl font-bold text-slate-900"><CreditCard size={21} className="text-blue-800"/>Website Subscription Plans</h1><p className="mt-1 text-sm text-slate-500">Set the upfront percentage charged from the full website amount.</p></div>
      {!formOpen && <button type="button" onClick={openAdd} className={'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white ' + listBtnNavy}><Plus size={16}/>Add Plan</button>}
    </div>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    {formOpen && <form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-5 shadow-sm" style={{ borderColor: CARD_BORDER }}>
      <div className="flex items-center justify-between"><h2 className="font-semibold text-slate-900">{editingId ? 'Edit plan' : 'Add subscription plan'}</h2><button type="button" onClick={() => setFormOpen(false)} aria-label="Close form" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Plan name<input required maxLength={80} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} className={`${fieldClass} mt-1`}/></label>
        <label className="text-sm font-medium text-slate-700">Charge type<select value={form.priceMode} onChange={event => setForm(current => ({ ...current, priceMode: event.target.value }))} className={`${fieldClass} mt-1`}><option value="percent">Percentage of website total</option><option value="fixed">Fixed amount</option></select></label>
        {form.priceMode === 'percent'
          ? <label className="text-sm font-medium text-slate-700">Upfront percentage<input required type="number" min="1" max="100" step="0.01" value={form.percent} onChange={event => setForm(current => ({ ...current, percent: Number(event.target.value) }))} className={`${fieldClass} mt-1`}/></label>
          : <label className="text-sm font-medium text-slate-700">Fixed amount (₹)<input required type="number" min="1" step="0.01" value={form.fixedAmount} onChange={event => setForm(current => ({ ...current, fixedAmount: Number(event.target.value) }))} className={`${fieldClass} mt-1`}/></label>}
        <label className="text-sm font-medium text-slate-700">Subscription duration<input required type="number" min="1" max="3650" step="1" placeholder="30" value={form.durationValue ?? ''} onChange={event => setForm(current => ({ ...current, durationValue: event.target.value === '' ? '' : Number(event.target.value) }))} className={`${fieldClass} mt-1`}/></label>
        <label className="text-sm font-medium text-slate-700">Duration unit<select value={form.durationUnit} onChange={event => setForm(current => ({ ...current, durationUnit: event.target.value }))} className={`${fieldClass} mt-1`}><option value="day">Days</option><option value="month">Months</option><option value="year">Years</option></select></label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Description<textarea rows="2" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} className={`${fieldClass} mt-1`}/></label>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700"><NavyToggle checked={form.status} onChange={status => setForm(current => ({ ...current, status }))}/>Available to website users</label>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700"><NavyToggle checked={form.isDefault} onChange={isDefault => setForm(current => ({ ...current, isDefault }))}/>Default plan</label>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setFormOpen(false)} className={'rounded-lg px-4 py-2 text-sm ' + listBtnOutline}>Cancel</button><button disabled={saving} className={'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ' + listBtnNavy}><Save size={15}/>{saving ? 'Saving...' : 'Save Plan'}</button></div>
    </form>}
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: CARD_BORDER }}>
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Plans</h2><p className="mt-0.5 text-xs text-slate-500">{plans.length} plans</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm"><thead><tr className={listTheadClass} style={listTheadStyle}><th className={listThClass}>Plan</th><th className={listThClass}>Charge</th><th className={listThClass}>Duration</th><th className={listThClass}>Status</th><th className={listThClass + ' text-right'}>Actions</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan="5" className="px-5 py-10 text-center text-sm text-slate-400">Loading plans...</td></tr> : plans.length === 0 ? <tr><td colSpan="5" className="px-5 py-10 text-center text-sm text-slate-400">No subscription plans yet.</td></tr> : plans.map(plan => <tr key={plan._id} className="border-b border-slate-100 last:border-0"><td className={listTdClass}><p className="font-semibold text-slate-800">{plan.name}{plan.isDefault && <span className="ml-2 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">DEFAULT</span>}</p>{plan.description && <p className="mt-0.5 text-xs text-slate-500">{plan.description}</p>}</td><td className={listTdClass + ' font-semibold'}>{plan.priceMode === 'fixed' ? `₹${Number(plan.fixedAmount || 0).toLocaleString('en-IN')}` : `${plan.percent}% of total`}</td><td className={listTdClass}>{plan.durationValue || 30} {plan.durationUnit || 'days'}</td><td className={listTdClass}><NavyToggle checked={plan.status !== false} onChange={() => toggleStatus(plan)}/></td><td className={listTdClass}><div className="flex justify-end gap-2"><button type="button" title="Edit plan" onClick={() => openEdit(plan)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 text-blue-700"><Pencil size={15}/></button><button type="button" title="Delete plan" onClick={() => removePlan(plan)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 text-rose-600"><Trash2 size={15}/></button></div></td></tr>)}</tbody>
      </table></div>
    </section>
  </main>;
}