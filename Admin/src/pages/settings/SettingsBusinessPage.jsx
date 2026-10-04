import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, ImagePlus, RotateCcw, Save, Upload } from 'lucide-react';
import api from '../../api/axios';
import { listBtnNavy, listBtnOutline, LIST_CARD_BORDER } from '../../constants/listTheme';

const DEFAULT_FORM = {
  platformName: '',
  businessName: '',
  businessEmail: '',
  businessPhone: '',
  country: 'India',
  businessAddress: '',
  businessLat: 21.1458,
  businessLng: 79.0882,
  businessLogo: '',
  favicon: '',
  primaryColor: '#f45b15',
  maintenanceMode: false,
  timezone: 'Asia/Kolkata',
  timeFormat: '12',
  currency: 'INR',
  currencySymbol: '₹',
  currencyPosition: 'left',
  decimalDigits: 0,
  subscriptionEnabled: false,
  commissionEnabled: true,
  defaultCommission: 2.5,
  deliveryCommission: 7,
  additionalChargeEnabled: false,
  additionalChargeName: '',
  additionalChargeAmount: 0,
  countryPickerEnabled: true,
  copyrightText: '',
  cookiesText: '',
};

const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const labelClass = 'block text-xs font-semibold text-slate-600';
const pinIcon = L.divIcon({ className: '', html: '<span style="display:block;width:20px;height:20px;background:#2450b2;border:3px solid white;border-radius:50%;box-shadow:0 1px 6px #0006"></span>', iconSize: [20, 20], iconAnchor: [10, 10] });

function Section({ title, description, children }) {
  return <section className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: LIST_CARD_BORDER }}>
    <div className="border-b bg-slate-50 px-5 py-4" style={{ borderColor: LIST_CARD_BORDER }}><h2 className="font-semibold text-slate-800">{title}</h2>{description && <p className="mt-1 text-xs text-slate-500">{description}</p>}</div>
    <div className="space-y-5 p-5">{children}</div>
  </section>;
}

function MapClick({ onPick }) {
  useMapEvents({ click: event => onPick(event.latlng.lat, event.latlng.lng) });
  return null;
}

