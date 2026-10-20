import { useEffect, useMemo, useState } from 'react';
import { Archive, Plus, Save, Trash2, UploadCloud } from 'lucide-react';
import api from '../../api/axios';
import { listBtnNavy } from '../../constants/listTheme';
import { useModuleStore } from '../../store/useStore';

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const makePlanId = () => globalThis.crypto?.randomUUID?.() || `on-domain-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function OnDomainAdminPage() {
  const { activeModule } = useModuleStore();
  const [modules, setModules] = useState([]);
  const [moduleId, setModuleId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [freeMode, setFreeMode] = useState(false);
  const [paymentEnabled, setPaymentEnabled] = useState(true);
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false);
  const [domainPlans, setDomainPlans] = useState([]);
  const [stepsText, setStepsText] = useState('');
  const [zipFile, setZipFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selectedModule = useMemo(() => {
    if (!modules.length) return null;
    const activeKey = String(activeModule?.slug || activeModule?.type || '').trim().toLowerCase().replace(/_/g, '-');
    const matchByActive = modules.find(module => {
      const moduleKey = String(module.slug || module.type || '').trim().toLowerCase().replace(/_/g, '-');
      if (module._id && activeModule?._id && String(module._id) === String(activeModule._id)) return true;
      if (module.id && activeModule?.id && String(module.id) === String(activeModule.id)) return true;
      if (moduleKey && activeKey && moduleKey === activeKey) return true;
      if (module.name && activeModule?.name && module.name.toLowerCase() === activeModule.name.toLowerCase()) return true;
      return false;
    });
    return matchByActive || modules.find(module => String(module._id) === String(moduleId)) || modules[0] || null;
  }, [activeModule, moduleId, modules]);

  useEffect(() => {
    let active = true;
    api.get('/website-modules').then(({ data }) => {
      if (!active) return;
      const list = Array.isArray(data) ? data : [];
      setModules(list);
      const activeKey = String(activeModule?.slug || activeModule?.type || '').trim().toLowerCase().replace(/_/g, '-');
      const matched = list.find(module => {
        const moduleKey = String(module.slug || module.type || '').trim().toLowerCase().replace(/_/g, '-');
        if (module._id && activeModule?._id && String(module._id) === String(activeModule._id)) return true;
        if (module.id && activeModule?.id && String(module.id) === String(activeModule.id)) return true;
        if (moduleKey && activeKey && moduleKey === activeKey) return true;
        return module.name && activeModule?.name && module.name.toLowerCase() === activeModule.name.toLowerCase();
      });
      setModuleId((matched || list[0])?._id || '');
    }).catch(requestError => {
      if (active) setError(requestError.response?.data?.message || 'Website modules could not be loaded.');
    });
    return () => { active = false; };
  }, [activeModule]);

  useEffect(() => {
    const hasPricingSettings = selectedModule?.onDomainFreeEnabled != null
      || selectedModule?.onDomainPaymentEnabled != null
      || selectedModule?.onDomainSubscriptionEnabled != null;
    const legacyFreeMode = !hasPricingSettings
      && selectedModule?.onDomainEnabled === true
      && !(Number(selectedModule?.onDomainPrice) > 0);
    setTitle(selectedModule?.onDomainTitle || '');
    setDescription(selectedModule?.onDomainDescription || '');
    setPrice(selectedModule?.onDomainPrice ?? '');
    setFreeMode(selectedModule?.onDomainFreeEnabled === true || legacyFreeMode);
    setPaymentEnabled(selectedModule?.onDomainPaymentEnabled != null
      ? selectedModule.onDomainPaymentEnabled === true
      : !legacyFreeMode && Number(selectedModule?.onDomainPrice) > 0);
    setSubscriptionEnabled(selectedModule?.onDomainSubscriptionEnabled === true);
    setDomainPlans(Array.isArray(selectedModule?.onDomainPlans) ? selectedModule.onDomainPlans.map(plan => ({ ...plan })) : []);
    setStepsText((selectedModule?.onDomainSteps || []).join('\n'));
    setZipFile(null);
    setError('');
    setNotice('');
  }, [moduleId]);

  const save = async event => {
    event.preventDefault();
    if (!selectedModule) return;
    const parsedPrice = Number(price);
    const pageEnabled = freeMode || paymentEnabled || subscriptionEnabled;
    if (pageEnabled && !freeMode && paymentEnabled && (!Number.isFinite(parsedPrice) || parsedPrice <= 0)) {
      setError('Set a one-time price greater than zero before enabling payment.');
      return;
    }
    if (pageEnabled && !freeMode && subscriptionEnabled && !domainPlans.length) {
      setError('Add at least one subscription plan before enabling subscriptions.');
      return;
    }
    const invalidPlan = domainPlans.find(plan => !String(plan.name || '').trim()
      || !Number.isFinite(Number(plan.price)) || Number(plan.price) <= 0
      || !Number.isInteger(Number(plan.durationValue)) || Number(plan.durationValue) < 1
      || Number(plan.durationValue) > 3650
      || !['day', 'month', 'year'].includes(plan.durationUnit));
    if (pageEnabled && !freeMode && subscriptionEnabled && invalidPlan) {
      setError('Each subscription needs a name, price, and valid duration in days, months, or years.');
      return;
    }
    const plansToSave = domainPlans.filter(plan => String(plan.name || '').trim()
      && Number(plan.price) > 0
      && Number.isInteger(Number(plan.durationValue))
      && Number(plan.durationValue) >= 1 && Number(plan.durationValue) <= 3650
      && ['day', 'month', 'year'].includes(plan.durationUnit));
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.put(`/website-modules/${selectedModule._id}`, {
        onDomainEnabled: pageEnabled,
        onDomainTitle: title,
        onDomainDescription: description,
        onDomainPrice: Number.isFinite(parsedPrice) ? parsedPrice : 0,
        onDomainFreeEnabled: freeMode,
        onDomainPaymentEnabled: !freeMode && paymentEnabled,
        onDomainSubscriptionEnabled: !freeMode && subscriptionEnabled,
        onDomainPlans: plansToSave.map(plan => ({
          id: String(plan.id || makePlanId()),
          name: String(plan.name || '').trim(),
          description: String(plan.description || '').trim(),
          price: Number(plan.price) || 0,
          durationValue: Number(plan.durationValue) || 30,
          durationUnit: plan.durationUnit || 'day',
        })),
        onDomainSteps: stepsText.split('\n').map(step => step.trim()).filter(Boolean).slice(0, 12),
      });
      setModules(current => current.map(module => module._id === data._id ? data : module));
      setDomainPlans(Array.isArray(data.onDomainPlans) ? data.onDomainPlans : domainPlans);
      setNotice('On Domain page settings saved for this module.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'On Domain settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const uploadPackage = async event => {
    event.preventDefault();
    if (!selectedModule || !zipFile) {
      setError('Choose a ZIP package before uploading.');
      return;
    }
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const formData = new FormData();
      formData.append('file', zipFile);
      const { data } = await api.post(`/website-modules/${selectedModule._id}/on-domain-package`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setModules(current => current.map(module => module._id === selectedModule._id
        ? { ...module, onDomainPackageOriginalName: data.packageName, onDomainEnabled: true }
        : module));
      setZipFile(null);
      setNotice(`ZIP package uploaded: ${data.packageName}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The ZIP package could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  const addSubscriptionPlan = () => setDomainPlans(current => [...current, {
    id: makePlanId(), name: '', description: '', price: '', durationValue: 30, durationUnit: 'day',
  }]);
  const updateSubscriptionPlan = (planId, field, value) => setDomainPlans(current => current.map(plan =>
    String(plan.id) === String(planId) ? { ...plan, [field]: value } : plan
  ));
  const removeSubscriptionPlan = planId => setDomainPlans(current => current.filter(plan => String(plan.id) !== String(planId)));

  return <main className="mx-auto max-w-5xl space-y-5">
    <header className="flex items-start gap-3">
      <span className="rounded-xl bg-blue-50 p-3 text-blue-800"><Archive size={21}/></span>
      <div><h1 className="text-xl font-bold text-slate-900">On Domain Page</h1><p className="mt-1 text-sm text-slate-500">Choose Free or Paid. Paid mode can offer one-time payment, multiple domain subscription plans, or both.</p></div>
    </header>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
    {!modules.length
      ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Add a Website Module before setting up its On Domain page.</p>
      : <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="block text-sm font-medium text-slate-700">Website module
            <div className={`${inputClass} mt-1 flex items-center justify-between bg-slate-50 text-slate-700`}>
              <span>{selectedModule?.name || activeModule?.name || 'Website module'}</span>
            </div>
          </div>
          <label className="block text-sm font-medium text-slate-700">Page heading
            <input maxLength={120} value={title} onChange={event => setTitle(event.target.value)} className={`${inputClass} mt-1`} placeholder="Get your website package"/>
          </label>
          <label className="block text-sm font-medium text-slate-700">Page description
            <textarea rows="4" maxLength={3000} value={description} onChange={event => setDescription(event.target.value)} className={`${inputClass} mt-1`} placeholder="Describe what's included in the website ZIP and how the customer uses it."/>
          </label>
          <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">On Domain pricing</legend>
            <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${freeMode ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
              <input type="radio" name="on-domain-pricing" checked={freeMode} onChange={() => setFreeMode(true)} className="mt-1 accent-emerald-600"/>
              <span><b className="block text-sm text-slate-800">Free</b><span className="mt-0.5 block text-xs text-slate-500">No payment or subscription. Free mode is exclusive.</span></span>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${!freeMode ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
              <input type="radio" name="on-domain-pricing" checked={!freeMode} onChange={() => setFreeMode(false)} className="mt-1 accent-blue-700"/>
              <span><b className="block text-sm text-slate-800">Paid options</b><span className="mt-0.5 block text-xs text-slate-500">Enable one-time payment, subscription plans, or both together.</span></span>
            </label>
          </fieldset>
          {!freeMode && <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <input type="checkbox" checked={paymentEnabled} onChange={event => setPaymentEnabled(event.target.checked)} className="mt-1 h-4 w-4 rounded accent-blue-700"/>
              <span className="flex-1"><b className="block text-sm text-slate-800">One-time payment</b><span className="mt-0.5 block text-xs text-slate-500">Keep the current Pay and Get ZIP option and one-time domain hosting payment.</span>
                {paymentEnabled && <input required min="0.01" max="10000000" type="number" step="0.01" value={price} onChange={event => setPrice(event.target.value)} className={`${inputClass} mt-3 bg-white`} placeholder="4999" aria-label="One-time package and domain price in INR"/>}
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <input type="checkbox" checked={subscriptionEnabled} onChange={event => setSubscriptionEnabled(event.target.checked)} className="mt-1 h-4 w-4 rounded accent-blue-700"/>
              <span><b className="block text-sm text-slate-800">Subscription plans</b><span className="mt-0.5 block text-xs text-slate-500">Customers can choose a plan and pay to host their tenant website for its duration.</span></span>
            </label>
            {subscriptionEnabled && <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-slate-800">On Domain subscription plans</h3><p className="mt-0.5 text-xs text-slate-500">Add up to 20 paid plans. Each plan sets its own price and duration.</p></div><button type="button" onClick={addSubscriptionPlan} disabled={domainPlans.length >= 20} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={14}/>Add plan</button></div>
              {!domainPlans.length && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Add at least one plan to turn on subscriptions.</p>}
              {domainPlans.map((plan, index) => <article key={plan.id || index} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">Plan name<input required maxLength="80" value={plan.name} onChange={event => updateSubscriptionPlan(plan.id, 'name', event.target.value)} className={`${inputClass} mt-1 bg-white`} placeholder="Monthly hosting"/></label>
                <label className="text-xs font-semibold text-slate-600">Price (INR)<input required min="0.01" max="10000000" type="number" step="0.01" value={plan.price} onChange={event => updateSubscriptionPlan(plan.id, 'price', event.target.value)} className={`${inputClass} mt-1 bg-white`} placeholder="499"/></label>
                <label className="text-xs font-semibold text-slate-600">Duration<input required min="1" max="3650" type="number" step="1" value={plan.durationValue} onChange={event => updateSubscriptionPlan(plan.id, 'durationValue', event.target.value)} className={`${inputClass} mt-1 bg-white`} placeholder="30"/></label>
                <label className="text-xs font-semibold text-slate-600">Duration unit<select value={plan.durationUnit} onChange={event => updateSubscriptionPlan(plan.id, 'durationUnit', event.target.value)} className={`${inputClass} mt-1 bg-white`}><option value="day">Days</option><option value="month">Months</option><option value="year">Years</option></select></label>
                <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Description (optional)<input maxLength="240" value={plan.description || ''} onChange={event => updateSubscriptionPlan(plan.id, 'description', event.target.value)} className={`${inputClass} mt-1 bg-white`} placeholder="Hosting and SSL included"/></label>
                <div className="flex justify-end sm:col-span-2"><button type="button" onClick={() => removeSubscriptionPlan(plan.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Trash2 size={13}/>Remove plan</button></div>
              </article>)}
            </div>}
          </div>}
          <label className="block text-sm font-medium text-slate-700">Purchase and delivery steps <span className="font-normal text-slate-400">(one step per line)</span>
            <textarea rows="5" maxLength={3000} value={stepsText} onChange={event => setStepsText(event.target.value)} className={`${inputClass} mt-1`} placeholder={'Enter a custom domain you own.\nPay securely using the checkout.\nWEPZO hosts the published tenant website after payment.\nPoint the domain DNS to WEPZO hosting so SSL can activate.'}/>
          </label>
          <p className="rounded-lg bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-800">The customer On Domain page turns on automatically when Free hosting, one-time payment, or a subscription plan is active.</p>
          <button type="submit" disabled={saving || !selectedModule} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${listBtnNavy}`}><Save size={16}/>{saving ? 'Saving...' : 'Save On Domain Settings'}</button>
        </form>

        <div className="space-y-5">
          <form onSubmit={uploadPackage} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div><h2 className="font-semibold text-slate-900">Website source ZIP</h2><p className="mt-1 text-xs leading-5 text-slate-500">Upload the module's ready-to-host website source package. It is stored privately and is only downloadable by customers after payment is verified. ZIP files are not extracted or run on the server.</p></div>
            <label className="block text-sm font-medium text-slate-700">Choose ZIP file
              <input type="file" accept=".zip,application/zip" onChange={event => setZipFile(event.target.files?.[0] || null)} className={`${inputClass} mt-1 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-800`}/>
            </label>
            <p className="text-xs text-slate-500">Current package: <span className="font-semibold text-slate-700">{selectedModule?.onDomainPackageOriginalName || 'No ZIP uploaded'}</span></p>
            <button type="submit" disabled={uploading || !zipFile} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><UploadCloud size={16}/>{uploading ? 'Uploading...' : 'Upload ZIP Package'}</button>
          </form>
          <section className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <h2 className="text-sm font-bold text-blue-950">Customer download locations</h2>
            <ul className="mt-3 space-y-2 text-xs text-blue-900"><li>1. On Domain page, immediately after successful payment</li><li>2. Website Dashboard</li><li>3. Plan & Subscription page</li></ul>
            <p className="mt-3 text-[11px] leading-5 text-blue-800">Each module has its own price and ZIP. Users cannot download another module’s package or access the download before payment verification.</p>
          </section>
        </div>
      </div>}
  </main>;
}
