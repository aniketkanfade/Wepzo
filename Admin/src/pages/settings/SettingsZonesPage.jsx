import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Grid2x2, Link2, MoreVertical, Download, Search, RotateCcw, Loader2, Eye, Pencil, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import { useModuleStore } from '../../store/useStore';
import NavyToggle from '../../WebAdmin/Qucik commerce/components/NavyToggle';
import ZoneDrawMap from '../../WebAdmin/Qucik commerce/components/ZoneDrawMap';
import { useListPagination } from '../../hooks/useListPagination';
import { fetchPincodePolygon } from '../../constants/nagpurPincodes';
import {
  STATES, citiesInState, pinsInCity, getCity, pincodeLabel, findPin,
} from '../../constants/locations';
import {
  LIST_CARD_BORDER as CARD_BORDER,
  listBtnNavy, listBtnOutline, listTheadClass, listTheadStyle, listThClass, listTdClass, listRowClass, listRowStyle,
} from '../../constants/listTheme';

const EMPTY = {
  name: '', displayName: '', nameEn: '', nameHi: '',
  displayNameEn: '', displayNameHi: '',
  commerceType: 'quick_commerce',
  state: '',
  city: '',
  radiusKm: 0,
  lat: 21.1458,
  lng: 79.0882,
  polygon: [],
  polygonClosed: false,
  pincodes: [],
  pinAreas: [],
  modules: [],
  isDefault: false,
  status: true,
};

