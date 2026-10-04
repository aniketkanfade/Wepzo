import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Store, Info, ImageIcon, User, KeyRound, FileText, Eye, EyeOff, RotateCcw, Save, Loader2, ArrowLeft, Check, X, ExternalLink, FileImage } from 'lucide-react';
import api from '../../api/axios';
import StoreLocationMap from './components/StoreLocationMap';
import { isInsideDeliveryZone, isInsideZone } from '../../constants/storeZones';
import { useDeliveryZones } from '../../hooks/useDeliveryZones';
import { useModuleStore } from '../../store/useStore';
import { getAdminModuleKey } from '../../constants/adminModules';
const EMPTY = {
  name: '', nameEn: '', nameHi: '',
  address: '', addressEn: '', addressHi: '',
  zone: '', deliveryMin: '', deliveryMax: '', deliveryUnit: 'Minutes',
  lat: 21.1458, lng: 79.0882,
  coverImage: '', logoImage: '',
  firstName: '', lastName: '', phone: '',
  email: '', password: '', confirmPassword: '',
  pan: '', gstin: '',
  panFile: '', panFileName: '',
  gstFile: '', gstFileName: '',
};

function Section({ icon: Icon, title, desc, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
          <Icon size={17} className="text-primary-600" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 text-sm">{title}</h2>
          {desc && <p className="text-xs text-gray-500">{desc}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-300" />
  );
}

function DocumentUpload({ label, required, hint, fileUrl, fileName, onChange }) {
  const isPdf = fileUrl?.startsWith('data:application/pdf') || fileName?.toLowerCase().endsWith('.pdf');
  const isImage = fileUrl && !isPdf;

  const pick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ data: reader.result, name: file.name });
    reader.readAsDataURL(file);
  };

  return (
    <Field label={label} required={required} hint={hint}>
      {fileUrl && (
        <div className="mb-3 border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
          {isImage ? (
            <img src={fileUrl} alt={label} className="w-full max-h-40 object-contain bg-white" />
          ) : (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
              <FileText size={28} />
              <span className="text-sm font-medium">PDF Document</span>
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-white text-xs">
            <span className="text-gray-600 truncate flex items-center gap-1"><FileImage size={12} /> {fileName || 'Uploaded file'}</span>
            <a href={fileUrl} target="_blank" rel="noreferrer" className="text-primary-600 font-semibold flex items-center gap-1 shrink-0">
              View <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}
      <label className="flex items-center gap-2 cursor-pointer">
        <span className="px-3 py-2 bg-primary-50 text-primary-700 text-xs font-semibold rounded-lg border border-primary-100 hover:bg-primary-100 transition">
          {fileUrl ? 'Replace File' : 'Choose File'}
        </span>
        <span className="text-xs text-gray-400">{fileName && !fileUrl ? fileName : 'No file chosen'}</span>
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={pick} />
      </label>
    </Field>
  );
}

function ImageUpload({ label, ratio, value, onChange }) {
  const pick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };
  return (
    <Field label={label} required>
      <label className={`block border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-300 hover:bg-primary-50/20 transition overflow-hidden ${ratio === '2:1' ? 'aspect-[2/1]' : 'aspect-square max-w-[180px]'}`}>
        {value ? (
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[100px] text-center p-4">
            <ImageIcon size={28} className="text-gray-300 mb-2" />
            <span className="text-sm font-semibold text-primary-600">Add Image</span>
            <span className="text-xs text-gray-400 mt-0.5">Ratio ({ratio})</span>
          </div>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={pick} />
      </label>
    </Field>
  );
}

function storeToForm(s) {
  const parts = (s.ownerName || '').split(' ');
  return {
    ...EMPTY,
    name: s.name || '',
    nameEn: s.nameEn || s.name || '',
    nameHi: s.nameHi || '',
    address: s.address || '',
    addressEn: s.addressEn || s.address || '',
    addressHi: s.addressHi || '',
    zone: s.area || s.zone || '',
    deliveryMin: s.deliveryMin ?? '',
    deliveryMax: s.deliveryMax ?? '',
    deliveryUnit: s.deliveryUnit || 'Minutes',
    lat: s.lat ?? 21.1458,
    lng: s.lng ?? 79.0882,
    coverImage: s.coverImage || '',
    logoImage: s.logoImage || '',
    firstName: s.firstName || parts[0] || '',
    lastName: s.lastName || parts.slice(1).join(' ') || '',
    phone: s.phone || '',
    email: s.email || '',
    pan: s.pan || '',
    gstin: s.gstin || '',
    panFile: s.panFile || '',
    panFileName: s.panFileName || '',
    gstFile: s.gstFile || '',
    gstFileName: s.gstFileName || '',
  };
}

function formToPayload(form, isEdit) {
  const payload = {
    name: form.name,
    nameEn: form.nameEn,
    nameHi: form.nameHi,
    address: form.address,
    addressEn: form.addressEn,
    addressHi: form.addressHi,
    area: form.zone,
    zone: form.zone,
    deliveryMin: form.deliveryMin,
    deliveryMax: form.deliveryMax,
    deliveryUnit: form.deliveryUnit,
    lat: form.lat,
    lng: form.lng,
    coverImage: form.coverImage,
    logoImage: form.logoImage,
    firstName: form.firstName,
    lastName: form.lastName,
    ownerName: `${form.firstName} ${form.lastName}`.trim(),
    phone: form.phone,
    email: form.email,
    pan: form.pan,
    gstin: form.gstin,
    panFile: form.panFile,
    panFileName: form.panFileName,
    gstFile: form.gstFile,
    gstFileName: form.gstFileName,
  };
  if (form.password) payload.password = form.password;
  return payload;
}

export default function StoreFormPage() {
  const { storeId } = useParams();
  const isEdit = !!storeId;
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [storeRecord, setStoreRecord] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const { zones } = useDeliveryZones();
  const activeModule = useModuleStore(state => state.activeModule);
  const isEcommerceModule = getAdminModuleKey(activeModule) === 'e-commerce';
  const commerceType = isEcommerceModule ? 'ecommerce' : 'quick_commerce';
  const commerceTypeLabel = isEcommerceModule ? 'E-Commerce' : 'Quick Commerce';
  const availableZones = zones.filter(zone => isEcommerceModule
    ? zone.commerceType === 'ecommerce'
    : zone.commerceType !== 'ecommerce');
  const selectedZone = zones.find(z => z.name === form.zone);

  const inside = (la, ln) => selectedZone
    ? (selectedZone.commerceType === 'ecommerce' && ['country', 'state', 'city'].includes(selectedZone.scope)
      ? true
      : isInsideDeliveryZone(selectedZone, la, ln))
    : isInsideZone(form.zone, la, ln);

  const isPendingRequest = storeRecord?.status === 'pending' || storeRecord?.isNewRequest;
  const backPath = isPendingRequest ? '/stores/new-requests' : '/stores/list';

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    api.get(`/stores/${storeId}`)
      .then(r => {
        setStoreRecord(r.data);
        setForm(storeToForm(r.data));
      })
      .catch(() => {
        alert('Store nahi mila — page refresh karein aur dubara try karein');
        navigate('/stores/new-requests');
      })
      .finally(() => setLoading(false));
  }, [storeId, isEdit]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleZoneChange = (newZone) => {
    set('zone', newZone);
    const z = zones.find(x => x.name === newZone);
    const ok = z
      ? isInsideDeliveryZone(z, form.lat, form.lng)
      : isInsideZone(newZone, form.lat, form.lng);
    if (form.lat && form.lng && newZone && !ok) {
      set('lat', null);
      set('lng', null);
    }
  };

  const handleLocationChange = ({ lat, lng, address }) => {
    set('lat', lat);
    set('lng', lng);
    if (address) {
      set('address', address);
      set('addressEn', address);
    }
  };

  const handleReset = () => setForm(isEdit ? form : EMPTY);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.address || !form.zone || !form.firstName || !form.phone || !form.email) {
      alert('Required fields fill karein (* marked)');
      return;
    }
    if (form.lat && form.lng && !inside(form.lat, form.lng)) {
      alert('Store location selected zone ke andar honi chahiye');
      return;
    }
    if (!isEdit && (!form.password || form.password.length < 8)) {
      alert('Password 8+ characters hona chahiye');
      return;
    }
    if (form.password && form.password !== form.confirmPassword) {
      alert('Password match nahi ho raha');
      return;
    }
    if (!form.pan) {
      alert('PAN number zaroori hai');
      return;
    }
    setSaving(true);
    try {
      const payload = formToPayload(form, isEdit);
      if (isEdit) {
        const { data } = await api.put(`/stores/${storeId}`, payload);
        setStoreRecord(data);
        navigate(backPath);
      } else {
        const { data } = await api.post('/stores', payload);
        navigate(`/stores/edit/${data.storeId}`);
      }
    } catch {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Store approve karna hai?')) return;
    setSaving(true);
    try {
      await api.put(`/stores/${storeId}`, formToPayload(form, true));
      await api.post(`/stores/${storeId}/approve`);
      navigate('/stores/new-requests');
    } catch {
      alert('Approve failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Request reject karni hai?')) return;
    await api.post(`/stores/${storeId}/reject`);
    navigate('/stores/new-requests');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
        <Loader2 size={28} className="animate-spin text-primary-500" />
        <p className="text-sm">Store load ho raha hai...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link to={backPath}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 mb-1">
            <ArrowLeft size={14} /> Back
          </Link>
          <p className="text-xs text-gray-400">
            Dashboard &rsaquo; Store Management &rsaquo; {isPendingRequest ? 'Review Store Request' : isEdit ? 'Edit Store' : 'Add Store'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center">
          <Store size={22} className="text-primary-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isPendingRequest ? 'Review Store Request' : isEdit ? 'Edit Store' : 'Add New Store'}
          </h1>
          <p className="text-sm text-gray-500">
            {isPendingRequest ? 'Store ki details verify karein, documents dekhein aur approve/reject karein' : 'Wepzo business setup — saari details ek jagah'}
          </p>
        </div>
      </div>

      {isPendingRequest && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div>
            <p className="text-sm font-bold text-amber-800">Pending Approval</p>
            <p className="text-xs text-amber-600">Submitted: {storeRecord?.createdAt || '—'}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleApprove} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold disabled:opacity-60">
              <Check size={14} /> Approve Store
            </button>
            <button type="button" onClick={handleReject}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold">
              <X size={14} /> Reject
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Information */}
        <Section icon={Info} title="Basic Information" desc="Yahan aap apni saari business information setup karte hain">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Field label="Business name" required>
                <TextInput value={form.name} onChange={v => set('name', v)} placeholder="Business name" />
              </Field>
              <Field label="Business zone" required hint="Pehle zone select karein — map usi area ke andar location dikhayega">
                <select value={form.zone} onChange={e => handleZoneChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-primary-500/25">
                  <option value="">Select zone</option>
                  <optgroup label={commerceTypeLabel}>
                    {availableZones.map(z => (
                      <option key={z._id} value={z.name}>{z.name}</option>
                    ))}
                  </optgroup>
                </select>
              </Field>
              <Field label="Business address" required hint="Map se location select karte hi address auto-fill hoga">
                <textarea value={form.address || ''} onChange={e => set('address', e.target.value)} rows={3} placeholder="Map par location select karein ya manually likhein"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-primary-500/25" />
              </Field>
              <Field label="Estimated Delivery Time (Min & Maximum Time)" required>
                <div className="flex gap-2">
                  <TextInput value={form.deliveryMin} onChange={v => set('deliveryMin', v)} placeholder="Ex : 30" />
                  <TextInput value={form.deliveryMax} onChange={v => set('deliveryMax', v)} placeholder="Ex : 60" />
                  <select value={form.deliveryUnit} onChange={e => set('deliveryUnit', e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white shrink-0">
                    <option>Minutes</option>
                    <option>Hours</option>
                  </select>
                </div>
              </Field>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">Set Business Location on Map</p>
              <p className="text-xs text-gray-500 mb-2">Exact business location map par mark karein</p>
              <StoreLocationMap
                zone={form.zone}
                zoneData={selectedZone}
                lat={form.lat}
                lng={form.lng}
                onLocationChange={handleLocationChange}
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Field label="Latitude">
                  <TextInput value={form.lat != null ? String(form.lat) : ''} onChange={v => {
                    const la = parseFloat(v);
                    if (form.zone && form.lng && inside(la, form.lng)) set('lat', la);
                  }} placeholder="Ex: 21.1458" />
                </Field>
                <Field label="Longitude">
                  <TextInput value={form.lng != null ? String(form.lng) : ''} onChange={v => {
                    const ln = parseFloat(v);
                    if (form.zone && form.lat && inside(form.lat, ln)) set('lng', ln);
                  }} placeholder="Ex: 79.0882" />
                </Field>
              </div>
            </div>
          </div>
        </Section>

        {/* General Setup */}
        <Section icon={ImageIcon} title="General Setup" desc="Business logo aur cover images setup karein">
          <p className="text-xs text-gray-500 mb-4">Format: Jpg, jpeg, png, gif, webp. Less Than 2MB</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageUpload label="Business Cover" ratio="2:1" value={form.coverImage} onChange={v => set('coverImage', v)} />
            <ImageUpload label="Business Logo" ratio="1:1" value={form.logoImage} onChange={v => set('logoImage', v)} />
          </div>
        </Section>

        {/* Owner Info */}
        <Section icon={User} title="Business Owner Info" desc="Business owner ki details">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="First name" required>
              <TextInput value={form.firstName} onChange={v => set('firstName', v)} placeholder="First name" />
            </Field>
            <Field label="Last name" required>
              <TextInput value={form.lastName} onChange={v => set('lastName', v)} placeholder="Last name" />
            </Field>
            <Field label="Phone" required>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500/25">
                <span className="flex items-center gap-1 px-3 bg-gray-50 border-r border-gray-200 text-sm text-gray-600 shrink-0">🇮🇳 +91</span>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone number"
                  className="flex-1 px-3 py-2.5 text-sm outline-none" />
              </div>
            </Field>
          </div>
        </Section>

        {/* Account */}
        <Section icon={KeyRound} title="Account Information" desc="Login credentials setup karein">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Email" required>
              <TextInput value={form.email} onChange={v => set('email', v)} placeholder="store@email.com" type="email" />
            </Field>
            <Field label="Password" required={!isEdit} hint={isEdit ? 'Blank chhodo to password same rahega' : '8+ characters required'}>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder={isEdit ? '••••••••' : '8+ characters required'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary-500/25" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <Field label="Confirm password" required={!isEdit && !!form.password}>
              <input type={showPass ? 'text' : 'password'} value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                placeholder="Confirm password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/25" />
            </Field>
          </div>
        </Section>

        {/* PAN & GST */}
        <Section icon={FileText} title="PAN & GST" desc="Business PAN provide karein. GSTIN sirf tab add karein jab GST registered ho">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="PAN (Permanent Account Number)" required>
              <TextInput value={form.pan} onChange={v => set('pan', v.toUpperCase())} placeholder="ENTER PAN (E.G. ABCDE1234F)" />
            </Field>
            <Field label="GST number (GSTIN)" hint="Optional — 15 characters">
              <TextInput value={form.gstin} onChange={v => set('gstin', v.toUpperCase())} placeholder="GSTIN — OPTIONAL (15 CHARACTERS)" />
            </Field>
            <DocumentUpload
              label="PAN card photo / scan"
              required
              hint="JPG, PNG or PDF — max 2 MB"
              fileUrl={form.panFile}
              fileName={form.panFileName}
              onChange={({ data, name }) => { set('panFile', data); set('panFileName', name); }}
            />
            <DocumentUpload
              label="GST registration certificate"
              hint="Required when GSTIN is provided"
              fileUrl={form.gstFile}
              fileName={form.gstFileName}
              onChange={({ data, name }) => { set('gstFile', data); set('gstFileName', name); }}
            />
          </div>
        </Section>

        {/* Footer */}
        <div className="flex flex-wrap justify-between gap-3 sticky bottom-0 bg-gray-50/90 backdrop-blur border border-gray-200 rounded-xl px-5 py-3">
          {isPendingRequest ? (
            <p className="text-xs text-gray-500 self-center">Changes save karein, phir Approve karein</p>
          ) : <span />}
          <div className="flex gap-3 ml-auto">
            <button type="button" onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-white transition">
              <RotateCcw size={15} /> Reset
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold shadow-sm transition">
              <Save size={15} /> {saving ? 'Saving...' : isEdit ? 'Update Store' : 'Save Store'}
            </button>
            {isPendingRequest && (
              <button type="button" onClick={handleApprove} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold shadow-sm transition">
                <Check size={15} /> Approve
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
