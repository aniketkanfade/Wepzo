import { useEffect, useState } from 'react';
import { Globe, Plus, Trash2, Save, Pencil, Image as ImageIcon, X, UploadCloud, ChevronLeft, ChevronRight, Film } from 'lucide-react';
import api from '../../api/axios';
import NavyToggle from '../../WebAdmin/Qucik commerce/components/NavyToggle';
import { LIST_CARD_BORDER as CARD_BORDER, listBtnNavy, listBtnOutline, listTheadClass, listTheadStyle, listThClass, listTdClass } from '../../constants/listTheme';

const EMPTY_FORM = { name: '', slug: '', images: [], image: '', videoUrl: '', description: '', status: true };

export default function WebsiteModulesPage() {
  const [modules, setModules] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingImages, setPendingImages] = useState([]);
  const [pendingVideo, setPendingVideo] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/website-modules'); setModules(Array.isArray(data) ? data : []); }
    catch { setModules([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setPendingImages([]); setPendingVideo(null); setImageIndex(0); setFormOpen(true); };
  const openEdit = item => {
    const images = Array.isArray(item.images) && item.images.length ? item.images : (item.image ? [item.image] : []);
    setEditingId(item._id); setForm({ name: item.name || '', slug: item.slug || '', images, image: item.image || images[0] || '', videoUrl: item.videoUrl || '', description: item.description || '', status: item.status !== false });
    setPendingImages([]); setPendingVideo(null); setImageIndex(0); setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditingId(null); setForm(EMPTY_FORM); setPendingImages([]); setPendingVideo(null); };
  const removeImage = index => { const images = form.images.filter((_, imagePosition) => imagePosition !== index); setForm(current => ({ ...current, images, image: images[0] || '' })); setImageIndex(position => Math.max(0, Math.min(position, images.length - 1))); };
  const addImages = event => { const files = Array.from(event.target.files || []); if (!files.length) return; setPendingImages(current => [...current, ...files]); event.target.value = ''; };
  const submit = async event => {
    event.preventDefault();
    if (!form.name.trim()) return alert('Module name zaroori hai');
    setSaving(true);
    try {
      const payload = { ...form, image: form.images[0] || '', images: form.images };
      const { data } = editingId ? await api.put('/website-modules/' + editingId, payload) : await api.post('/website-modules', payload);
      const moduleId = editingId || data._id;
      if (pendingImages.length || pendingVideo) {
        const batches = [];
        for (let index = 0; index < pendingImages.length; index += 10) batches.push(pendingImages.slice(index, index + 10));
        if (!batches.length && pendingVideo) batches.push([]);
        for (let index = 0; index < batches.length; index += 1) {
          const media = new FormData();
          batches[index].forEach(file => media.append('images', file));
          if (index === 0 && pendingVideo) media.append('video', pendingVideo);
          await api.post('/website-modules/' + moduleId + '/media', media, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
      }
      await load(); window.dispatchEvent(new Event('wepzo:website-modules-updated')); closeForm();
    } catch (error) { alert(error.response?.data?.message || error.message || 'Save failed'); }
    finally { setSaving(false); }
  };
  const toggle = async item => { try { await api.put('/website-modules/' + item._id, { status: !item.status }); await load(); window.dispatchEvent(new Event('wepzo:website-modules-updated')); } catch (error) { alert(error.response?.data?.message || 'Status update failed'); } };
  const remove = async item => { if (!confirm('Delete ' + item.name + '?')) return; try { await api.delete('/website-modules/' + item._id); await load(); window.dispatchEvent(new Event('wepzo:website-modules-updated')); } catch (error) { alert(error.response?.data?.message || 'Delete failed'); } };

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-slate-900"><Globe size={22} className="text-blue-800"/><h1 className="text-xl font-bold">Website Modules</h1></div><p className="mt-1 text-sm text-slate-500">Add module details, multiple preview images and a video file for signup.</p></div>{!formOpen && <button type="button" onClick={openAdd} className={'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 ' + listBtnNavy}><Plus size={16}/> Add Website Module</button>}</div>
    {formOpen && <form onSubmit={submit} className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: CARD_BORDER }}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">{editingId ? 'Edit Website Module' : 'Add Website Module'}</h2><p className="mt-0.5 text-xs text-slate-500">The video is uploaded as a file. Images appear as a browsable gallery.</p></div><button type="button" onClick={closeForm} aria-label="Close form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button></div>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Module Name *</span><input required value={form.name} onChange={e => setForm(c => ({...c,name:e.target.value}))} className={inputClass} placeholder="For example, Fashion"/></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Slug</span><input value={form.slug} onChange={e => setForm(c => ({...c,slug:e.target.value}))} className={inputClass} placeholder="Auto-generated if blank"/></label>
        <div className="md:col-span-2"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-slate-600">Website Preview Images</span><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><UploadCloud size={15}/> Add images<input type="file" accept="image/*" multiple onChange={addImages} className="sr-only"/></label></div>
          {form.images.length > 0 ? <div className="relative overflow-hidden rounded-xl bg-slate-900"><img src={form.images[imageIndex]} alt={`Website preview ${imageIndex + 1}`} className="h-64 w-full object-contain"/><button type="button" onClick={() => setImageIndex(i => (i + form.images.length - 1) % form.images.length)} aria-label="Previous image" className="absolute left-3 top-1/2 rounded-full bg-white/90 p-2 text-slate-800"><ChevronLeft size={18}/></button><button type="button" onClick={() => setImageIndex(i => (i + 1) % form.images.length)} aria-label="Next image" className="absolute right-3 top-1/2 rounded-full bg-white/90 p-2 text-slate-800"><ChevronRight size={18}/></button><span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">{imageIndex + 1} / {form.images.length}</span><button type="button" onClick={() => removeImage(imageIndex)} aria-label="Remove this image" className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-rose-600"><Trash2 size={16}/></button></div> : <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400"><ImageIcon size={18} className="mr-2"/>No preview images uploaded</div>}
          {!!pendingImages.length && <ul className="mt-2 space-y-1 text-xs text-slate-500">{pendingImages.map((file,index)=><li key={`${file.name}-${index}`} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2"><span>{file.name}</span><button type="button" onClick={()=>setPendingImages(items=>items.filter((_,i)=>i!==index))} className="text-rose-600">Remove</button></li>)}</ul>}
        </div>
        <div className="md:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Website Preview Video (upload video file)</span><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><Film size={16}/> Choose video file<input type="file" accept="video/*" onChange={e=>setPendingVideo(e.target.files?.[0]||null)} className="sr-only"/></label>{pendingVideo ? <p className="mt-2 text-xs text-slate-600">Selected: {pendingVideo.name}</p> : form.videoUrl ? <div className="mt-3 max-w-xl"><video controls preload="metadata" src={form.videoUrl} className="max-h-56 w-full rounded-lg bg-black"/><button type="button" onClick={()=>setForm(c=>({...c,videoUrl:''}))} className="mt-2 text-xs font-semibold text-rose-600">Remove current video</button></div> : <p className="mt-2 text-xs text-slate-400">No video file uploaded. Video files up to 50 MB.</p>}</div>
        <label className="block md:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Description</span><textarea rows="4" value={form.description} onChange={e=>setForm(c=>({...c,description:e.target.value}))} className={inputClass} placeholder="Describe this website module for signup visitors"/></label>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700"><NavyToggle checked={form.status} onChange={value=>setForm(c=>({...c,status:value}))}/> Active in Header dropdown</label>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3"><button type="button" onClick={closeForm} className={'rounded-lg px-4 py-2 text-sm ' + listBtnOutline}>Cancel</button><button type="submit" disabled={saving} className={'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ' + listBtnNavy}><Save size={15}/>{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Module'}</button></div>
    </form>}
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{borderColor:CARD_BORDER}}><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">Website Modules List</h2><p className="mt-0.5 text-xs text-slate-500">{modules.length} modules</p></div>{formOpen && <button type="button" onClick={closeForm} className="text-xs font-semibold text-slate-500">Close form</button>}</div>
      <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-sm"><thead><tr className={listTheadClass} style={listTheadStyle}><th className={listThClass}>Module</th><th className={listThClass}>Images</th><th className={listThClass}>Description</th><th className={listThClass}>Video File</th><th className={listThClass}>Slug</th><th className={listThClass}>Status</th><th className={listThClass + ' text-right'}>Actions</th></tr></thead>
      <tbody>{loading ? <tr><td colSpan="7" className="px-5 py-10 text-center text-sm text-slate-400">Loading modules...</td></tr> : modules.length === 0 ? <tr><td colSpan="7" className="px-5 py-10 text-center text-sm text-slate-400">No website modules yet.</td></tr> : modules.map(item=>{const count=Array.isArray(item.images)?item.images.length:(item.image?1:0);return <tr key={item._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"><td className={listTdClass+' font-semibold text-slate-800'}>{item.name}</td><td className={listTdClass}>{count} image{count===1?'':'s'}</td><td className={listTdClass+' max-w-xs text-xs text-slate-600'}>{item.description||'—'}</td><td className={listTdClass}>{item.videoUrl?'Uploaded':'—'}</td><td className={listTdClass+' font-mono text-xs text-slate-500'}>{item.slug}</td><td className={listTdClass}><NavyToggle checked={!!item.status} onChange={()=>toggle(item)}/></td><td className={listTdClass}><div className="flex justify-end gap-2"><button type="button" onClick={()=>openEdit(item)} title="Edit Website Module" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 text-blue-700"><Pencil size={15}/></button><button type="button" onClick={()=>remove(item)} title="Delete Website Module" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 text-rose-600"><Trash2 size={15}/></button></div></td></tr>})}</tbody></table></div>
    </section>
  </div>;
}
