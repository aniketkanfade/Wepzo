import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bike, Check, ChevronLeft, ChevronRight, CircleAlert, ClipboardList, Eye, FileImage, Pencil, Plus, RefreshCw,
  Star, Trash2, UserRound, X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { listBtnNavy, listBtnOutline } from '../../constants/listTheme';

const FIELD_CLASS = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const BUTTON_PRIMARY = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a3a8a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#15306f] disabled:cursor-not-allowed disabled:opacity-50';
const BUTTON_OUTLINE = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const REGISTRATION_DOCUMENTS = [
  { key: 'license', label: 'Driving License' },
  { key: 'rc', label: 'Vehicle RC' },
  { key: 'pan', label: 'PAN Card' },
  { key: 'aadhaar', label: 'Aadhaar Card' },
];
const EMPTY_DOCUMENTS = { license: null, rc: null, pan: null, aadhaar: null };
const EMPTY_FORM = { name: '', phone: '', email: '', area: '', location: '', vehicleCategoryId: '', vehicleNumber: '', documents: EMPTY_DOCUMENTS };

function PageTitle({ icon: Icon, eyebrow, title, description, action }) {
  return <header className="flex flex-wrap items-end justify-between gap-3">
    <div>
      <p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">{eyebrow}</p>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-slate-900"><Icon size={23} />{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
    {action}
  </header>;
}

function Notice({ error, success }) {
  if (!error && !success) return null;
  return <p role={error ? 'alert' : 'status'} className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
    {error ? <CircleAlert size={16} /> : <Check size={16} />}{error || success}
  </p>;
}

function FormField({ label, name, value, onChange, required = false, type = 'text', children }) {
  return <label className="block text-sm font-semibold text-slate-700">
    {label}{required && <span className="ml-1 text-rose-600">*</span>}
    {children || <input className={FIELD_CLASS} name={name} type={type} value={value} onChange={onChange} required={required} />}
  </label>;
}

function RegistrationDocumentUpload({ label, document, onChange, onError }) {
  const pickImage = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      onError('Choose a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > 1024 * 1024) {
      onError(`${label} image must be 1 MB or smaller.`);
      return;
    }
    onError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onChange({ data: reader.result, name: file.name });
      else onError(`${label} image could not be read.`);
    };
    reader.onerror = () => onError(`${label} image could not be read.`);
    reader.readAsDataURL(file);
  };

  return <div className="rounded-xl border border-slate-200 p-3">
    <p className="mb-2 text-sm font-semibold text-slate-700">{label}</p>
    {document?.data && <img src={document.data} alt={label} className="mb-3 h-32 w-full rounded-lg bg-slate-50 object-contain" />}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label className={BUTTON_OUTLINE}>
        <FileImage size={15} />{document?.data ? 'Replace image' : 'Upload image'}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pickImage} />
      </label>
      {document?.data && <button type="button" className="text-xs font-semibold text-rose-700 hover:underline" onClick={() => onChange(null)}>Remove</button>}
    </div>
    <p className="mt-2 truncate text-xs text-slate-500">{document?.name || 'JPG, PNG or WebP · up to 1 MB'}</p>
  </div>;
}

function RegistrationDocumentViewer({ viewer, onClose }) {
  if (!viewer) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="registration-documents-title" onClick={onClose}>
    <section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h2 id="registration-documents-title" className="text-lg font-bold text-slate-900">{viewer.title}</h2><p className="text-sm text-slate-500">Uploaded identity and vehicle images</p></div>
        <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Close documents"><X size={18} /></button>
      </div>
      {REGISTRATION_DOCUMENTS.some(({ key }) => viewer.documents?.[key]?.data)
        ? <div className="grid gap-4 sm:grid-cols-2">{REGISTRATION_DOCUMENTS.filter(({ key }) => viewer.documents?.[key]?.data).map(({ key, label }) => (
          <figure key={key} className="overflow-hidden rounded-xl border border-slate-200">
            <figcaption className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{label}</figcaption>
            <a href={viewer.documents[key].data} target="_blank" rel="noreferrer" title={`Open ${label} image`}>
              <img src={viewer.documents[key].data} alt={label} className="h-64 w-full bg-slate-50 object-contain" />
            </a>
            <p className="truncate border-t border-slate-100 px-3 py-2 text-xs text-slate-500">{viewer.documents[key].name || 'Uploaded image'}</p>
          </figure>
        ))}</div>
        : <EmptyState>No registration images were uploaded.</EmptyState>}
    </section>
  </div>;
}

