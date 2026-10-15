import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, Trash2, Pencil, X, Truck } from 'lucide-react';
import api from '../../api/axios';
import { useModuleStore } from '../../store/useStore';
import { getAdminModuleKey } from '../../constants/adminModules';
import { LIST_CARD_BORDER as CARD_BORDER, listBtnNavy } from '../../constants/listTheme';

const EMPTY_FORM = {
  scope: 'zone',
  categories: [],
  modules: [],
  moduleId: '',
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function chargeLabel(rule) {
  if (!rule) return '—';
  if (rule.deliveryFree) return 'Free';
  if (rule.chargeMode === 'per_km') {
    const base = Number(rule.amount) ? `Rs ${rule.amount} + ` : '';
    return `${base}Rs ${rule.perKmCharge || 0}/km`;
  }
  return `Rs ${rule.amount ?? 0}`;
}

export default function SettingsDeliveryPage() {
  const [params, setParams] = useSearchParams();
  const { activeModule } = useModuleStore();
  const isEcommerce = getAdminModuleKey(activeModule) === 'e-commerce';
  const [zones, setZones] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modules, setModules] = useState([]);
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [rulesLoaded, setRulesLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [rulesLoadError, setRulesLoadError] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  const zoneList = asArray(zones);
  const categoryList = asArray(categories);
  const moduleList = asArray(modules).filter(item => item.status !== false);
  const ruleList = asArray(rules);
  const visibleRuleList = moduleFilter
    ? ruleList.filter(rule => (rule.modules || (rule.module ? [rule.module] : [])).includes(moduleFilter))
    : ruleList;
  const cities = useMemo(
    () => [...new Set(zoneList.map(item => item.city).filter(Boolean))],
    [zoneList],
  );
  const allIndiaZone = zoneList.find(item =>
    String(item.commerceType || '').toLowerCase().replace(/[-_]/g, '') === 'ecommerce'
    && item.status !== false
    && (item.countryWide === true || ['country', 'india', 'all-india', 'all_india'].includes(String(item.scope || '').toLowerCase()))
  ) || zoneList.find(item =>
    String(item.commerceType || '').toLowerCase().replace(/[-_]/g, '') === 'ecommerce' && item.status !== false
  );

  const selectedCity = isEcommerce ? '' : params.get('city') || '';
  const requestedZoneId = params.get('zoneId') || '';
  const requestedZone = zoneList.find(item =>
    String(item._id) === requestedZoneId || String(item.zoneId) === requestedZoneId
  );
  const selectedEcommerceZone = requestedZone
    && String(requestedZone.commerceType || '').toLowerCase().replace(/[-_]/g, '') === 'ecommerce'
    ? requestedZone
    : allIndiaZone;
  const zoneId = isEcommerce ? (selectedEcommerceZone?._id || '') : params.get('zoneId') || (selectedCity ? 'all-city' : '');
  const zone = zoneList.find(item => String(item._id) === String(zoneId));

  const loadZones = async () => {
    const { data } = await api.get('/zones');
    const next = asArray(data);
    setZones(next);
    return next;
  };

  const loadRules = async (id, city) => {
    setRulesLoaded(false);
    setRulesLoadError('');
    try {
      if (id === 'all-city') {
        const { data } = await api.get('/zones/delivery-rules', { params: { city } });
        setRules(asArray(data));
        return;
      }
      if (!id || id === 'all-city') {
        setRules([]);
        return;
      }
      const { data } = await api.get(`/zones/${id}/delivery-rules`);
      setRules(asArray(data));
    } catch (error) {
      setRules([]);
      setRulesLoadError(error.response?.data?.message || 'Delivery rules load nahi hue. Refresh karke dobara try karein.');
    } finally {
      setRulesLoaded(true);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoadError('');
    Promise.all([
      loadZones().catch(() => {
        if (!cancelled) setLoadError('Zones load nahi hue. API (5000) check karo.');
        return [];
      }),
      api.get('/categories').then(({ data }) => {
        if (!cancelled) setCategories(asArray(data));
      }).catch(() => {
        if (!cancelled) setCategories([]);
      }),
      api.get('/system-modules').then(({ data }) => {
        if (!cancelled) setModules(asArray(data));
      }).catch(() => {
        if (!cancelled) setModules([]);
      }),
    ]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!zoneList.length) return;
    if (isEcommerce) {
      if (selectedEcommerceZone && requestedZoneId !== selectedEcommerceZone._id) {
        setParams({ zoneId: selectedEcommerceZone._id }, { replace: true });
      }
      return;
    }
    const rawId = params.get('zoneId');
    if (!rawId || rawId === 'all-city') return;
    const match = zoneList.find(item => item._id === rawId || String(item.zoneId) === rawId);
    if (!match || !match.city) return;
    if (params.get('city') === match.city && params.get('zoneId') === match._id) return;
    setParams({ city: match.city, zoneId: match._id }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only hydrate once zones arrive; params in deps loops
  }, [zoneList, isEcommerce, selectedEcommerceZone, requestedZoneId, setParams, params]);

  useEffect(() => {
    loadRules(zoneId, selectedCity);
    setEditingId(null);
    setEditingZoneId(null);
    setForm(EMPTY_FORM);
  }, [zoneId, selectedCity]);
  const showEcommerceRuleForm = !isEcommerce || (rulesLoaded && !rulesLoadError && (!ruleList.length || Boolean(editingId)));

  const chooseCity = (city) => setParams(city ? { city, zoneId: 'all-city' } : {});
  const chooseZone = (id) => setParams({ city: selectedCity, zoneId: id });
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const toggleCategory = (value) => set('categories', value === 'all'
    ? (form.categories.includes('all') ? [] : ['all'])
    : [...form.categories.filter(item => item !== 'all'), ...(form.categories.includes(value) ? [] : [value])]);
  const selectModule = (value) => {
    const selected = moduleList.find(item => String(item._id) === value);
    setForm(current => ({
      ...current,
      moduleId: selected?._id || '',
      modules: selected?.slug ? [selected.slug] : [],
    }));
  };

  const editRule = (rule) => {
    setEditingId(rule._id);
    setEditingZoneId(rule._zoneId || zoneId);
    setForm({
      scope: isEcommerce ? 'zone' : rule.scope || 'zone',
      categories: isEcommerce ? [] : asArray(rule.categories),
      modules: isEcommerce ? [] : asArray(rule.modules || (rule.module ? [rule.module] : [])),
      moduleId: isEcommerce ? '' : rule.moduleId || moduleList.find(item => item.slug === (rule.modules || [rule.module])[0])?._id || '',
      chargeMode: isEcommerce ? 'fixed' : rule.chargeMode || 'fixed',
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
  };

  const reset = () => { setEditingId(null); setEditingZoneId(null); setForm(EMPTY_FORM); };

  const submit = async (event) => {
    event.preventDefault();
    if (!zoneId) return alert(isEcommerce
      ? 'Pehle Zone Setup mein E-Commerce All India zone banayein'
      : 'Pehle city ke andar ek zone select karo');
    if (!form.deliveryFree && form.chargeMode === 'fixed' && form.amount === '') return alert('Delivery charge bharo');
    if (!form.deliveryFree && form.chargeMode === 'per_km' && form.perKmCharge === '') return alert('Per KM charge bharo');
    if (!isEcommerce && form.scope === 'category' && !form.categories.length) return alert('Category select karo ya All Categories choose karo');
    if (!isEcommerce && form.scope === 'module' && !form.modules.length) return alert('Module select karo');
    setSaving(true);
    const payload = {
      ...form,
      scope: isEcommerce ? 'zone' : form.moduleId || form.modules.length ? 'module' : form.scope,
      modules: isEcommerce ? [] : form.moduleId || form.scope === 'module' ? form.modules : [],
      moduleId: isEcommerce ? '' : form.moduleId || form.scope === 'module' ? form.moduleId : '',
      categories: isEcommerce ? [] : form.categories,
      chargeMode: isEcommerce ? 'fixed' : form.chargeMode,
      deliveryFree: form.deliveryFree,
      amount: form.deliveryFree || form.amount === '' ? 0 : Number(form.amount),
      perKmCharge: isEcommerce || form.perKmCharge === '' ? 0 : Number(form.perKmCharge),
      minimumKm: isEcommerce || form.minimumKm === '' ? 0 : Number(form.minimumKm),
      minimumDeliveryCharge: isEcommerce || form.minimumDeliveryCharge === '' ? 0 : Number(form.minimumDeliveryCharge),
      pickupRadiusKm: isEcommerce || form.pickupRadiusKm === '' ? null : Number(form.pickupRadiusKm),
      dropRadiusKm: isEcommerce || form.dropRadiusKm === '' ? null : Number(form.dropRadiusKm),
      freeAbove: form.deliveryFree || form.freeAbove === '' ? null : Number(form.freeAbove),
    };
    try {
      const targetZoneId = editingZoneId && editingZoneId !== 'all-city' ? editingZoneId : zoneId;
      if (editingId) {
        if (!targetZoneId || targetZoneId === 'all-city') return alert('Edit ke liye ek zone select karo');
        await api.put(`/zones/${targetZoneId}/delivery-rules/${editingId}`, payload);
      } else {
        const targets = zoneId === 'all-city' ? zoneList.filter(item => item.city === selectedCity) : [zone].filter(Boolean);
        if (!targets.length) return alert('Zone nahi mila');
        if (form.moduleId || form.modules.length) {
          const moduleSlug = form.modules[0];
          const duplicate = ruleList.some(rule => {
            const ruleModules = rule.modules || (rule.module ? [rule.module] : []);
            return ruleModules.includes(moduleSlug) && (zoneId === 'all-city' || String(rule._zoneId) === String(zoneId));
          });
          if (duplicate) return alert('Is zone me is module ka rule pehle se hai. Existing rule edit karein.');
        }
        await Promise.all(targets.map(item => api.post(`/zones/${item._id}/delivery-rules`, payload)));
      }
      reset();
      await loadRules(zoneId, selectedCity);
      await loadZones();
    } catch (error) {
      alert(error.response?.data?.message || 'Delivery rule save failed');
    } finally { setSaving(false); }
  };

  const remove = async (rule) => {
    if (!confirm('Delivery rule delete karna hai?')) return;
    const targetZoneId = rule._zoneId || zoneId;
    await api.delete(`/zones/${targetZoneId}/delivery-rules/${rule._id}`);
    loadRules(zoneId, selectedCity);
    loadZones();
  };

  if (loading) return <div className="py-20 text-center text-gray-400">Loading delivery settings...</div>;

  return (
    <div className="space-y-5 w-full max-w-none">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Truck size={22} className="text-[#1a3a8a]" /> Delivery Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isEcommerce
            ? `Zone ${zone?.name || ''} ke delivery charge aur free-delivery rules yahan manage karein.`
            : 'Delivery charge drop location ke zone (polygon / radius) se lagta hai. Har zone par Fixed, Per KM, free above aur minimum set karo.'}
        </p>
        {loadError ? <p className="text-sm text-red-600 mt-2">{loadError}</p> : null}
        {rulesLoadError ? <p role="alert" className="text-sm text-red-600 mt-2">{rulesLoadError}</p> : null}
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: CARD_BORDER }}>
        {isEcommerce
          ? zone
          ? <p className="text-sm text-slate-600">Zone <strong>{zone.name}</strong>{zone.scope === 'country' ? ' · All India' : ''}</p>
            : <p className="text-sm text-amber-700">All India E-Commerce zone nahi mila. Pehle Zone Setup mein E-Commerce All India zone banayein aur activate karein.</p>
          : <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <label className="block text-xs font-semibold text-gray-600">Select City
                <select value={selectedCity} onChange={event => chooseCity(event.target.value)} className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value="">Select city</option>
                  {cities.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-gray-600">Select Zone
                <select value={zoneId} disabled={!selectedCity} onChange={event => chooseZone(event.target.value)} className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value="all-city">All Zones in {selectedCity || 'City'}</option>
                  {zoneList.filter(item => item.city === selectedCity).map(item => (
                    <option key={item._id} value={item._id}>{item.zoneId} - {item.name}</option>
                  ))}
                </select>
              </label>
            </div>
            {zone
              ? <p className="text-xs text-gray-500 mt-2">Selected: <strong>{zone.city}</strong> / {zone.name} — QC checkout isi zone ke deliveryRules use karega.</p>
              : selectedCity
                ? <p className="text-xs text-amber-700 mt-2">All zones: naya rule is city ke har zone par copy hoga. Edit ke liye single zone choose karo.</p>
                : <p className="text-xs text-gray-500 mt-2">Pehle city select karke zone choose karo.</p>}
          </>}
      </div>

      {isEcommerce && !zone ? null : (isEcommerce ? Boolean(zoneId) : Boolean(selectedCity && zoneId)) ? (
        <>
          {showEcommerceRuleForm && <form onSubmit={submit} className="bg-white rounded-xl border shadow-sm p-5 space-y-4" style={{ borderColor: CARD_BORDER }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">{editingId ? 'Edit Delivery Rule' : isEcommerce && ruleList.length ? 'Edit Delivery Rule' : 'Add Delivery Rule'}</h2>
              {editingId && <button type="button" onClick={reset} className="text-sm text-gray-500"><X size={15} className="inline" /> Cancel</button>}
            </div>
            {!isEcommerce && <div className="flex flex-wrap items-center gap-4 border-b border-gray-100 pb-4">
              <span className="text-xs font-semibold text-gray-600">Delivery Type</span>
              {[['fixed', 'Fixed Charge'], ['per_km', 'Per KM'], ['free', 'Delivery Free']].map(([value, label]) => (
                <label key={value} className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="chargeMode"
                    checked={value === 'free' ? form.deliveryFree : !form.deliveryFree && form.chargeMode === value}
                    onChange={() => setForm(current => ({ ...current, chargeMode: value === 'free' ? 'per_km' : value, deliveryFree: value === 'free' }))}
                    className="accent-[#1a3a8a]"
                  />
                  {label}
                </label>
              ))}
            </div>}
            {isEcommerce && <button
              type="button"
              role="switch"
              aria-checked={form.deliveryFree}
              onClick={() => setForm(current => ({ ...current, deliveryFree: !current.deliveryFree }))}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${form.deliveryFree ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <span className={`relative h-5 w-9 rounded-full transition ${form.deliveryFree ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${form.deliveryFree ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
              Always free delivery
            </button>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {!isEcommerce && <label className="text-xs font-semibold text-gray-600">Charge Scope
                <select value={form.scope} onChange={e => set('scope', e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value="zone">Zone-wise</option>
                  <option value="module">Module-wise</option>
                  <option value="category">Category-wise</option>
                </select>
              </label>}
              {form.scope === 'module' && (
                <label className="text-xs font-semibold text-gray-600">Module
                  <select value={form.moduleId} onChange={e => selectModule(e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                    <option value="">Select module</option>
                    {moduleList.map(item => <option key={item._id || item.slug} value={item._id}>{item.name}</option>)}
                  </select>
                </label>
              )}
              {(isEcommerce || (!form.deliveryFree && form.chargeMode === 'fixed')) ? (
                <label className="text-xs font-semibold text-gray-600">Delivery Charge (Rs)
                  <input type="number" min="0" step="0.01" value={form.amount} disabled={isEcommerce && form.deliveryFree} onChange={e => set('amount', e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400" />
                </label>
              ) : null}
              {!form.deliveryFree && form.chargeMode === 'per_km' ? (
                <>
                  <label className="text-xs font-semibold text-gray-600">Base amount (optional)
                    <input type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </label>
                  <label className="text-xs font-semibold text-gray-600">Per KM Charge
                    <input type="number" min="0" step="0.01" value={form.perKmCharge} onChange={e => set('perKmCharge', e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </label>
                  <label className="text-xs font-semibold text-gray-600">Minimum KM
                    <input type="number" min="0" step="0.1" value={form.minimumKm} onChange={e => set('minimumKm', e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </label>
                  <label className="text-xs font-semibold text-gray-600">Minimum Delivery Charge
                    <input type="number" min="0" step="0.01" value={form.minimumDeliveryCharge} onChange={e => set('minimumDeliveryCharge', e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </label>
                  <label className="text-xs font-semibold text-gray-600">Rider Pickup Radius (KM)
                    <input type="number" min="0" step="0.1" value={form.pickupRadiusKm} onChange={e => set('pickupRadiusKm', e.target.value)} placeholder="No limit" className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </label>
                  <label className="text-xs font-semibold text-gray-600">Customer Drop Radius (KM)
                    <input type="number" min="0" step="0.1" value={form.dropRadiusKm} onChange={e => set('dropRadiusKm', e.target.value)} placeholder="No limit" className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </label>
                </>
              ) : null}
              <label className="text-xs font-semibold text-gray-600">Free Delivery Above (Rs)
                <input type="number" min="0" step="0.01" value={form.freeAbove} disabled={isEcommerce && form.deliveryFree} onChange={e => set('freeAbove', e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400" />
              </label>
            </div>
            {form.scope === 'category' && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Categories</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => toggleCategory('all')} className={`px-3 py-1.5 rounded-lg text-sm border ${form.categories.includes('all') ? 'bg-[#1a3a8a] text-white' : 'border-gray-200 text-gray-700'}`}>All Categories</button>
                  {categoryList.map(item => (
                    <button type="button" key={item._id} onClick={() => toggleCategory(item._id)} className={`px-3 py-1.5 rounded-lg text-sm border ${form.categories.includes(item._id) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-700'}`}>{item.name}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <button type="submit" disabled={saving} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold ${listBtnNavy}`}>
                <Save size={15} /> {saving ? 'Saving...' : editingId ? 'Update Rule' : 'Save Rule'}
              </button>
            </div>
          </form>}

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: CARD_BORDER }}>
            <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3">
              <div className="font-semibold text-gray-800">{isEcommerce ? `${zone?.name || 'E-Commerce Zone'} Delivery Charge` : `Delivery Rules ${selectedCity ? `for ${selectedCity}` : ''}`} ({visibleRuleList.length})</div>
              {!isEcommerce && <select value={moduleFilter} onChange={event => setModuleFilter(event.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="">All Modules</option>
                {moduleList.map(item => <option key={item._id || item.slug} value={item.slug}>{item.name}</option>)}
              </select>}
            </div>
            <div className="overflow-x-auto">
              <table className={`w-full ${isEcommerce ? 'min-w-[560px]' : 'min-w-[1200px]'} text-sm`}>
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500">
                    <th className="px-5 py-3">Zone</th>
                    {!isEcommerce && <th className="px-5 py-3">Scope / Module</th>}
                    <th className="px-5 py-3">Charge</th>
                    {!isEcommerce && <>
                      <th className="px-5 py-3">Mode</th>
                      <th className="px-5 py-3">Minimum KM</th>
                      <th className="px-5 py-3">Pickup KM</th>
                      <th className="px-5 py-3">Drop KM</th>
                    </>}
                    <th className="px-5 py-3">{isEcommerce ? 'Free Delivery Above' : 'Free Above'}</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRuleList.length === 0 && (
                    <tr><td colSpan={isEcommerce ? 4 : 9} className="px-5 py-8 text-center text-gray-400">Is filter par abhi koi delivery rule nahi.</td></tr>
                  )}
                  {visibleRuleList.map(rule => (
                    <tr key={rule._id} className="border-t border-gray-100">
                      <td className="px-5 py-3 font-medium">{rule.zoneName || zone?.name || '—'} <span className="text-gray-400 font-normal">#{rule.zoneId || zone?.zoneId}</span></td>
                      {!isEcommerce && <td className="px-5 py-3"><span className="capitalize">{(rule.modules || (rule.module ? [rule.module] : [])).length ? 'Module-wise' : `${rule.scope || 'zone'}-wise`}</span>{(rule.modules || (rule.module ? [rule.module] : [])).length ? <span className="block text-xs text-gray-500">{(rule.modules || [rule.module]).join(', ')}</span> : null}{rule.moduleId ? <span className="block text-[11px] text-gray-400">ID: {rule.moduleId}</span> : null}</td>}
                      <td className="px-5 py-3 font-semibold text-[#1a3a8a]">{rule.deliveryFree ? 'Always Free' : chargeLabel(rule)}</td>
                      {!isEcommerce && <>
                        <td className="px-5 py-3">{rule.deliveryFree ? 'Free' : rule.chargeMode === 'per_km' ? 'Per KM' : 'Fixed'}</td>
                        <td className="px-5 py-3">{rule.minimumKm != null && Number(rule.minimumKm) > 0 ? `${rule.minimumKm} km` : '—'}</td>
                        <td className="px-5 py-3">{rule.pickupRadiusKm != null && Number(rule.pickupRadiusKm) > 0 ? `${rule.pickupRadiusKm} km` : 'No limit'}</td>
                        <td className="px-5 py-3">{rule.dropRadiusKm != null && Number(rule.dropRadiusKm) > 0 ? `${rule.dropRadiusKm} km` : 'No limit'}</td>
                      </>}
                      <td className="px-5 py-3">{rule.deliveryFree ? '—' : rule.freeAbove != null ? `Rs ${rule.freeAbove}` : '—'}</td>
                      <td className="px-5 py-3">
                        <button type="button" onClick={() => editRule(rule)} className="inline-flex items-center gap-1 mr-3 text-blue-700"><Pencil size={14} /> Edit</button>
                        <button type="button" onClick={() => remove(rule)} className="inline-flex items-center gap-1 text-red-500"><Trash2 size={14} /> Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
