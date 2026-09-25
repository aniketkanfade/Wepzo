import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, Trash2, Pencil, X, Truck } from 'lucide-react';
import api from '../../api/axios';
import { LIST_CARD_BORDER as CARD_BORDER, listBtnNavy } from '../../constants/listTheme';

const EMPTY_FORM = {
  scope: 'zone',
  categories: [],
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
  const [zones, setZones] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const zoneList = asArray(zones);
  const categoryList = asArray(categories);
  const ruleList = asArray(rules);
  const cities = useMemo(
    () => [...new Set(zoneList.map(item => item.city).filter(Boolean))],
    [zoneList],
  );

  const selectedCity = params.get('city') || '';
  const zoneId = params.get('zoneId') || (selectedCity ? 'all-city' : '');
  const zone = zoneList.find(item => item._id === zoneId);

  const loadZones = async () => {
    const { data } = await api.get('/zones');
    const next = asArray(data);
    setZones(next);
    return next;
  };

  const loadRules = async (id, city) => {
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
    } catch {
      setRules([]);
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
    ]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!zoneList.length) return;
    const rawId = params.get('zoneId');
    if (!rawId || rawId === 'all-city') return;
    const match = zoneList.find(item => item._id === rawId || String(item.zoneId) === rawId);
    if (!match || !match.city) return;
    if (params.get('city') === match.city && params.get('zoneId') === match._id) return;
    setParams({ city: match.city, zoneId: match._id }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only hydrate once zones arrive; params in deps loops
  }, [zoneList]);

  useEffect(() => {
    loadRules(zoneId, selectedCity);
    setEditingId(null);
    setEditingZoneId(null);
    setForm(EMPTY_FORM);
  }, [zoneId, selectedCity]);

  const chooseCity = (city) => setParams(city ? { city, zoneId: 'all-city' } : {});
  const chooseZone = (id) => setParams({ city: selectedCity, zoneId: id });
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const toggleCategory = (value) => set('categories', value === 'all'
    ? (form.categories.includes('all') ? [] : ['all'])
    : [...form.categories.filter(item => item !== 'all'), ...(form.categories.includes(value) ? [] : [value])]);

  const editRule = (rule) => {
    setEditingId(rule._id);
    setEditingZoneId(rule._zoneId || zoneId);
    setForm({
      scope: rule.scope || 'zone',
      categories: asArray(rule.categories),
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
  };

  const reset = () => { setEditingId(null); setEditingZoneId(null); setForm(EMPTY_FORM); };

  const submit = async (event) => {
    event.preventDefault();
    if (!zoneId) return alert('Pehle city ke andar ek zone select karo');
    if (!form.deliveryFree && form.chargeMode === 'fixed' && form.amount === '') return alert('Delivery charge bharo');
    if (!form.deliveryFree && form.chargeMode === 'per_km' && form.perKmCharge === '') return alert('Per KM charge bharo');
    if (form.scope === 'category' && !form.categories.length) return alert('Category select karo ya All Categories choose karo');
    setSaving(true);
    const payload = {
      ...form,
      amount: form.amount === '' ? 0 : Number(form.amount),
      perKmCharge: form.perKmCharge === '' ? 0 : Number(form.perKmCharge),
      minimumKm: form.minimumKm === '' ? 0 : Number(form.minimumKm),
      minimumDeliveryCharge: form.minimumDeliveryCharge === '' ? 0 : Number(form.minimumDeliveryCharge),
      pickupRadiusKm: form.pickupRadiusKm === '' ? null : Number(form.pickupRadiusKm),
      dropRadiusKm: form.dropRadiusKm === '' ? null : Number(form.dropRadiusKm),
      freeAbove: form.freeAbove === '' ? null : Number(form.freeAbove),
    };
    try {
      const targetZoneId = editingZoneId && editingZoneId !== 'all-city' ? editingZoneId : zoneId;
      if (editingId) {
        if (!targetZoneId || targetZoneId === 'all-city') return alert('Edit ke liye ek zone select karo');
        await api.put(`/zones/${targetZoneId}/delivery-rules/${editingId}`, payload);
      } else {
        const targets = zoneId === 'all-city' ? zoneList.filter(item => item.city === selectedCity) : [zone].filter(Boolean);
        if (!targets.length) return alert('Zone nahi mila');
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
          Delivery charge drop location ke zone (polygon / radius) se lagta hai. Har zone par Fixed, Per KM, free above aur minimum set karo.
        </p>
        {loadError ? <p className="text-sm text-red-600 mt-2">{loadError}</p> : null}
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: CARD_BORDER }}>
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
      </div>

      {selectedCity && zoneId ? (
        <>
          <form onSubmit={submit} className="bg-white rounded-xl border shadow-sm p-5 space-y-4" style={{ borderColor: CARD_BORDER }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">{editingId ? 'Edit Delivery Rule' : 'Add Delivery Rule'}</h2>
              {editingId && <button type="button" onClick={reset} className="text-sm text-gray-500"><X size={15} className="inline" /> Cancel</button>}
            </div>
            <div className="flex flex-wrap items-center gap-4 border-b border-gray-100 pb-4">
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <label className="text-xs font-semibold text-gray-600">Charge Scope
                <select value={form.scope} onChange={e => set('scope', e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value="zone">Zone-wise</option>
                  <option value="category">Category-wise</option>
                </select>
              </label>
              {!form.deliveryFree && form.chargeMode === 'fixed' ? (
                <label className="text-xs font-semibold text-gray-600">Delivery Charge (Rs)
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
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
                </>
              ) : null}
              <label className="text-xs font-semibold text-gray-600">Free Delivery Above (Rs)
                <input type="number" min="0" step="0.01" value={form.freeAbove} onChange={e => set('freeAbove', e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
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
          </form>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: CARD_BORDER }}>
            <div className="px-5 py-4 border-b font-semibold text-gray-800">Delivery Rules {selectedCity ? `for ${selectedCity}` : ''} ({ruleList.length})</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500">
                    <th className="px-5 py-3">Zone</th>
                    <th className="px-5 py-3">Charge</th>
                    <th className="px-5 py-3">Mode</th>
                    <th className="px-5 py-3">Free Above</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ruleList.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Is zone par abhi koi delivery rule nahi.</td></tr>
                  )}
                  {ruleList.map(rule => (
                    <tr key={rule._id} className="border-t border-gray-100">
                      <td className="px-5 py-3 font-medium">{rule.zoneName || zone?.name || '—'} <span className="text-gray-400 font-normal">#{rule.zoneId || zone?.zoneId}</span></td>
                      <td className="px-5 py-3 font-semibold text-[#1a3a8a]">{chargeLabel(rule)}</td>
                      <td className="px-5 py-3">{rule.deliveryFree ? 'Free' : rule.chargeMode === 'per_km' ? 'Per KM' : 'Fixed'}</td>
                      <td className="px-5 py-3">{rule.freeAbove != null ? `Rs ${rule.freeAbove}` : '—'}</td>
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