function StatusPill({ status }) {
  const style = status === 'Approved' || status === 'active' || status === 'Online'
    ? 'bg-emerald-50 text-emerald-700'
    : status === 'Rejected' || status === 'inactive'
      ? 'bg-rose-50 text-rose-700'
      : status === 'Offline'
        ? 'bg-slate-100 text-slate-600'
        : 'bg-amber-50 text-amber-800';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{status || 'Pending'}</span>;
}

function EmptyState({ children }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center text-sm text-slate-500">{children}</div>;
}

export default function DeliveryManagementPage({ section }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [documentViewer, setDocumentViewer] = useState(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState('');
  const [editingRider, setEditingRider] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (section === 'vehicles' || section === 'add' || section === 'requests') {
        const lookups = [api.get('/delivery-vehicle-categories')];
        if (section === 'add' || section === 'requests') lookups.push(api.get('/zones'));
        const [categoriesResult, zonesResult] = await Promise.all(lookups);
        setCategories(Array.isArray(categoriesResult.data) ? categoriesResult.data : []);
        if (section === 'add' || section === 'requests') {
          setZones(Array.isArray(zonesResult.data)
            ? zonesResult.data.filter(zone => zone.status !== false && zone.status !== 'false' && zone.status !== 'inactive')
            : []);
        }
      }
      if (section === 'riders') {
        const { data } = await api.get('/delivery-men', { params: { includeOffline: '1' } });
        setItems(Array.isArray(data) ? data : []);
      } else if (section === 'requests') {
        const { data } = await api.get('/delivery-man-requests');
        setItems(Array.isArray(data) ? data : []);
      } else if (section === 'reviews') {
        const { data } = await api.get('/delivery-reviews');
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Delivery data could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (section !== 'add') return;
    const id = searchParams.get('id');
    if (!id) {
      setEditingRider('');
      setForm(EMPTY_FORM);
      setFormLoading(false);
      return;
    }
    let active = true;
    setFormLoading(true);
    const loadRiderForm = async () => {
      try {
        const { data } = await api.get('/delivery-men', { params: { includeOffline: '1' } });
        const rider = (Array.isArray(data) ? data : []).find(item => item._id === id);
        if (!active) return;
        if (!rider) {
          setError('This delivery rider could not be found.');
          return;
        }
        const { data: documentsData } = await api.get(`/delivery-men/${encodeURIComponent(id)}/documents`);
        if (!active) return;
        setEditingRider(id);
        setForm({
          name: rider.name || '', phone: rider.phone || '', email: rider.email || '',
          area: rider.area || '', location: rider.location || '',
          vehicleCategoryId: rider.vehicleCategoryId || '',
          vehicleNumber: rider.vehicleNumber || '',
          documents: documentsData.documents || EMPTY_DOCUMENTS,
        });
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Delivery rider details could not be loaded.');
      } finally {
        if (active) setFormLoading(false);
      }
    };
    loadRiderForm();
    return () => { active = false; };
  }, [section, searchParams]);

  const visibleItems = items.filter(item => [
    item.name, item.phone, item.email, item.area, item.riderName, item.customerName, item.orderNo, item.comment,
  ].some(value => String(value || '').toLowerCase().includes(search.toLowerCase())));
  const perPage = 10;
  const totalPages = Math.ceil(visibleItems.length / perPage) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = visibleItems.slice((currentPage - 1) * perPage, currentPage * perPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(value => value === 1 || value === totalPages || Math.abs(value - currentPage) <= 2)
    .reduce((numbers, value, index, pages) => {
      if (index > 0 && value - pages[index - 1] > 1) numbers.push('…');
      numbers.push(value);
      return numbers;
    }, []);

  const updateForm = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const updateDocument = (key, document) => setForm(current => ({
    ...current,
    documents: { ...(current.documents || EMPTY_DOCUMENTS), [key]: document },
  }));

  const openDocuments = async (type, item) => {
    setDocumentLoading(true);
    setError('');
    try {
      const endpoint = type === 'rider'
        ? `/delivery-men/${encodeURIComponent(item._id)}/documents`
        : `/delivery-man-requests/${encodeURIComponent(item._id)}/documents`;
      const { data } = await api.get(endpoint);
      setDocumentViewer({ title: `${item.name || 'Delivery man'} · Registration documents`, documents: data.documents || {} });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Registration documents could not be loaded.');
    } finally {
      setDocumentLoading(false);
    }
  };

  const saveRider = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = editingRider
        ? await api.put(`/delivery-men/${editingRider}`, form)
        : await api.post('/delivery-men', form);
      setSuccess(editingRider ? 'Delivery rider updated.' : `${data.name} added to the delivery team.`);
      if (!editingRider) setForm(EMPTY_FORM);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Delivery rider could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const saveRequest = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/delivery-man-requests', form);
      setForm(EMPTY_FORM);
      setSuccess('Delivery man request added to the review queue.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Delivery man request could not be created.');
    } finally {
      setSaving(false);
    }
  };

  const reviewRequest = async (id, status) => {
    setError('');
    try {
      await api.put(`/delivery-man-requests/${id}`, { status });
      setSuccess(status === 'Approved' ? 'Request approved and rider added.' : 'Request rejected.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Request could not be updated.');
    }
  };

  const saveVehicleCategory = async event => {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const endpoint = editingCategory ? `/delivery-vehicle-categories/${editingCategory}` : '/delivery-vehicle-categories';
      const { data } = editingCategory
        ? await api.put(endpoint, { name: categoryName })
        : await api.post(endpoint, { name: categoryName });
      setCategories(current => editingCategory
        ? current.map(item => item._id === data._id ? data : item)
        : [data, ...current]);
      setCategoryName('');
      setEditingCategory('');
      setSuccess(editingCategory ? 'Vehicle category updated.' : 'Vehicle category added.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Vehicle category could not be saved.');
    }
  };

  const removeVehicleCategory = async item => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    setError('');
    try {
      await api.delete(`/delivery-vehicle-categories/${item._id}`);
      setCategories(current => current.filter(row => row._id !== item._id));
      setSuccess('Vehicle category deleted.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Vehicle category could not be deleted.');
    }
  };

  const removeRider = async item => {
    if (!window.confirm(`Delete ${item.name} from the delivery team?`)) return;
    setError('');
    try {
      await api.delete(`/delivery-men/${item._id}`);
      setItems(current => current.filter(row => row._id !== item._id));
      setSuccess('Delivery rider deleted.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Delivery rider could not be deleted.');
    }
  };

  const moderateReview = async (item, status) => {
    setError('');
    try {
      const { data } = await api.put(`/delivery-reviews/${item._id}`, { status });
      setItems(current => current.map(row => row._id === data._id ? data : row));
      setSuccess(`Review ${status.toLowerCase()}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Delivery review could not be updated.');
    }
  };

  const removeReview = async item => {
    if (!window.confirm('Delete this delivery review?')) return;
    setError('');
    try {
      await api.delete(`/delivery-reviews/${item._id}`);
      setItems(current => current.filter(row => row._id !== item._id));
      setSuccess('Delivery review deleted.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Delivery review could not be deleted.');
    }
  };

  if (section === 'vehicles') return <main className="mx-auto max-w-[1200px] space-y-5 p-4 sm:p-6">
    <PageTitle icon={Bike} eyebrow="Delivery management" title="Vehicles Category" description="Set up the vehicle types available to delivery riders." />
    <Notice error={error} success={success} />
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <form onSubmit={saveVehicleCategory} className="h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">{editingCategory ? 'Edit vehicle category' : 'Add vehicle category'}</h2>
        <FormField label="Category name" value={categoryName} name="name" required onChange={event => setCategoryName(event.target.value)} />
        <div className="flex gap-2">
          <button className={BUTTON_PRIMARY} type="submit"><Plus size={16} />{editingCategory ? 'Save changes' : 'Add category'}</button>
          {editingCategory && <button type="button" className={BUTTON_OUTLINE} onClick={() => { setEditingCategory(''); setCategoryName(''); }}>Cancel</button>}
        </div>
      </form>
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 font-bold text-slate-900">Vehicle types <span className="ml-1 text-sm font-semibold text-slate-400">{categories.length}</span></div>
        {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading vehicle categories…</div> : categories.length === 0
          ? <EmptyState>No vehicle categories yet. Add one to start adding riders.</EmptyState>
          : <div className="divide-y divide-slate-100">{categories.map(item => <div key={item._id} className="flex items-center justify-between gap-3 px-5 py-3">
            <span className="font-semibold text-slate-800">{item.name}</span>
            <div className="flex gap-2">
              <button type="button" className={BUTTON_OUTLINE} onClick={() => { setEditingCategory(item._id); setCategoryName(item.name); }} aria-label={`Edit ${item.name}`}><Pencil size={15} />Edit</button>
              <button type="button" className="rounded-lg border border-rose-200 p-2 text-rose-700 hover:bg-rose-50" onClick={() => removeVehicleCategory(item)} aria-label={`Delete ${item.name}`}><Trash2 size={16} /></button>
            </div>
          </div>)}</div>}
      </section>
    </section>
  </main>;

  if (section === 'add') return <main className="mx-auto max-w-[980px] space-y-5 p-4 sm:p-6">
    <PageTitle icon={UserRound} eyebrow="Delivery management" title={editingRider ? 'Edit Delivery Man' : 'Add Delivery Man'} description={<>Add a delivery rider to this module. To enable rider app login, <Link className="font-semibold text-blue-700 underline" to="/settings/employees/add">create an employee account</Link> and link the rider.</>} />
    <Notice error={error} success={success} />
    {formLoading && <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">Loading rider details and registration images…</p>}
    {categories.length === 0 && !loading && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Add a vehicle category before adding a delivery rider.</p>}
    <form onSubmit={saveRider} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
      <FormField label="Full name" name="name" value={form.name} required onChange={updateForm} />
      <FormField label="Phone number" name="phone" type="tel" value={form.phone} required onChange={updateForm} />
      <FormField label="Email" name="email" type="email" value={form.email} onChange={updateForm} />
      <FormField label="Delivery zone" name="area" value={form.area} onChange={updateForm}>
        <select className={FIELD_CLASS} name="area" value={form.area} onChange={updateForm}>
          <option value="">Select delivery zone</option>
          {zones.map(zone => <option key={zone._id} value={zone.name}>{zone.name}</option>)}
        </select>
        {!zones.length && <span className="mt-1 block text-xs font-normal text-amber-700">No active zones found. Create a zone in Delivery Zones first.</span>}
      </FormField>
      <FormField label="Current location / address" name="location" value={form.location} onChange={updateForm} />
      <FormField label="Vehicle category" name="vehicleCategoryId" value={form.vehicleCategoryId} required onChange={updateForm}>
        <select className={FIELD_CLASS} name="vehicleCategoryId" value={form.vehicleCategoryId} onChange={updateForm} required><option value="">Select vehicle category</option>{categories.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
      </FormField>
      <FormField label="Vehicle registration number" name="vehicleNumber" value={form.vehicleNumber} onChange={updateForm} />
      <section className="space-y-3 border-t border-slate-100 pt-4 sm:col-span-2">
        <div><h2 className="font-bold text-slate-900">Registration documents</h2><p className="text-xs text-slate-500">Upload clear JPG, PNG or WebP images. Each image can be up to 1 MB.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">{REGISTRATION_DOCUMENTS.map(({ key, label }) => (
          <RegistrationDocumentUpload key={key} label={label} document={form.documents?.[key]}
            onChange={document => updateDocument(key, document)} onError={setError} />
        ))}</div>
      </section>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 sm:col-span-2">
        <button type="button" className={BUTTON_OUTLINE} onClick={() => navigate('/delivery/riders')}>Cancel</button>
        <button className={BUTTON_PRIMARY} disabled={saving || formLoading || categories.length === 0}><Plus size={16} />{saving ? 'Saving…' : editingRider ? 'Save changes' : 'Add delivery man'}</button>
      </div>
    </form>
  </main>;

  if (section === 'requests') return <main className="mx-auto max-w-[1200px] space-y-5 p-4 sm:p-6">
    <PageTitle icon={ClipboardList} eyebrow="Delivery management" title="New Delivery Man Requests" description="Record incoming rider applications, then approve or reject each request." />
    <Notice error={error} success={success} />
    <form onSubmit={saveRequest} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      <FormField label="Full name" name="name" value={form.name} required onChange={updateForm} />
      <FormField label="Phone number" name="phone" type="tel" value={form.phone} required onChange={updateForm} />
      <FormField label="Email" name="email" type="email" value={form.email} onChange={updateForm} />
      <FormField label="Delivery zone" name="area" value={form.area} onChange={updateForm}>
        <select className={FIELD_CLASS} name="area" value={form.area} onChange={updateForm}>
          <option value="">Select delivery zone</option>
          {zones.map(zone => <option key={zone._id} value={zone.name}>{zone.name}</option>)}
        </select>
        {!zones.length && <span className="mt-1 block text-xs font-normal text-amber-700">No active zones found. Create a zone in Delivery Zones first.</span>}
      </FormField>
      <FormField label="Current location / address" name="location" value={form.location} onChange={updateForm} />
      <FormField label="Vehicle category" name="vehicleCategoryId" value={form.vehicleCategoryId} required onChange={updateForm}>
        <select className={FIELD_CLASS} name="vehicleCategoryId" value={form.vehicleCategoryId} onChange={updateForm} required><option value="">Select vehicle category</option>{categories.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
      </FormField>
      <FormField label="Vehicle registration number" name="vehicleNumber" value={form.vehicleNumber} onChange={updateForm} />
      <section className="space-y-3 lg:col-span-4">
        <div><h2 className="font-bold text-slate-900">Registration documents</h2><p className="text-xs text-slate-500">Upload clear JPG, PNG or WebP images. Each image can be up to 1 MB.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{REGISTRATION_DOCUMENTS.map(({ key, label }) => (
          <RegistrationDocumentUpload key={key} label={label} document={form.documents?.[key]}
            onChange={document => updateDocument(key, document)} onError={setError} />
        ))}</div>
      </section>
      <div className="flex items-end"><button className={BUTTON_PRIMARY} disabled={saving || categories.length === 0}><Plus size={16} />Add request</button></div>
    </form>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-900">Applications <span className="text-sm text-slate-500">({items.length})</span></h2><input className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Search applications" value={search} onChange={event => setSearch(event.target.value)} /></div>
    {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading applications…</div> : visibleItems.length === 0 ? <EmptyState>No delivery man requests found.</EmptyState> :
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Applicant', 'Contact', 'Area', 'Vehicle', 'Status', 'Documents', 'Actions'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{visibleItems.map(item => <tr key={item._id}>
          <td className="px-4 py-3 font-semibold text-slate-800">{item.name}<div className="text-xs font-normal text-slate-500">{item.email}</div></td>
          <td className="px-4 py-3">{item.phone}</td><td className="px-4 py-3">{item.area || '—'}</td><td className="px-4 py-3">{item.vehicle || '—'}</td>
          <td className="px-4 py-3"><StatusPill status={item.status} /></td>
          <td className="px-4 py-3"><button type="button" className={BUTTON_OUTLINE} disabled={documentLoading} onClick={() => openDocuments('request', item)}><Eye size={14} />View images</button></td>
          <td className="px-4 py-3">{item.status === 'Pending' && <div className="flex gap-2"><button type="button" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800" onClick={() => reviewRequest(item._id, 'Approved')}>Approve</button><button type="button" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800" onClick={() => reviewRequest(item._id, 'Rejected')}>Reject</button></div>}</td>
        </tr>)}</tbody>
      </table></div>}
    <RegistrationDocumentViewer viewer={documentViewer} onClose={() => setDocumentViewer(null)} />
  </main>;

  if (section === 'reviews') return <main className="mx-auto max-w-[1200px] space-y-5 p-4 sm:p-6">
    <PageTitle icon={Star} eyebrow="Delivery management" title="Delivery Reviews" description="Review customer feedback submitted after a completed delivery. Approved ratings update the rider profile." />
    <Notice error={error} success={success} />
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-700">{items.filter(item => item.status === 'Pending').length} pending review(s)</p><input className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Search reviews" value={search} onChange={event => setSearch(event.target.value)} /></div>
    {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading reviews…</div> : visibleItems.length === 0 ? <EmptyState>No delivery reviews found.</EmptyState> :
      <div className="grid gap-3">{visibleItems.map(item => <article key={item._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="flex items-center gap-1 text-amber-500" aria-label={`${item.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} className={index < item.rating ? 'fill-current' : ''} />)}<span className="ml-1 text-sm font-bold text-slate-700">{item.rating}/5</span></div>
            <p className="mt-2 font-bold text-slate-900">{item.riderName || 'Delivery rider'} <span className="font-normal text-slate-400">· order #{item.orderNo || '—'}</span></p>
            <p className="text-xs text-slate-500">By {item.customerName || 'Customer'} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</p>
          </div>
          <div className="flex items-center gap-2"><StatusPill status={item.status} />
            {item.status === 'Pending' && <><button type="button" className="rounded-lg bg-emerald-50 p-2 text-emerald-800" aria-label="Approve review" onClick={() => moderateReview(item, 'Approved')}><Check size={16} /></button><button type="button" className="rounded-lg bg-rose-50 p-2 text-rose-800" aria-label="Reject review" onClick={() => moderateReview(item, 'Rejected')}><X size={16} /></button></>}
            <button type="button" className="rounded-lg border border-rose-200 p-2 text-rose-700" aria-label="Delete review" onClick={() => removeReview(item)}><Trash2 size={16} /></button>
          </div>
        </div>
        {item.comment && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{item.comment}</p>}
      </article>)}</div>}
  </main>;

  return <main className="mx-auto max-w-[1200px] space-y-5 p-4 sm:p-6">
    <PageTitle icon={Bike} eyebrow="Delivery management" title="Deliveryman List" description="Manage rider contact, vehicle and service area details." action={<button type="button" className={BUTTON_PRIMARY} onClick={() => navigate('/delivery/add')}><Plus size={16} />Add Delivery Man</button>} />
    <Notice error={error} success={success} />
    <input className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2.5 text-sm" placeholder="Search by name, phone or area" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
    {loading ? <div className="p-8 text-center text-sm text-slate-500"><RefreshCw size={17} className="mr-2 inline animate-spin" />Loading delivery riders…</div> : visibleItems.length === 0 ? <EmptyState>No delivery riders found.</EmptyState> :
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="max-h-[65vh] overflow-auto"><table className="w-full min-w-[780px] text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Delivery man', 'Phone', 'Area', 'Vehicle', 'Rating', 'Availability', 'Actions'].map(label => <th key={label} className="bg-slate-50 px-4 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{paginatedItems.map(item => <tr key={item._id}>
          <td className="px-4 py-3 font-semibold text-slate-800">{item.name}<div className="text-xs font-normal text-slate-500">{item.email || 'No email'}</div></td>
          <td className="px-4 py-3">{item.phone}</td><td className="px-4 py-3">{item.area || '—'}</td><td className="px-4 py-3">{[item.vehicle, item.vehicleNumber].filter(Boolean).join(' · ') || '—'}</td>
          <td className="px-4 py-3">{item.rating == null ? '—' : <span className="inline-flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" />{Number(item.rating).toFixed(1)}</span>}</td>
          <td className="px-4 py-3"><StatusPill status={item.online ? 'Online' : 'Offline'} /></td>
          <td className="px-4 py-3"><div className="flex gap-2"><button type="button" className={BUTTON_OUTLINE} disabled={documentLoading} onClick={() => openDocuments('rider', item)} aria-label={`View ${item.name} registration images`}><Eye size={14} /><span className="sr-only">Documents</span></button><button type="button" className={BUTTON_OUTLINE} onClick={() => navigate(`/delivery/add?id=${encodeURIComponent(item._id)}`)}><Pencil size={14} />Edit</button><button type="button" className="rounded-lg border border-rose-200 p-2 text-rose-700" onClick={() => removeRider(item)} aria-label={`Delete ${item.name}`}><Trash2 size={16} /></button></div></td>
        </tr>)}</tbody>
      </table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:px-6">
        <p className="text-sm text-slate-500">Showing {visibleItems.length ? (currentPage - 1) * perPage + 1 : 0} to {Math.min(currentPage * perPage, visibleItems.length)} of {visibleItems.length} entries</p>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
            aria-label="Previous page" className={`rounded-lg p-2 transition disabled:opacity-40 ${listBtnOutline}`}>
            <ChevronLeft size={16} />
          </button>
          {pageNumbers.map((number, index) => typeof number === 'string' ? (
            <span key={`gap-${index}`} className="w-8 text-center text-sm text-slate-400">…</span>
          ) : (
            <button key={number} type="button" onClick={() => setPage(number)} aria-current={currentPage === number ? 'page' : undefined}
              className={`h-9 min-w-9 rounded-lg px-1 text-sm font-medium transition ${currentPage === number ? listBtnNavy : listBtnOutline}`}>
              {number}
            </button>
          ))}
          <button type="button" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
            aria-label="Next page" className={`rounded-lg p-2 transition disabled:opacity-40 ${listBtnOutline}`}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div></div>}
    <RegistrationDocumentViewer viewer={documentViewer} onClose={() => setDocumentViewer(null)} />
  </main>;
}