export default function SettingsZonesPage() {
  const navigate = useNavigate();
  const { activeModule } = useModuleStore();
  const activeModuleKey = String(activeModule?.slug || activeModule?.type || '').toLowerCase();
  const defaultCommerceType = ['e-commerce', 'e_commerce', 'ecommerce'].includes(activeModuleKey) ? 'ecommerce' : 'quick_commerce';
  const [zones, setZones] = useState([]);
  const [modules, setModules] = useState([]);
  const [form, setForm] = useState({ ...EMPTY, commerceType: defaultCommerceType });
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pinQuery, setPinQuery] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [viewZone, setViewZone] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [menuId, setMenuId] = useState(null);

  const load = () => {
    api.get('/zones').then(r => setZones(r.data || [])).catch(() => setZones([]));
    api.get('/system-modules').then(r => setModules(r.data || [])).catch(() => setModules([]));
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isQuick = form.commerceType === 'quick_commerce';
  const currentTypeLabel = isQuick ? 'Quick Commerce' : 'E-Commerce';
  const cityMeta = getCity(form.state, form.city);
  const cityOptions = form.state ? citiesInState(form.state) : [];
  const cityPins = form.state && form.city ? pinsInCity(form.state, form.city) : [];

  const matchesSearch = (z) =>
    (z.name || '').toLowerCase().includes(search.toLowerCase()) ||
    String(z.zoneId || '').includes(search) ||
    (z.pincodes || []).some(p => String(p).includes(search)) ||
    (z.city || '').toLowerCase().includes(search.toLowerCase());

  const listZones = zones
    .filter(z => isQuick ? z.commerceType !== 'ecommerce' : z.commerceType === 'ecommerce')
    .filter(matchesSearch);
  const pager = useListPagination(listZones, { resetDeps: [search, isQuick] });

  const pinOptions = useMemo(() => {
    const q = pinQuery.trim().toLowerCase();
    if (!q) return cityPins;
    return cityPins.filter(p =>
      p.pin.includes(q) ||
      p.area.toLowerCase().includes(q) ||
      pincodeLabel(p).toLowerCase().includes(q)
    );
  }, [pinQuery, cityPins]);

  const switchType = (type) => {
    setForm(f => ({
      ...EMPTY,
      commerceType: type,
    }));
    setEditingId(null);
    setPinQuery('');
    setSearch('');
  };

  const selectState = (state) => {
    setForm(f => ({
      ...f,
      state,
      city: '',
      polygon: [],
      polygonClosed: false,
      pincodes: [],
      pinAreas: [],
    }));
    setPinQuery('');
  };

  const selectCity = (cityName) => {
    const meta = getCity(form.state, cityName);
    setForm(f => ({
      ...f,
      city: cityName,
      lat: meta?.lat || f.lat,
      lng: meta?.lng || f.lng,
      polygon: [],
      polygonClosed: false,
      pincodes: [],
      pinAreas: [],
    }));
    setPinQuery('');
  };

  const selectPincode = async (entry) => {
    setPinOpen(false);
    setPinQuery('');
    if (form.pincodes.includes(entry.pin)) return;
    setPinLoading(true);
    try {
      const geo = await fetchPincodePolygon(entry);
      setForm(f => {
        const pinAreas = [...(f.pinAreas || []), {
          pin: entry.pin,
          area: entry.area,
          lat: geo.lat,
          lng: geo.lng,
          polygon: geo.polygon,
        }];
        const polygon = pinAreas.flatMap(a => a.polygon || []);
        return {
          ...f,
          commerceType: 'ecommerce',
          pincodes: [...f.pincodes, entry.pin],
          pinAreas,
          name: f.name || (f.city ? `${f.city} E-Com` : entry.area),
          displayName: f.displayName || entry.area,
          nameEn: f.nameEn || f.name || entry.area,
          lat: geo.lat,
          lng: geo.lng,
          polygon,
        };
      });
    } finally {
      setPinLoading(false);
    }
  };

  const removePin = (pin) => {
    setForm(f => {
      const pinAreas = (f.pinAreas || []).filter(a => a.pin !== pin);
      return {
        ...f,
        pincodes: f.pincodes.filter(p => p !== pin),
        pinAreas,
        polygon: pinAreas.flatMap(a => a.polygon || []),
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Business zone name zaroori hai');
    if (!form.state || !form.city) return alert('State aur city select karo');
    if (isQuick) {
      if ((form.polygon || []).length < 3 || !form.polygonClosed) {
        return alert('City ke andar points jodo — last point first (green) point par wapas lao tab zone close hoga');
      }
    } else if (form.pincodes.length === 0) {
      return alert('E-Commerce: kam se kam 1 pin code select karo');
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        radiusKm: isQuick ? Number(form.radiusKm) || 0 : 0,
        pincodes: isQuick ? [] : form.pincodes,
        pinAreas: isQuick ? [] : form.pinAreas,
        polygon: isQuick ? form.polygon : (form.pinAreas || []).flatMap(a => a.polygon || []),
      };
      if (editingId) await api.put(`/zones/${editingId}`, payload);
      else await api.post('/zones', payload);
      setForm({ ...EMPTY, commerceType: form.commerceType });
      setEditingId(null);
      setPinQuery('');
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (z) => {
    await api.put(`/zones/${z._id}`, { status: !z.status });
    load();
  };

  const makeDefault = async (z) => {
    await api.put(`/zones/${z._id}`, { isDefault: true });
    load();
  };

  const startEdit = (z) => {
    setMenuId(null);
    setViewZone(null);
    setEditingId(z._id);
    setForm({
      ...EMPTY,
      name: z.name || '',
      displayName: z.displayName || z.name || '',
      nameEn: z.nameEn || '',
      nameHi: z.nameHi || '',
      displayNameEn: z.displayNameEn || '',
      displayNameHi: z.displayNameHi || '',
      commerceType: z.commerceType === 'ecommerce' ? 'ecommerce' : 'quick_commerce',
      state: z.state || '',
      city: z.city || '',
      radiusKm: z.radiusKm || 0,
      lat: z.lat || 21.1458,
      lng: z.lng || 79.0882,
      polygon: z.polygon || [],
      polygonClosed: (z.polygon || []).length >= 3,
      pincodes: z.pincodes || [],
      pinAreas: z.pinAreas || [],
      modules: z.modules || [],
      isDefault: !!z.isDefault,
      status: z.status !== false,
    });
    setTimeout(() => document.getElementById('add-zone-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
  };

  const resetForm = () => {
    setForm({ ...EMPTY, commerceType: form.commerceType });
    setEditingId(null);
    setPinQuery('');
  };

  const handleDelete = async (z) => {
    if (!confirm(`${z.name} delete karna hai?`)) return;
    await api.delete(`/zones/${z._id}`);
    setMenuId(null);
    if (editingId === z._id) resetForm();
    load();
  };

  const exportCsv = () => {
    const rows = [['Zone Id', 'Name', 'Type', 'State', 'City', 'Radius', 'Pincodes', 'Vendors', 'Deliverymen', 'Status']];
    listZones.forEach(z => {
      rows.push([z.zoneId, z.name, z.commerceType, z.state || '', z.city || '', z.radiusKm || '', (z.pincodes || []).join('|'), z.vendors || 0, z.deliveryMen || 0, z.status ? 'Active' : 'Inactive']);
    });
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = isQuick ? 'quick_commerce_zones.csv' : 'ecommerce_zones.csv';
    a.click();
  };

  const inputCls = 'w-full px-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1a3a8a]/20 border-gray-200';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

  const setName = (value) => set('name', value);
  const setDisp = (value) => set('displayName', value);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Zone Setup</h1>
        <p className="text-sm text-sky-700 mt-2 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
          {isQuick
            ? 'Quick Commerce: city select karo, phir city ke andar points jodo. Last point first (green) point par wapas aao — tab zone close hoga. Har point drag karke adjust hoga.'
            : 'E-Commerce: State → City → Pin code. Jitne pin select karoge, sab map pe dikhenge.'}
        </p>
      </div>

      <form id="add-zone-form" onSubmit={handleSubmit} className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: CARD_BORDER }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <h2 className="font-semibold text-gray-800">{editingId ? 'Edit Zone' : 'Add New Zone'}</h2>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Commerce type</p>
            <div className="flex flex-wrap gap-2">
              <button type="button"
                className="px-4 py-2 rounded-lg text-sm font-semibold border bg-[#1a3a8a] text-white border-[#1a3a8a] cursor-default"
                disabled>
                {currentTypeLabel}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Business Zone name</label>
                <input className={inputCls} value={form.name} onChange={e => setName(e.target.value)}
                  placeholder="Write a New Business Zone Name" />
              </div>
              <div>
                <label className={labelCls}>Display name</label>
                <input className={inputCls} value={form.displayName} onChange={e => setDisp(e.target.value)}
                  placeholder="Write a New Display Zone Name" />
              </div>

              {isQuick ? (
                <>
                  <div>
                    <label className={labelCls}>City</label>
                    <select
                      className={inputCls}
                      value={form.state && form.city ? `${form.state}|${form.city}` : ''}
                      onChange={e => {
                        const [state, name] = e.target.value.split('|');
                        const meta = getCity(state, name);
                        setForm(f => ({
                          ...f,
                          state,
                          city: name,
                          lat: meta?.lat || f.lat,
                          lng: meta?.lng || f.lng,
                          polygon: [],
                          polygonClosed: false,
                        }));
                      }}>
                      <option value="">Select city</option>
                      {STATES.map(s => (
                        <optgroup key={s} label={s}>
                          {citiesInState(s).map(c => (
                            <option key={`${s}-${c.name}`} value={`${s}|${c.name}`}>{c.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <p className="text-[11px] text-gray-400 mt-1">Zone sirf selected city ke andar draw hoga. Har point drag karke adjust kar sakte ho. Last point first (green) point par wapas lao to close.</p>
                  </div>
                  <div>
                    <label className={labelCls}>Discoverable Radius (Km) — optional</label>
                    <input type="number" min={0} step={0.1} className={inputCls} value={form.radiusKm}
                      onChange={e => set('radiusKm', e.target.value)} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className={labelCls}>State</label>
                    <select className={inputCls} value={form.state} onChange={e => selectState(e.target.value)}>
                      <option value="">Select state</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>City</label>
                    <select className={inputCls} value={form.city} disabled={!form.state}
                      onChange={e => selectCity(e.target.value)}>
                      <option value="">Select city</option>
                      {cityOptions.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="relative">
                    <label className={labelCls}>Pin code / Area</label>
                    <input
                      className={inputCls}
                      value={pinQuery}
                      disabled={!form.city}
                      onChange={e => { setPinQuery(e.target.value); setPinOpen(true); }}
                      onFocus={() => form.city && setPinOpen(true)}
                      onBlur={() => setTimeout(() => setPinOpen(false), 180)}
                      placeholder={form.city ? 'Search pin code or area name' : 'Pehle city select karo'}
                    />
                    {pinLoading && <Loader2 size={14} className="absolute right-3 top-10 animate-spin text-gray-400" />}
                    {pinOpen && form.city && (
                      <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                        {pinOptions.length === 0 && (
                          <p className="px-3 py-2 text-xs text-gray-400">Koi pin code nahi mila</p>
                        )}
                        {pinOptions.map(p => (
                          <button
                            key={p.pin}
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => selectPincode(p)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-[#eef2f8] ${form.pincodes.includes(p.pin) ? 'bg-sky-50 text-[#1a3a8a] font-medium' : 'text-gray-700'}`}
                          >
                            <span className="tabular-nums font-semibold">{p.pin}</span>
                            <span className="text-gray-400 mx-1">—</span>
                            {p.area}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">Har selected pin ka area map pe dikhega.</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.pincodes.map(pin => {
                        const meta = findPin(pin);
                        return (
                          <span key={pin} className="inline-flex items-center gap-1 text-xs bg-[#eef2f8] text-[#1a3a8a] px-2 py-1 rounded-full">
                            {pin}{meta ? ` · ${meta.area}` : ''}
                            <button type="button" onClick={() => removePin(pin)}>×</button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">Select Area</p>
              <ZoneDrawMap
                mode={isQuick ? 'draw' : 'pins'}
                lat={form.lat}
                lng={form.lng}
                radiusKm={isQuick ? Number(form.radiusKm) || 0 : 0}
                polygon={form.polygon}
                closed={!!form.polygonClosed}
                city={cityMeta}
                pinAreas={isQuick ? [] : (form.pinAreas || [])}
                drawEnabled={isQuick && !!form.city}
                onCenterChange={(lat, lng) => setForm(f => ({ ...f, lat, lng }))}
                onPolygonChange={polygon => setForm(f => ({ ...f, polygon }))}
                onClosedChange={closed => set('polygonClosed', closed)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={resetForm}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium ${listBtnOutline}`}>
              <span className="inline-flex items-center gap-1"><RotateCcw size={14} /> Reset</span>
            </button>
            <button type="submit" disabled={saving || pinLoading}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}>
              {saving ? 'Saving...' : (editingId ? 'Update' : 'Submit')}
            </button>
          </div>
        </div>
      </form>

      <ZoneTable
        title={isQuick ? 'Quick Commerce Zone List' : 'E-Commerce Zone List'}
        rows={pager.paginated}
        pager={pager}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearch={() => setSearch(searchInput.trim())}
        searchPlaceholder={isQuick ? 'Search Quick Commerce zone' : 'Search E-Commerce zone / Pin'}
        onExport={exportCsv}
        coverKind={isQuick ? 'quick' : 'ecom'}
        menuId={menuId}
        setMenuId={setMenuId}
        onDefault={makeDefault}
        onToggle={toggleStatus}
        onView={(z) => { setMenuId(null); setViewZone(z); }}
        onEdit={startEdit}
        onConnect={(z) => {
          setMenuId(null);
          navigate(`/settings/zones/delivery?city=${encodeURIComponent(z.city || '')}&zoneId=${encodeURIComponent(z._id)}`);
        }}
        onSearchCharge={(z) => { setMenuId(null); navigate(`/settings/zones/${z._id}/search-charges`); }}
        onDelete={handleDelete}
      />

      {viewZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setViewZone(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-bold text-gray-900">View Zone</h3>
                <p className="text-sm text-gray-500">{viewZone.name} · ID {viewZone.zoneId}</p>
              </div>
              <button type="button" onClick={() => setViewZone(null)} className={`px-3 py-1.5 rounded-lg text-sm ${listBtnOutline}`}>Close</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
              <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400 block">City</span>{viewZone.city || '—'}</div>
              <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400 block">Type</span>{viewZone.commerceType === 'ecommerce' ? 'E-Commerce' : 'Quick Commerce'}</div>
              <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400 block">Date / Time</span>{viewZone.createdAt ? new Date(viewZone.createdAt).toLocaleString('en-IN') : '—'}</div>
              <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400 block">Status</span>{viewZone.status ? 'Active' : 'Inactive'}</div>
            </div>
            <ZoneDrawMap
              readOnly
              mode={viewZone.commerceType === 'ecommerce' ? 'pins' : 'draw'}
              lat={viewZone.lat}
              lng={viewZone.lng}
              radiusKm={Number(viewZone.radiusKm) || 0}
              polygon={viewZone.polygon || []}
              closed
              city={getCity(viewZone.state, viewZone.city)}
              pinAreas={viewZone.pinAreas || []}
              drawEnabled={false}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => startEdit(viewZone)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold ${listBtnNavy}`}>
                <Pencil size={14} /> Edit
              </button>
              <button type="button" onClick={() => { setViewZone(null); handleDelete(viewZone); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-red-600 border border-red-200 hover:bg-red-50">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ZoneTable({ title, rows, pager, searchInput, onSearchInputChange, onSearch, searchPlaceholder, onExport, coverKind, menuId, setMenuId, onDefault, onToggle, onView, onEdit, onConnect, onSearchCharge, onDelete }) {
  const { page, perPage, total } = pager;
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: CARD_BORDER }}>
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: CARD_BORDER }}>
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#eef2f8] text-[#1a3a8a]">{total}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0">
            <input value={searchInput} onChange={e => onSearchInputChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              placeholder={searchPlaceholder}
              className="w-56 max-w-full rounded-l-lg border bg-white px-3 py-2 text-sm outline-none"
              style={{ borderColor: CARD_BORDER }} />
            <button type="button" onClick={onSearch}
              className={`rounded-r-lg px-3 ${listBtnNavy}`}><Search size={14} /></button>
          </div>
          <button type="button" onClick={onExport}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm ${listBtnOutline}`}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={listTheadClass} style={listTheadStyle}>
              <th className={`${listThClass} w-12`}>SL</th>
              <th className={listThClass}>Zone Id</th>
              <th className={listThClass}>Business Zone Name</th>
              <th className={listThClass}>City</th>
              <th className={listThClass}>Vendors</th>
              <th className={listThClass}>Deliverymen</th>
              <th className={listThClass}>{coverKind === 'ecom' ? 'Pin codes / Area' : 'Cover'}</th>
              <th className={listThClass}>Default Status</th>
              <th className={listThClass}>Status</th>
              <th className={`${listThClass} w-32`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-5 py-8 text-center text-sm text-gray-400">
                  {coverKind === 'ecom' ? 'Abhi koi E-Commerce zone nahi' : 'Abhi koi Quick Commerce zone nahi'}
                </td>
              </tr>
            )}
            {rows.map((z, i) => (
              <tr key={z._id} className={listRowClass} style={{ ...listRowStyle, cursor: 'default' }}>
                <td className={`${listTdClass} text-gray-500`}>{(page - 1) * perPage + i + 1}</td>
                <td className={`${listTdClass} tabular-nums`}>{z.zoneId}</td>
                <td className={`${listTdClass} font-medium`}>{z.name}</td>
                <td className={listTdClass}>{z.city || '—'}</td>
                <td className={listTdClass}>{z.vendors ?? 0}</td>
                <td className={listTdClass}>{z.deliveryMen ?? 0}</td>
                <td className={listTdClass}>
                  {coverKind === 'ecom'
                    ? ((z.pincodes || []).length
                      ? (z.pincodes || []).map(pin => {
                          const area = findPin(pin)?.area;
                          return area ? `${pin} — ${area}` : pin;
                        }).join(', ')
                      : 'N/A')
                    : (z.radiusKm > 0 ? `${z.radiusKm} Km` : `${(z.polygon || []).length} pts`)}
                </td>
                <td className={listTdClass}>
                  {z.isDefault ? (
                    <span className="text-xs font-semibold text-emerald-600">Default</span>
                  ) : (
                    <button type="button" onClick={() => onDefault(z)}
                      className="text-xs px-3 py-1 rounded-lg border text-gray-600 hover:bg-gray-50">
                      Make default
                    </button>
                  )}
                </td>
                <td className={listTdClass}>
                  <NavyToggle checked={!!z.status} onChange={() => onToggle(z)} />
                </td>
                <td className={listTdClass}>
                  <div className="flex items-center gap-1.5 relative">
                    <button type="button" title="Delivery Settings" aria-label="Delivery Settings" onClick={() => onConnect(z)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border text-sky-600 hover:bg-sky-50"
                      style={{ borderColor: '#bae6fd' }}>
                      <Link2 size={14} />
                    </button>
                    <button type="button" title="Search Charge" onClick={() => onSearchCharge(z)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border text-sky-600 hover:bg-sky-50"
                      style={{ borderColor: '#bae6fd' }}>
                      <Grid2x2 size={14} />
                    </button>
                    <button type="button" onClick={() => setMenuId(menuId === z._id ? null : z._id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border text-sky-600 hover:bg-sky-50"
                      style={{ borderColor: '#bae6fd' }}>
                      <MoreVertical size={14} />
                    </button>
                    {menuId === z._id && (
                      <div className="absolute right-0 top-9 z-20 w-36 bg-white border rounded-lg shadow-lg py-1 text-sm">
                        <button type="button" onClick={() => onEdit(z)} className="w-full text-left px-3 py-1.5 hover:bg-gray-50">Edit</button>
                        <button type="button" onClick={() => onView(z)} className="w-full text-left px-3 py-1.5 hover:bg-gray-50">View</button>
                        <button type="button" onClick={() => onDelete(z)} className="w-full text-left px-3 py-1.5 text-red-500 hover:bg-red-50">Delete</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
