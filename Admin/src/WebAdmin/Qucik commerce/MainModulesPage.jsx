import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Layers, Plus, Trash2, Save, Pencil, Image as ImageIcon, X, UploadCloud } from 'lucide-react';
import api from '../../api/axios';
import NavyToggle from './components/NavyToggle';
import { LIST_CARD_BORDER as CARD_BORDER, listBtnNavy, listBtnOutline, listTheadClass, listTheadStyle, listThClass, listTdClass } from '../../constants/listTheme';

const EMPTY_FORM = { name: '', slug: '', image: '', status: true };

export default function MainModulesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const basePath = '/quick-commerce/modules';
  const [modules, setModules] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(location.pathname.endsWith('/add') || !!params.moduleId);
  const [editingId, setEditingId] = useState(params.moduleId || null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/system-modules');
      const rows = data || [];
      setModules(rows);
      return rows;
    } catch {
      setModules([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().then(rows => {
      if (!params.moduleId) return;
      const item = rows.find(row => row._id === params.moduleId);
      if (item) setForm({ name: item.name || '', slug: item.slug || '', image: item.image || '', status: item.status !== false });
    });
  }, [params.moduleId]);

  const changeImage = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(current => ({ ...current, image: reader.result }));
    reader.readAsDataURL(file);
  };
  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = item => {
    setEditingId(item._id);
    setForm({ name: item.name || '', slug: item.slug || '', image: item.image || '', status: item.status !== false });
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false); setEditingId(null); setForm(EMPTY_FORM);
    if (location.pathname !== basePath) navigate(basePath);
  };
  const submit = async event => {
    event.preventDefault();
    if (!form.name.trim()) return alert('Module name zaroori hai');
    setSaving(true);
    try {
      if (editingId) await api.put('/system-modules/' + editingId, form);
      else await api.post('/system-modules', form);
      await load();

      closeForm();
    } catch (error) {
      alert(error.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };
  const toggle = async item => {
    try {
      await api.put('/system-modules/' + item._id, { status: item.status === false });
      await load();
    } catch (error) {
      alert(error.response?.data?.message || 'Module status update failed');
    }
  };
  const remove = async item => {
    if (!confirm('Delete ' + item.name + '?')) return;
    try {
      await api.delete('/system-modules/' + item._id);
      await load();
    } catch (error) {
      alert(error.response?.data?.message || 'Module delete failed');
    }
  };

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2 text-slate-900"><Layers size={22} className="text-blue-800"/><h1 className="text-xl font-bold">Main Modules</h1></div><p className="mt-1 text-sm text-slate-500">Add and manage product modules here. This list does not change the Header dropdown.</p></div>
      {!formOpen && <button type="button" onClick={openAdd} className={'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 ' + listBtnNavy}><Plus size={16}/> Add Module</button>}
    </div>

    {formOpen && <form onSubmit={submit} className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: CARD_BORDER }}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">{editingId ? 'Edit Module' : 'Add Module'}</h2><p className="mt-0.5 text-xs text-slate-500">Set the module name and storefront image.</p></div><button type="button" onClick={closeForm} aria-label="Close form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18}/></button></div>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Module Name <span className="text-rose-500">*</span></span><input required value={form.name} onChange={e => setForm(current => ({...current,name:e.target.value}))} className={inputClass} placeholder="For example, Grocery"/></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Slug</span><input value={form.slug} onChange={e => setForm(current => ({...current,slug:e.target.value}))} className={inputClass} placeholder="Auto-generated if blank"/></label>
        <div className="md:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Module Image</span><div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">{form.image ? <img src={form.image} alt="Module preview" className="h-full w-full object-cover"/> : <ImageIcon size={23} className="text-slate-300"/>}</div>
          <div className="min-w-0 flex-1"><input value={form.image.startsWith('data:') ? '' : form.image} onChange={e => setForm(current => ({...current,image:e.target.value}))} className={inputClass} placeholder="Paste image URL"/><label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"><UploadCloud size={15}/> Upload image<input type="file" accept="image/*" onChange={changeImage} className="sr-only"/></label></div>
        </div></div>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700"><NavyToggle checked={form.status} onChange={value => setForm(current => ({...current,status:value}))}/> Active in storefront</label>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3"><button type="button" onClick={closeForm} className={'rounded-lg px-4 py-2 text-sm ' + listBtnOutline}>Cancel</button><button type="submit" disabled={saving} className={'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ' + listBtnNavy}><Save size={15}/>{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Module'}</button></div>
    </form>}

    <section className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{borderColor:CARD_BORDER}}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">Modules List</h2><p className="mt-0.5 text-xs text-slate-500">{modules.length} modules</p></div>{formOpen && <button type="button" onClick={closeForm} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Close form</button>}</div>
      <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm">
        <thead><tr className={listTheadClass} style={listTheadStyle}><th className={listThClass}>Module</th><th className={listThClass}>Image</th><th className={listThClass}>Slug</th><th className={listThClass}>Status</th><th className={listThClass + ' text-right'}>Actions</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan="5" className="px-5 py-10 text-center text-sm text-slate-400">Loading modules...</td></tr> : modules.length === 0 ? <tr><td colSpan="5" className="px-5 py-10 text-center text-sm text-slate-400">No modules yet. Add a module to get started.</td></tr> : modules.map(item => <tr key={item._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
          <td className={listTdClass + ' font-semibold text-slate-800'}>{item.name}</td><td className={listTdClass}>{item.image ? <img src={item.image} alt={item.name} className="h-11 w-11 rounded-lg border border-slate-200 object-cover"/> : <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><ImageIcon size={18}/></span>}</td><td className={listTdClass + ' font-mono text-xs text-slate-500'}>{item.slug}</td><td className={listTdClass}><NavyToggle checked={item.status !== false} onChange={() => toggle(item)}/></td>
          <td className={listTdClass}><div className="flex justify-end gap-2"><button type="button" onClick={() => openEdit(item)} title="Edit module" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 text-blue-700 transition hover:bg-blue-50"><Pencil size={15}/></button><button type="button" onClick={() => remove(item)} title="Delete module" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 text-rose-600 transition hover:bg-rose-50"><Trash2 size={15}/></button></div></td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </div>;
}