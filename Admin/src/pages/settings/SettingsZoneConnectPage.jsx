import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Pencil, Plus, Save, Trash2, Truck } from 'lucide-react';
import api from '../../api/axios';
import SearchableMultiSelect from '../../WebAdmin/Qucik commerce/components/SearchableMultiSelect';
import { listBtnNavy, listBtnOutline } from '../../constants/listTheme';

const PAYMENT_OPTIONS = [
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'digital', label: 'Digital Payment' },
];

const EMPTY_RULE = {
  chargeMode: 'fixed',
  amount: '',
  perKmCharge: '',
  minimumKm: '',
  minimumDeliveryCharge: '',
  pickupRadiusKm: '',
  dropRadiusKm: '',
  freeAbove: '',
  deliveryFree: false,
  freeDeliveryPayer: 'customer',
};

const asArray = value => Array.isArray(value) ? value : [];
const amountLabel = rule => rule.deliveryFree
  ? 'Free'
  : rule.chargeMode === 'per_km'
    ? `₹${Number(rule.amount) || 0} + ₹${Number(rule.perKmCharge) || 0}/km`
    : `₹${Number(rule.amount) || 0}`;

export default function SettingsZoneConnectPage() {
  const { zoneId } = useParams();
  const [zone, setZone] = useState(null);
  const [modules, setModules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [openModule, setOpenModule] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingConnections, setSavingConnections] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const moduleOptions = useMemo(() => modules
    .filter(module => module.status !== false)
    .map(module => ({ value: module.slug, label: module.name })), [modules]);

  const loadRules = async () => {
    const { data } = await api.get(`/zones/${zoneId}/delivery-rules`);
    setRules(asArray(data));
  };

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/zones/${zoneId}`),
      api.get('/system-modules').catch(() => ({ data: [] })),
      api.get('/categories').catch(() => ({ data: [] })),
      api.get('/settings/business').catch(() => ({ data: {} })),
      api.get(`/zones/${zoneId}/delivery-rules`).catch(() => ({ data: [] })),
    ]).then(([zoneResponse, moduleResponse, categoryResponse, settingsResponse, rulesResponse]) => {
      if (!live) return;
      const currentZone = zoneResponse.data;
      const settings = settingsResponse.data || {};
      setZone(currentZone);
      setModules(asArray(moduleResponse.data));
      setCategories(asArray(categoryResponse.data).filter(category => category.status !== false));
      setRules(asArray(rulesResponse.data));
      setPaymentMethods(Array.isArray(currentZone.paymentMethods)
        ? currentZone.paymentMethods
        : [
            ...(settings.codEnabled !== false ? ['cod'] : []),
            ...(settings.onlinePaymentEnabled !== false ? ['digital'] : []),
          ]);
    }).catch(() => {
      if (live) setError('Zone load nahi hua. Zone list se dobara open karein.');
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [zoneId]);

  const saveConnections = async () => {
    if (!paymentMethods.length) {
      setError('At least one payment method select karein.');
      return false;
    }
    setSavingConnections(true);
    setError('');
    try {
      const { data } = await api.put(`/zones/${zoneId}`, {
        modules: paymentMethods.length ? selectedModules : [],
        paymentMethods,
      });
      setZone(data);
      setNotice('Module aur payment settings save ho gayi.');
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Module settings save nahi hui.');
      return false;
    } finally {
      setSavingConnections(false);
    }
  };

  const selectedModules = zone?.modules || [];
  const setSelectedModules = values => setZone(current => current ? { ...current, modules: values } : current);

  if (loading) return <div className="py-20 text-center text-gray-400">Loading zone connections...</div>;
  if (!zone) return (
    <div className="h-full min-h-[520px] rounded-xl border border-[#dfeaf3] bg-[#eaf1f6] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] lg:p-6">
      <Link to="/settings/zones" className="inline-flex items-center gap-2 text-[15px] font-medium text-[#4b5563] transition hover:text-[#1f2937]">
        <ArrowLeft size={16} />
        <span>Back to zones</span>
      </Link>

      <div className="mt-8">
        <p className="text-[14px] font-medium text-[#e11d48]">{error || 'Zone not found.'}</p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1550px] space-y-5 pb-8">
      <div className="rounded-xl border border-[#dfe7ef] bg-[#edf3f7] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link to="/settings/zones" className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={15} /> Zones</Link>
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-slate-900">Connect Module With {zone.city || zone.name}</h1>
            <p className="mt-2 text-[15px] text-slate-600">Here you connect your modules &amp; setup the delivery charges for this zone.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Zone {zone.zoneId} · {zone.name}</span>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <section className="rounded-xl border border-[#dfe7ef] bg-white p-4 shadow-sm lg:p-5">
        <h2 className="text-[17px] font-bold text-slate-900">Select Payment Method</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(260px,0.9fr)_minmax(320px,1.6fr)]">
          <div className={`flex min-h-[52px] items-center rounded-lg border border-[#e3dca8] bg-[#fff7d6] px-3 py-2 text-sm text-[#7a6b1a] ${paymentMethods.length ? 'border-[#e3dca8]' : 'border-[#f0d089]'}`}>
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#f5d76b] text-[11px] font-bold text-[#7a6b1a]">i</span>
            <span className="font-medium">Must select at least one payment method.</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {PAYMENT_OPTIONS.map(option => (
              <label key={option.value} className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 rounded-lg border border-[#dfe7ef] bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-[4px] border ${paymentMethods.includes(option.value) ? 'border-[#2d6cdf] bg-[#2d6cdf]' : 'border-[#b7c3d0] bg-white'}`}>
                    {paymentMethods.includes(option.value) && <span className="h-2 w-2 rounded-[2px] bg-white" />}
                  </span>
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#dfe7ef] bg-white p-4 shadow-sm lg:p-5">
        <h3 className="mb-3 text-[17px] font-bold text-slate-900">Choose Business Module To Connect</h3>
        {moduleOptions.length ? (
          <div className="rounded-lg border border-[#dfe7ef] bg-[#f8fafc] p-3">
            <SearchableMultiSelect values={selectedModules} onChange={setSelectedModules} options={moduleOptions} placeholder="Search and select modules" className="w-full" />
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">No active modules are available. Add modules in System Module first.</p>
        )}

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={saveConnections} disabled={savingConnections || !paymentMethods.length} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}>
            <Save size={15} /> {savingConnections ? 'Saving...' : 'Save Connections'}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 pt-1"><Truck size={18} className="text-slate-600" /><h2 className="text-[18px] font-bold text-slate-900">Delivery Charge Setup</h2></div>
        {selectedModules.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500">Select modules above; their delivery settings will appear here.</div> : selectedModules.map(slug => {
          const module = moduleOptions.find(option => option.value === slug) || { value: slug, label: slug };
          const moduleRules = rules.filter(rule => (rule.modules || [rule.module]).includes(slug));
          return <ModuleDeliveryPanel key={slug} zoneId={zoneId} module={module} rules={moduleRules} categories={categories} expanded={openModule === slug} onToggle={() => setOpenModule(current => current === slug ? '' : slug)} onRefresh={loadRules} ensureConnections={saveConnections} />;
        })}
      </section>
    </div>
  );
}

function ModuleDeliveryPanel({ zoneId, module, rules, categories, expanded, onToggle, onRefresh, ensureConnections }) {
  const [form, setForm] = useState(EMPTY_RULE);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const startEdit = rule => {
    setEditingId(rule._id);
    setForm({
      ...EMPTY_RULE,
      chargeMode: rule.chargeMode || 'fixed',
      amount: rule.amount ?? '',
      perKmCharge: rule.perKmCharge ?? '',
      minimumKm: rule.minimumKm ?? '',
      minimumDeliveryCharge: rule.minimumDeliveryCharge ?? '',
      pickupRadiusKm: rule.pickupRadiusKm ?? '',
      dropRadiusKm: rule.dropRadiusKm ?? '',
      freeAbove: rule.freeAbove ?? '',
      deliveryFree: !!rule.deliveryFree,
      freeDeliveryPayer: rule.freeDeliveryPayer || 'customer',
    });
    onToggle();
  };

  const saveRule = async event => {
    event.preventDefault();
    if (!form.deliveryFree && form.chargeMode === 'fixed' && form.amount === '') return setError('Delivery charge bharo.');
    if (!form.deliveryFree && form.chargeMode === 'per_km' && form.perKmCharge === '') return setError('Per KM charge bharo.');
    setSaving(true);
    setError('');
    try {
      if (!await ensureConnections()) return;
      const payload = {
        ...form,
        modules: [module.value],
        scope: 'zone',
        categories: [],
        amount: form.deliveryFree || form.amount === '' ? 0 : Number(form.amount),
        perKmCharge: Number(form.perKmCharge) || 0,
        minimumKm: Number(form.minimumKm) || 0,
        minimumDeliveryCharge: Number(form.minimumDeliveryCharge) || 0,
        pickupRadiusKm: form.pickupRadiusKm === '' ? null : Number(form.pickupRadiusKm),
        dropRadiusKm: form.dropRadiusKm === '' ? null : Number(form.dropRadiusKm),
        freeAbove: form.freeAbove === '' ? null : Number(form.freeAbove),
      };
      if (editingId) await api.put(`/zones/${zoneId}/delivery-rules/${editingId}`, payload);
      else await api.post(`/zones/${zoneId}/delivery-rules`, payload);
      setForm(EMPTY_RULE);
      setEditingId('');
      await onRefresh();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Delivery rule save nahi hua.');
    } finally {
      setSaving(false);
    }
  };

  const removeRule = async rule => {
    if (!confirm(`${module.label} delivery rule delete karna hai?`)) return;
    try {
      await api.delete(`/zones/${zoneId}/delivery-rules/${rule._id}`);
      await onRefresh();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Delivery rule delete nahi hua.');
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe7ef] bg-white shadow-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-[#f8fafc]">
        <span className="text-[18px] font-bold text-slate-800">{module.label}</span>
        {expanded ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
      </button>
      {expanded && <div className="space-y-4 border-t p-5" style={{ borderColor: '#e5edf2' }}>
        {rules.length > 0 && <div className="overflow-x-auto rounded-lg border" style={{ borderColor: '#e5edf2' }}><table className="w-full min-w-[760px] text-sm">
          <thead><tr className="bg-slate-50 text-left text-xs text-slate-500"><th className="px-4 py-2.5">Charge</th><th className="px-4 py-2.5">Mode</th><th className="px-4 py-2.5">Pickup km</th><th className="px-4 py-2.5">Drop km</th><th className="px-4 py-2.5">Free Above</th><th className="px-4 py-2.5">Actions</th></tr></thead>
          <tbody>{rules.map(rule => <tr key={rule._id} className="border-t" style={{ borderColor: '#e5edf2' }}><td className="px-4 py-3 font-semibold text-slate-800">{amountLabel(rule)}</td><td className="px-4 py-3">{rule.deliveryFree ? 'Free' : rule.chargeMode === 'per_km' ? 'Per KM' : 'Fixed'}</td><td className="px-4 py-3">{Number(rule.pickupRadiusKm) > 0 ? `${rule.pickupRadiusKm} km` : 'No limit'}</td><td className="px-4 py-3">{Number(rule.dropRadiusKm) > 0 ? `${rule.dropRadiusKm} km` : 'No limit'}</td><td className="px-4 py-3">{rule.freeAbove == null ? '—' : `₹${rule.freeAbove}`}</td><td className="px-4 py-3"><button type="button" onClick={() => startEdit(rule)} className="mr-3 inline-flex items-center gap-1 text-blue-700"><Pencil size={14} />Edit</button><button type="button" onClick={() => removeRule(rule)} className="inline-flex items-center gap-1 text-rose-600"><Trash2 size={14} />Delete</button></td></tr>)}</tbody>
        </table></div>}
        <form onSubmit={saveRule} className="space-y-4">
          <h3 className="font-medium text-slate-800">{editingId ? `Edit ${module.label} charge` : `Add ${module.label} charge`}</h3>
          <div className="flex flex-wrap gap-4 border-b pb-3" style={{ borderColor: '#e5edf2' }}>{[['fixed', 'Fixed Charge'], ['per_km', 'Per KM'], ['free', 'Delivery Free']].map(([value, label]) => <label key={value} className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="radio" checked={value === 'free' ? form.deliveryFree : !form.deliveryFree && form.chargeMode === value} onChange={() => setForm(current => ({ ...current, deliveryFree: value === 'free', chargeMode: value === 'free' ? current.chargeMode : value }))} className="accent-blue-600" />{label}</label>)}</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {!form.deliveryFree && form.chargeMode === 'fixed' && <Field label="Delivery Charge (₹)" value={form.amount} onChange={value => set('amount', value)} />}
            {!form.deliveryFree && form.chargeMode === 'per_km' && <><Field label="Base Amount (₹)" value={form.amount} onChange={value => set('amount', value)} /><Field label="Per KM Charge (₹)" value={form.perKmCharge} onChange={value => set('perKmCharge', value)} /><Field label="Minimum KM" value={form.minimumKm} onChange={value => set('minimumKm', value)} /><Field label="Minimum Charge (₹)" value={form.minimumDeliveryCharge} onChange={value => set('minimumDeliveryCharge', value)} /></>}
            <Field label="Free Delivery Above (₹)" value={form.freeAbove} onChange={value => set('freeAbove', value)} />
            <Field label="Rider Pickup Radius (km)" value={form.pickupRadiusKm} onChange={value => set('pickupRadiusKm', value)} />
            <Field label="Customer Drop Radius (km)" value={form.dropRadiusKm} onChange={value => set('dropRadiusKm', value)} />
          </div>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => { setForm(EMPTY_RULE); setEditingId(''); setError(''); }} className={`rounded-lg px-4 py-2 text-sm ${listBtnOutline}`}>Reset</button><button disabled={saving} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Plus size={15} />{saving ? 'Saving...' : editingId ? 'Update Rule' : 'Add Rule'}</button></div>
        </form>
      </div>}
    </div>
  );
}

function Field({ label, value, onChange }) {
  return <label className="text-xs font-semibold text-slate-600">{label}<input type="number" min="0" step="0.01" value={value} onChange={event => onChange(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-blue-400" style={{ borderColor: '#d4e0e8' }} /></label>;
}