function Switch({ label, checked, onChange, description }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
    <span><span className="block text-sm font-medium text-slate-800">{label}</span>{description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}</span>
    <input type="checkbox" checked={!!checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4 shrink-0 accent-blue-700" />
  </label>;
}

export default function SettingsBusinessPage() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/settings/business');
      setForm({ ...DEFAULT_FORM, ...(data || {}) });
      setError('');
    } catch {
      setError('Business settings load nahi hui.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSettings(); }, []);

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const uploadImage = (key, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Image file select karein.');
    if (file.size > 3 * 1024 * 1024) return setError('Image 3 MB se chhoti honi chahiye.');
    const reader = new FileReader();
    reader.onload = () => { set(key, reader.result); setError(''); };
    reader.onerror = () => setError('Image read nahi ho paayi.');
    reader.readAsDataURL(file);
  };

  const save = async event => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const payload = {
        ...form,
        platformName: form.platformName || form.businessName,
        currency: form.currency || 'INR',
        decimalDigits: Number(form.decimalDigits) || 0,
        defaultCommission: Number(form.defaultCommission) || 0,
        deliveryCommission: Number(form.deliveryCommission) || 0,
        additionalChargeAmount: Number(form.additionalChargeAmount) || 0,
        businessLat: Number(form.businessLat) || 0,
        businessLng: Number(form.businessLng) || 0,
      };
      const { data } = await api.put('/settings/business', payload);
      setForm({ ...DEFAULT_FORM, ...(data || {}) });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2400);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Business settings save nahi hui.');
    } finally {
      setSaving(false);
    }
  };

  const latitude = Number(form.businessLat) || 21.1458;
  const longitude = Number(form.businessLng) || 79.0882;

  if (loading) return <div className="py-20 text-center text-slate-400">Loading business settings...</div>;

  return <form onSubmit={save} className="mx-auto w-full max-w-6xl space-y-5 pb-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Building2 size={19} className="text-blue-700" />Business Info</h2><p className="mt-1 text-sm text-slate-500">Business profile and platform settings</p></div>
      <button type="submit" disabled={saving} className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={15} />{saved ? 'Saved' : saving ? 'Saving...' : 'Save Information'}</button>
    </div>

    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

    <Switch label="Maintenance Mode" description="Temporarily disable customer-facing services." checked={form.maintenanceMode} onChange={value => set('maintenanceMode', value)} />

    <Section title="Basic Information" description="Business identity, contact details, branding, and address.">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>Business Name *<input required className={inputClass} value={form.businessName || form.platformName || ''} onChange={event => { set('businessName', event.target.value); set('platformName', event.target.value); }} /></label>
          <label className={labelClass}>Email *<input required type="email" className={inputClass} value={form.businessEmail || form.supportEmail || ''} onChange={event => { set('businessEmail', event.target.value); set('supportEmail', event.target.value); }} /></label>
          <label className={labelClass}>Phone *<input required type="tel" className={inputClass} value={form.businessPhone || form.supportPhone || ''} onChange={event => { set('businessPhone', event.target.value); set('supportPhone', event.target.value); }} /></label>
          <label className={labelClass}>Country *<select required className={inputClass} value={form.country || 'India'} onChange={event => set('country', event.target.value)}>{['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'United Arab Emirates'].map(country => <option key={country}>{country}</option>)}</select></label>
          <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">Address *<textarea required rows={3} className={inputClass} value={form.businessAddress || form.address || ''} onChange={event => { set('businessAddress', event.target.value); set('address', event.target.value); }} /></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <ImageUpload label="Upload Logo *" value={form.businessLogo || form.logo || ''} onUpload={file => uploadImage('businessLogo', file)} onRemove={() => set('businessLogo', '')} />
          <ImageUpload label="Favicon *" value={form.favicon || ''} onUpload={file => uploadImage('favicon', file)} onRemove={() => set('favicon', '')} small />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Latitude<input type="number" step="any" className={inputClass} value={form.businessLat ?? ''} onChange={event => set('businessLat', event.target.value)} /></label><label className={labelClass}>Longitude<input type="number" step="any" className={inputClass} value={form.businessLng ?? ''} onChange={event => set('businessLng', event.target.value)} /></label></div>
      <div className="h-[320px] overflow-hidden rounded-lg border border-slate-200"><MapContainer key={`${latitude}-${longitude}`} center={[latitude, longitude]} zoom={13} className="h-full w-full"><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" /><MapClick onPick={(lat, lng) => setForm(current => ({ ...current, businessLat: Number(lat.toFixed(6)), businessLng: Number(lng.toFixed(6)) }))} /><Marker position={[latitude, longitude]} icon={pinIcon} /></MapContainer></div>
      <p className="text-xs text-slate-500">Map par click karke business location set karein.</p>
    </Section>

    <Section title="General Setup" description="Configure timezone, time display, and currency format.">
      <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">Website brand color<input aria-label="Website brand color" type="color" value={form.primaryColor || '#f45b15'} onChange={event => set('primaryColor', event.target.value)} className="h-10 w-16 cursor-pointer rounded border-0 bg-transparent" /></label>
      <div className="grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
        <label className={labelClass}>Time zone<select className={inputClass} value={form.timezone || 'Asia/Kolkata'} onChange={event => set('timezone', event.target.value)}>{['Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'Australia/Sydney', 'UTC'].map(zone => <option key={zone} value={zone}>{zone}</option>)}</select></label>
        <fieldset><legend className={labelClass}>Time Format</legend><RadioGroup name="timeFormat" value={String(form.timeFormat || '12')} onChange={value => set('timeFormat', value)} options={ [['12', '12 Hours'], ['24', '24 Hours']] } /></fieldset>
      </div>
      <div className="grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-3">
        <label className={labelClass}>Currency Symbol<select className={inputClass} value={form.currencySymbol || '₹'} onChange={event => { const option = CURRENCIES.find(item => item.symbol === event.target.value); setForm(current => ({ ...current, currencySymbol: event.target.value, currency: option?.code || current.currency })); }}>{CURRENCIES.map(item => <option key={item.code} value={item.symbol}>{item.code} ({item.symbol})</option>)}</select></label>
        <fieldset><legend className={labelClass}>Currency Position</legend><RadioGroup name="currencyPosition" value={form.currencyPosition || 'left'} onChange={value => set('currencyPosition', value)} options={ [['left', `${form.currencySymbol || '₹'} Left`], ['right', `${form.currencySymbol || '₹'} Right`]] } /></fieldset>
        <label className={labelClass}>Digit After Decimal Point<input type="number" min="0" max="4" className={inputClass} value={form.decimalDigits ?? 0} onChange={event => set('decimalDigits', event.target.value)} /></label>
      </div>
    </Section>

    <Section title="Business Model Setup" description="Choose how stores are charged and set default commission rates.">
      <div className="grid gap-4 sm:grid-cols-2"><Switch label="Subscription" description="Allow stores to operate using subscription packages." checked={form.subscriptionEnabled} onChange={value => set('subscriptionEnabled', value)} /><Switch label="Commission" description="Charge commission per order and delivery charge." checked={form.commissionEnabled} onChange={value => set('commissionEnabled', value)} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Default Commission Rate On Order (%) *<input type="number" min="0" max="100" step="0.1" className={inputClass} value={form.defaultCommission ?? 2.5} onChange={event => set('defaultCommission', event.target.value)} /></label><label className={labelClass}>Commission Rate On Delivery Charge (%) *<input type="number" min="0" max="100" step="0.1" className={inputClass} value={form.deliveryCommission ?? 7} onChange={event => set('deliveryCommission', event.target.value)} /></label></div>
    </Section>

    <Section title="Additional Charge Setup" description="Optional customer-paid charge added to orders.">
      <Switch label="Status" checked={form.additionalChargeEnabled} onChange={value => set('additionalChargeEnabled', value)} />
      <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Additional Charge Name<input maxLength={50} className={inputClass} value={form.additionalChargeName || ''} onChange={event => set('additionalChargeName', event.target.value)} /></label><label className={labelClass}>Charge Amount ({form.currencySymbol || '₹'})<input type="number" min="0" step="0.01" className={inputClass} value={form.additionalChargeAmount ?? 0} onChange={event => set('additionalChargeAmount', event.target.value)} /></label></div>
    </Section>

    <Section title="Other Setup" description="Country selection and customer-facing legal text.">
      <Switch label="Country Picker" description="Allow customers to choose their country." checked={form.countryPickerEnabled} onChange={value => set('countryPickerEnabled', value)} />
      <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Copyright Text<textarea maxLength={100} rows={3} className={inputClass} value={form.copyrightText || ''} onChange={event => set('copyrightText', event.target.value)} /></label><label className={labelClass}>Cookies Text *<textarea required maxLength={100} rows={3} className={inputClass} value={form.cookiesText || ''} onChange={event => set('cookiesText', event.target.value)} /></label></div>
    </Section>

    <div className="flex justify-end gap-2"><button type="button" onClick={loadSettings} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${listBtnOutline}`}><RotateCcw size={14} />Reset</button><button type="submit" disabled={saving} className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={14} />{saved ? 'Saved' : saving ? 'Saving...' : 'Save Information'}</button></div>
  </form>;
}

const CURRENCIES = [
  { code: 'INR', symbol: '₹' }, { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' }, { code: 'AED', symbol: 'د.إ' }, { code: 'AUD', symbol: 'A$' },
];

function RadioGroup({ name, value, onChange, options }) {
  return <div className="mt-1 flex min-h-[43px] flex-wrap items-center gap-5 rounded-lg border border-slate-200 bg-white px-3">{options.map(([option, label]) => <label key={option} className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} className="accent-blue-700" />{label}</label>)}</div>;
}

function ImageUpload({ label, value, onUpload, onRemove, small = false }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-700">{label}</p>{value && <button type="button" onClick={onRemove} className="text-xs text-rose-600">Remove</button>}</div><div className={`mt-3 flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white ${small ? 'h-20' : 'h-32'}`}>{value ? <img src={value} alt={label} className="max-h-full max-w-full object-contain" /> : <ImagePlus className="text-slate-400" size={small ? 24 : 32} />}</div><label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Upload size={14} />Upload image<input type="file" accept="image/*" className="sr-only" onChange={event => { onUpload(event.target.files?.[0]); event.target.value = ''; }} /></label><p className="mt-2 text-[11px] text-slate-400">JPG, PNG, GIF or WEBP. Max 3 MB.</p></div>;
}
