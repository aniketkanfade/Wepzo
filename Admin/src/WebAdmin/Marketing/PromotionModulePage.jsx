import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Edit, Trash2, ArrowLeft, Upload, Image as ImageIcon, Video } from 'lucide-react';
import api from '../../api/axios';
import { numericInputValue } from '../../utils/numericInput';
import AdminListLayout from '../Qucik commerce/components/AdminListLayout';
import { useListPagination } from '../../hooks/useListPagination';
import { PROMOTION_MODULES, STATUS_STYLES } from './promotionModules';
import { listBtnNavy, listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass } from '../../constants/listTheme';
import { readVideoAsDataUrl } from '../../utils/mediaUtils';

function readBannerImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Failed to load image'));
      image.onload = () => {
        const scale = Math.min(1, 1800 / image.width, 1000 / image.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        let quality = 0.9;
        let data = canvas.toDataURL('image/jpeg', quality);
        while (data.length * 0.75 > 6 * 1024 * 1024 && quality > 0.4) {
          quality -= 0.1;
          data = canvas.toDataURL('image/jpeg', quality);
        }
        if (data.length * 0.75 > 6 * 1024 * 1024) reject(new Error('Image is too large to save'));
        else resolve(data);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function PromotionModulePage() {
  const { module } = useParams();
  const config = PROMOTION_MODULES[module];
  const [items, setItems] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [mediaError, setMediaError] = useState('');
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState([]);
  const [stores, setStores] = useState([]);
  const stopRow = (e) => e.stopPropagation();

  useEffect(() => {
    if (!config) return;
    api.get(`/promotions/${config.type}`).then(r => setItems(r.data)).catch(() => {});
  }, [config]);

  useEffect(() => {
    if (config?.type !== 'banners') return;
    api.get('/system-modules').then(r => setModules(Array.isArray(r.data) ? r.data.filter(item => item.status !== false && item.status !== 'inactive') : [])).catch(() => setModules([]));
  }, [config]);

  useEffect(() => {
    if (config?.type !== 'coupons') return;
    api.get('/stores', { params: { filter: 'list' } }).then(r => setStores(Array.isArray(r.data) ? r.data : [])).catch(() => setStores([]));
  }, [config]);

  if (!config) {
    return <div className="py-20 text-center text-gray-400">Promotion module not found</div>;
  }

  const Icon = config.icon;
  const columns = [{ key: 'media', label: 'Preview' }, ...config.columns.filter(column => column.key !== 'media')];
  const formFields = config.fields.map(field => field.key === 'store' && config.type === 'coupons'
    ? { ...field, options: [...new Set(['All Stores', ...(form.store && form.store !== 'All Stores' ? [form.store] : []), ...stores.map(item => item.name).filter(Boolean)])] }
    : field).filter(field => !field.showWhen || form[field.showWhen.field] === field.showWhen.value);
  const filtered = items.filter(i =>
    Object.values(i).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
  );
  const { page, setPage, perPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [search] });

  const openAdd = () => {
    const init = {};
    config.fields.forEach(f => { init[f.key] = f.options?.[0] || ''; });
    setForm(init);
    setMediaError('');
    setModal({ mode: 'add' });
  };

  const openEdit = (item) => {
    setForm({ ...item, ...(config.type === 'coupons' ? {
      audience: item.audience || (item.targetCustomer || item.customerEmail || item.customerPhone || item.customerId ? 'Specific Customer' : 'All Customers'),
      targetCustomer: item.targetCustomer || item.customerEmail || item.customerPhone || item.customerId || '',
    } : {}) });
    setMediaError('');
    setModal({ mode: 'edit', id: item._id });
  };

  const handleSave = async () => {
    const required = config.fields.filter(f => f.required && (!f.showWhen || form[f.showWhen.field] === f.showWhen.value));
    if (required.some(f => !form[f.key]?.toString().trim())) {
      alert('Required fields fill karein');
      return;
    }
    if (config.type === 'coupons' && form.audience === 'Specific Customer' && !String(form.targetCustomer || '').trim()) {
      alert('Specific customer ke liye registered email ya phone enter karein');
      return;
    }
    const payload = config.type === 'coupons'
      ? { ...form, audience: form.audience || 'All Customers', targetCustomer: form.audience === 'Specific Customer' ? String(form.targetCustomer || '').trim() : '' }
      : form;
    try {
      setSaving(true);
      if (modal.mode === 'edit') {
        const { data } = await api.put(`/promotions/${config.type}/${modal.id}`, payload);
        setItems(prev => prev.map(i => i._id === data._id ? data : i));
      } else {
        const { data } = await api.post(`/promotions/${config.type}`, payload);
        setItems(prev => [data, ...prev]);
      }
      setModal(null);
    } catch {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleMedia = async (file) => {
    if (!file) return;
    setMediaError('');
    try {
      const isVideo = file.type.startsWith('video/');
      const media = isVideo ? await readVideoAsDataUrl(file, 6 * 1024 * 1024) : await readBannerImage(file);
      setForm(prev => ({
        ...prev,
        ...(isVideo ? { video: media } : { image: media }),
        mediaType: (isVideo ? prev.image : prev.video) ? 'mixed' : isVideo ? 'video' : 'image',
      }));
    } catch (error) {
      setMediaError(error.message || 'Media upload failed');
    }
  };

  const saveBanner = async (event) => {
    event.preventDefault();
    if (config.type === 'banners' && !form.image && !form.video) {
      setMediaError('Image ya video upload karein');
      return;
    }
    await handleSave();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete karna hai?')) return;
    await api.delete(`/promotions/${config.type}/${id}`);
    setItems(prev => prev.filter(i => i._id !== id));
  };

  const toggleStatus = async (item) => {
    const cycle = { Active: 'Inactive', Inactive: 'Active', Scheduled: 'Active', Draft: 'Scheduled', Paused: 'Active' };
    const next = cycle[item.status] || 'Active';
    const { data } = await api.put(`/promotions/${config.type}/${item._id}`, { status: next });
    setItems(prev => prev.map(i => i._id === data._id ? data : i));
  };

  if (modal) {
    return (
      <div className="-m-1 min-h-full bg-slate-50 p-5 md:p-7">
        <div className="mx-auto max-w-5xl">
          <button type="button" onClick={() => setModal(null)} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft size={17} /> Back to {config.title.toLowerCase()}</button>
          <form onSubmit={saveBanner} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5"><h1 className="text-xl font-bold text-slate-900">{modal.mode === 'edit' ? `Edit ${config.title}` : `Add ${config.title}`}</h1><p className="mt-1 text-sm text-slate-500">Add campaign details and optional media for the storefront.</p></div>
            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-4">
                {formFields.filter(field => field.key !== 'moduleSlug' || form.placement === 'Category').map(field => <label key={field.key} className="block text-sm font-semibold text-slate-700">{field.label}{(field.required || (field.key === 'moduleSlug' && form.placement === 'Category')) ? ' *' : ''}{field.key === 'moduleSlug' ? <select value={form.moduleSlug || ''} required={form.placement === 'Category'} onChange={e => setForm(prev => ({ ...prev, moduleSlug: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value="">Select module</option>{modules.map(item => <option key={item._id} value={item.slug}>{item.name}</option>)}</select> : field.type === 'select' ? <select required={field.required} value={form[field.key] || field.options?.[0] || ''} onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value, ...(field.key === 'placement' && e.target.value !== 'Category' ? { moduleSlug: '' } : {}) }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal">{field.options?.map(option => <option key={option}>{option}</option>)}</select> : field.type === 'textarea' ? <textarea required={field.required} value={form[field.key] || ''} onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))} rows={3} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal" />                 : <input required={field.required} type={field.type || 'text'} value={field.type === 'number' ? numericInputValue(form[field.key]) : form[field.key] ?? ''} placeholder={field.placeholder || ''} onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal" />}</label>)}
                {form.placement && <p className="-mt-2 text-xs leading-5 text-slate-500">{form.placement === 'Home Top' ? 'Shown in the main homepage hero area.' : form.placement === 'Home Mid' ? 'Shown between homepage product sections.' : form.placement === 'Category' ? 'Shown on the selected module/category page.' : 'Shown in the storefront promotional area.'}</p>}
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Upload size={17} /> Promotion media</div>
                  <div className="flex flex-wrap gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"><ImageIcon size={16} /> Choose image<input type="file" accept="image/*" className="hidden" onChange={e => handleMedia(e.target.files?.[0])} /></label><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"><Video size={16} /> Choose video<input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={e => handleMedia(e.target.files?.[0])} /></label></div>
                  <p className="mt-2 text-xs text-slate-500">{config.type === 'banners' ? 'Required. Choose a banner image or video. Images are optimized automatically; video limit is 6 MB.' : 'Optional. Images are optimized automatically; video limit is 6 MB.'}</p>
                </div>
                <div className="text-sm font-semibold text-slate-700">Live banner preview</div>
                {(form.image || form.video) ? <div className={`overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${form.placement === 'Home Mid' ? 'aspect-[3/1]' : form.placement === 'Home Top' ? 'aspect-[16/5]' : 'aspect-[16/7]'}`}>{form.video ? <video src={form.video} poster={form.image || undefined} controls className="h-full w-full object-cover" /> : <img src={form.image} alt="Banner preview" className="h-full w-full object-cover" />}</div> : <div className={`flex items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400 ${form.placement === 'Home Mid' ? 'aspect-[3/1]' : form.placement === 'Home Top' ? 'aspect-[16/5]' : 'aspect-[16/7]'}`}>Banner preview</div>}
                {mediaError && <p role="alert" className="text-sm font-medium text-red-600">{mediaError}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4"><button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button disabled={saving} className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save Banner'}</button></div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminListLayout
        breadcrumb={<>Dashboard &gt; Promotion Management &gt; <span className="text-gray-600">{config.breadcrumb}</span></>}
        title={config.title}
        icon={Icon}
        count={filtered.length}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => setSearch(searchInput.trim())}
        searchPlaceholder="Search..."
        page={page}
        totalPages={totalPages}
        total={total}
        perPage={perPage}
        onPageChange={setPage}
        isEmpty={paginated.length === 0}
        emptyMessage="Koi record nahi"
        footerBar={(
          <button type="button" onClick={openAdd}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${listBtnNavy}`}>
            <Plus size={16} /> Add {config.title.replace(/s$/, '')}
          </button>
        )}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className={listTheadClass} style={listTheadStyle}>
              <th className={`${listThClass} w-14`}>#</th>
              {columns.map(c => <th key={c.key} className={listThClass}>{c.label}</th>)}
              <th className={listThClass}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, i) => (
              <tr key={item._id} className={listRowClass} style={listRowStyle}>
                <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
                {columns.map(col => (
                  <td key={col.key} className={`${listTdClass} ${col.className || ''}`}>
                    {col.key === 'media' ? (
                      item.video ? <video src={item.video} className="h-12 w-24 rounded-md bg-slate-100 object-cover" muted autoPlay loop playsInline /> : item.image ? <img src={item.image} alt={`${item.title || 'Promotion'} preview`} className="h-12 w-24 rounded-md bg-slate-100 object-cover" /> : <span className="text-xs text-gray-400">No media</span>
                    ) : col.badge ? (
                      <button type="button" onClick={() => toggleStatus(item)}
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer ${STATUS_STYLES[item[col.key]] || 'bg-gray-100 text-gray-600'}`}>
                        {item[col.key]}
                      </button>
                    ) : col.render ? col.render(item[col.key], item) : (item[col.key] ?? '—')}
                  </td>
                ))}
                <td className={listTdClass} onClick={stopRow}>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openEdit(item)} className="p-1.5 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50"><Edit size={14} /></button>
                    <button type="button" onClick={() => handleDelete(item._id)} className="p-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminListLayout>

    </>
  );
}
