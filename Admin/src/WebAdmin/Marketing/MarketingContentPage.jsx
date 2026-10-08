import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Filter, Lock, Pencil, Plus, Search, Send, Trash2, X } from 'lucide-react';
import api from '../../api/axios';

const emptyForm = {
  title: '', assignedUserId: '', contentType: 'Post', platform: 'Instagram', platforms: ['Instagram'], caption: '', hashtags: '',
  releaseDate: '', releaseTime: '', publishDate: '', publishTime: '', status: 'AVAILABLE', autoPublish: false, allowUserEditing: true,
};
const prettyStatus = value => String(value || 'AVAILABLE').replaceAll('_', ' ');
const EMPTY_FILTERS = { userId: '', platform: '', contentType: '', status: '', dateField: 'publishDate', dateFrom: '', dateTo: '' };
const FILTER_STORAGE_KEY = 'wepzo-marketing-content-filters';
const hasContentFilters = filters => Boolean(filters.userId || filters.platform || filters.contentType || filters.status || filters.dateFrom || filters.dateTo);

function SearchableUserSelect({ users, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const selectedUser = users.find(user => String(user.id) === String(value));
  const matches = users.filter(user => `${user.name || ''} ${user.email || ''}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = event => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, [open]);

  return <div ref={rootRef} className="relative w-full">
    <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
      <span className={`min-w-0 truncate ${selectedUser ? '' : 'text-slate-400'}`}>{selectedUser ? `${selectedUser.name} · ${selectedUser.email}` : placeholder}</span><ChevronDown size={16} className="shrink-0 text-slate-500"/>
    </button>
    {open && <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-100 p-2"><input autoFocus type="search" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }} placeholder="Search by name or email" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"/></div>
      <div role="listbox" className="max-h-56 overflow-y-auto py-1">{!value && <button type="button" role="option" aria-selected={!value} onClick={() => { onChange(''); setOpen(false); setQuery(''); }} className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50">{placeholder}</button>}{matches.map(user => <button type="button" role="option" aria-selected={String(user.id) === String(value)} key={user.id} onClick={() => { onChange(user.id); setOpen(false); setQuery(''); }} className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${String(user.id) === String(value) ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-700'}`}><span className="block truncate">{user.name}</span><span className="block truncate text-xs text-slate-500">{user.email}</span></button>)}{!matches.length && <p className="px-3 py-4 text-center text-xs text-slate-500">No users match this search.</p>}</div>
    </div>}
  </div>;
}

function readSavedFilters() {
  try {
    const saved = JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY) || 'null');
    return saved?.locked ? { ...saved, filters: { ...EMPTY_FILTERS, ...(saved.filters || {}) } } : null;
  } catch { return null; }
}

export default function MarketingContentPage() {
  const [savedFilters] = useState(readSavedFilters);
  const [users, setUsers] = useState([]);
  const [content, setContent] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [mediaFile, setMediaFile] = useState(null);
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState(savedFilters?.search || '');
  const [appliedFilters, setAppliedFilters] = useState(savedFilters?.filters || EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState(savedFilters?.filters || EMPTY_FILTERS);
  const [filtersLocked, setFiltersLocked] = useState(Boolean(savedFilters));
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const filteredContent = useMemo(() => content.filter(item => {
    const platforms = Array.isArray(item.platforms) && item.platforms.length ? item.platforms : [item.platform];
    const userName = item.assignedUserName || users.find(user => String(user.id) === String(item.assignedUserId))?.name || '';
    const searchable = `${item.title} ${item.caption} ${item.hashtags} ${userName} ${platforms.join(' ')} ${item.contentType} ${item.status}`.toLowerCase();
    if (searchText.trim() && !searchable.includes(searchText.trim().toLowerCase())) return false;
    if (appliedFilters.userId && String(item.assignedUserId) !== String(appliedFilters.userId)) return false;
    if (appliedFilters.platform && !platforms.includes(appliedFilters.platform)) return false;
    if (appliedFilters.contentType && item.contentType !== appliedFilters.contentType) return false;
    if (appliedFilters.status && item.status !== appliedFilters.status) return false;
    if (appliedFilters.dateFrom || appliedFilters.dateTo) {
      const date = String(item[appliedFilters.dateField] || '').slice(0, 10);
      if (!date || (appliedFilters.dateFrom && date < appliedFilters.dateFrom) || (appliedFilters.dateTo && date > appliedFilters.dateTo)) return false;
    }
    return true;
  }), [content, users, searchText, appliedFilters]);
  const totalPages = Math.max(1, Math.ceil(filteredContent.length / 10));
  const visibleContent = filteredContent.slice((page - 1) * 10, page * 10);

  useEffect(() => { setPage(1); }, [searchText, appliedFilters]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  useEffect(() => {
    if (!filterOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [filterOpen]);

  const updateSearch = value => {
    setSearchText(value);
    const locked = Boolean(value.trim() || hasContentFilters(appliedFilters));
    setFiltersLocked(locked);
    if (locked) localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ locked: true, search: value, filters: appliedFilters }));
    else localStorage.removeItem(FILTER_STORAGE_KEY);
  };

  const applyContentFilters = () => {
    setAppliedFilters(draftFilters);
    const locked = Boolean(searchText.trim() || hasContentFilters(draftFilters));
    setFiltersLocked(locked);
    if (locked) localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ locked: true, search: searchText, filters: draftFilters }));
    else localStorage.removeItem(FILTER_STORAGE_KEY);
    setFilterOpen(false);
  };

  const resetContentFilters = () => {
    setSearchText(''); setAppliedFilters(EMPTY_FILTERS); setDraftFilters(EMPTY_FILTERS);
    setFiltersLocked(false); setPage(1); localStorage.removeItem(FILTER_STORAGE_KEY);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [userResponse, contentResponse] = await Promise.all([
        api.get('/marketing/users'), api.get('/marketing/content'),
      ]);
      setUsers(Array.isArray(userResponse.data) ? userResponse.data : []);
      setContent(Array.isArray(contentResponse.data) ? contentResponse.data : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Marketing data could not be loaded. Check the selected Marketing module and admin login.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveContent = async event => {
    event.preventDefault();
    if (saving) return;
    if (!form.assignedUserId) { setError('Select a Marketing user before saving content.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      let contentForm = form;
      if (mediaFile) {
        const mediaBody = new FormData();
        mediaBody.append('media', mediaFile);
        const { data: media } = await api.post('/marketing/media', mediaBody, { headers: { 'Content-Type': 'multipart/form-data' } });
        contentForm = { ...form, mediaUrl: media.mediaUrl, mediaType: media.mediaType, mediaMimeType: media.mimeType || mediaFile.type };
      }
      const { data } = editingId
        ? await api.put(`/marketing/content/${editingId}`, contentForm)
        : await api.post('/marketing/content', contentForm);
      setContent(current => editingId ? current.map(item => String(item._id) === String(data._id) ? data : item) : [data, ...current]);
      setNotice(editingId ? 'Content assignment updated.' : 'Content assigned to the user.');
      setForm(emptyForm); setMediaFile(null); setEditingId('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Content could not be saved.');
    } finally { setSaving(false); }
  };

  const editContent = item => {
    setEditingId(item._id);
    setMediaFile(null);
    const platforms = Array.isArray(item.platforms) && item.platforms.length ? item.platforms : [item.platform || 'Instagram'];
    setForm({ ...emptyForm, ...item, platforms, platform: platforms[0], assignedUserId: item.assignedUserId || '' });
    setNotice(''); setError('');
    document.getElementById('marketing-content-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const deleteContent = async item => {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    try {
      await api.delete(`/marketing/content/${item._id}`);
      setContent(current => current.filter(entry => entry._id !== item._id));
      setNotice('Content deleted.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Content could not be deleted.');
    }
  };

  return <section className="mx-auto max-w-6xl space-y-5 pb-10">
    <header><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Admin / Web / Marketing</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Content Add</h1><p className="mt-2 text-sm text-slate-600">Create and manage day-wise posts and reels for Marketing users.</p></header>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
    <article id="marketing-content-form" className="scroll-mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-900">{editingId ? 'Edit assigned content' : 'Assign day-wise content'}</h2><p className="mt-1 text-xs text-slate-500">Choose a Marketing account. The user will see this item in their workspace after its release date.</p></div>{editingId && <button type="button" onClick={() => { setEditingId(''); setForm(emptyForm); setMediaFile(null); }} className="text-xs font-medium text-slate-500 hover:text-slate-800">Cancel edit</button>}</div>
      {users.length === 0 && !loading ? <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">No Marketing users yet. A user must create an account with the Marketing module selected before content can be assigned.</p> : <form onSubmit={saveContent} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-1.5 text-xs font-medium text-slate-700">Content title<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" placeholder="Day 1 — Introduce your brand"/></label>
        <label className="grid gap-1.5 text-xs font-medium text-slate-700">Assign to user<div className="mt-1"><SearchableUserSelect users={users} value={form.assignedUserId} onChange={assignedUserId => setForm(current => ({ ...current, assignedUserId }))} placeholder="Select a Marketing user"/></div></label>
        <fieldset className="grid gap-2 text-xs font-medium text-slate-700 sm:col-span-2 lg:col-span-3"><legend>Publish on <span className="font-normal text-slate-500">(select one or more platforms)</span></legend><div className="flex flex-wrap gap-3">{['Instagram','Facebook','YouTube','LinkedIn'].map(value=><label key={value} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 font-normal"><input type="checkbox" checked={(form.platforms || [form.platform]).includes(value)} onChange={event=>{const previous=form.platforms || [form.platform];const selected=event.target.checked?[...previous,value]:previous.filter(entry=>entry!==value);if(!selected.length)return;setForm({...form,platforms:selected,platform:selected[0]})}}/>{value}</label>)}</div><span className="font-normal text-slate-500">Each selected platform needs its own connected account. The media type must be supported by every selected platform.</span></fieldset>
        <label className="grid gap-1.5 text-xs font-medium text-slate-700">Content type<select value={form.contentType} onChange={e => setForm({ ...form, contentType: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal"><option>Post</option><option>Reel</option></select></label>
        <label className="grid gap-1.5 text-xs font-medium text-slate-700 sm:col-span-2 lg:col-span-3">Post media<input type="file" accept="image/*,video/mp4,video/quicktime,video/webm" onChange={e => setMediaFile(e.target.files?.[0] || null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal"/><span className="font-normal text-slate-500">Instagram Posts need an image. Reels and YouTube uploads need a video. Maximum upload size: 150 MB.</span>{form.mediaUrl && !mediaFile && <span className="font-normal text-emerald-700">Media attached to this assignment. Choose a new file to replace it.</span>}</label>
        <label className="grid gap-1.5 text-xs font-medium text-slate-700">Release date<input type="date" value={form.releaseDate} onChange={e => setForm({ ...form, releaseDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"/></label>
        <label className="grid gap-1.5 text-xs font-medium text-slate-700">Release time<input type="time" value={form.releaseTime} onChange={e => setForm({ ...form, releaseTime: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"/></label>
        <label className="grid gap-1.5 text-xs font-medium text-slate-700">Suggested publish date<input type="date" value={form.publishDate} onChange={e => setForm({ ...form, publishDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"/></label>
        <label className="grid gap-1.5 text-xs font-medium text-slate-700">Suggested publish time<input type="time" value={form.publishTime} onChange={e => setForm({ ...form, publishTime: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"/></label>
        <label className="grid gap-1.5 text-xs font-medium text-slate-700 sm:col-span-2 lg:col-span-3">Caption<textarea rows={3} value={form.caption} onChange={e => setForm({ ...form, caption: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" placeholder="Write the post copy…"/></label>
        <label className="grid gap-1.5 text-xs font-medium text-slate-700 sm:col-span-2 lg:col-span-3">Hashtags<input value={form.hashtags} onChange={e => setForm({ ...form, hashtags: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" placeholder="#yourbrand #smallbusiness"/></label>
        <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={form.allowUserEditing} onChange={e => setForm({ ...form, allowUserEditing: e.target.checked })}/> Allow user to edit caption</label>
        <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={form.autoPublish} onChange={e => setForm({ ...form, autoPublish: e.target.checked })}/> Mark for auto-publish</label>
        <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={form.status === 'LOCKED'} onChange={e => setForm({ ...form, status: e.target.checked ? 'LOCKED' : 'AVAILABLE' })}/> Keep locked until release</label>
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3"><button disabled={loading || saving} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{editingId ? <Pencil size={15}/> : <Plus size={16}/>} {saving ? 'Saving…' : editingId ? 'Save content' : 'Assign content'} <Send size={14}/></button><span className="text-xs text-slate-400">Auto-publish requires a connected platform account and publishing service.</span></div>
      </form>}
    </article>

    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Content assignments</h2><p className="mt-1 text-xs text-slate-500">Content managed in Admin / Web / Marketing and delivered to individual user accounts.</p></div>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2"><Search size={16} className="text-slate-400"/><input value={searchText} onChange={event=>updateSearch(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')event.preventDefault()}} placeholder="Search title, user, platform…" className="w-full border-0 bg-transparent text-sm outline-none"/></div>
        <button type="button" onClick={()=>{setDraftFilters(appliedFilters);setFilterOpen(true)}} className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${filtersLocked?'border-blue-200 bg-blue-50 text-blue-700':'border-slate-300 bg-white text-slate-700'}`}><Filter size={15}/>{filtersLocked&&<Lock size={13}/>} Filter</button>
        <span className="text-xs text-slate-500">{filteredContent.length} of {content.length} items</span>
      </div>
      {filtersLocked&&<div className="flex items-center gap-2 border-b border-slate-100 bg-blue-50/60 px-5 py-2 text-xs text-blue-800"><Lock size={13}/> Filters saved until reset<button type="button" onClick={resetContentFilters} className="ml-auto font-semibold underline">Reset filters</button></div>}
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr>{['Content','User','Platform','Type','Release','Publish time','Status','Actions'].map(heading=><th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody>{visibleContent.map(item=><tr key={item._id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold text-slate-800">{item.title}<span className="mt-1 block max-w-52 truncate font-normal text-slate-400">{item.caption}</span></td><td className="px-4 py-3">{item.assignedUserName || users.find(user=>String(user.id)===String(item.assignedUserId))?.name || '—'}</td><td className="px-4 py-3">{(item.platforms?.length ? item.platforms : [item.platform]).join(', ')}</td><td className="px-4 py-3">{item.contentType}</td><td className="px-4 py-3">{item.releaseDate || 'Immediately'} {item.releaseTime}</td><td className="px-4 py-3">{item.publishDate || '—'} {item.publishTime}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{prettyStatus(item.status)}</span></td><td className="px-4 py-3"><div className="flex gap-1"><button type="button" onClick={()=>editContent(item)} aria-label="Edit content" className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"><Pencil size={13}/></button><button type="button" onClick={()=>deleteContent(item)} aria-label="Delete content" className="rounded-md border border-red-100 p-1.5 text-red-600 hover:bg-red-50"><Trash2 size={13}/></button></div></td></tr>)}{!loading&&filteredContent.length===0&&<tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No content matches these search filters.</td></tr>}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-600"><span>Page {page} of {totalPages}</span><div className="flex items-center gap-2"><button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-40"><ChevronLeft size={14}/>Previous</button><button type="button" disabled={page>=totalPages} onClick={()=>setPage(value=>Math.min(totalPages,value+1))} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-40">Next<ChevronRight size={14}/></button></div></div>
    </article>
    {filterOpen&&<div className="fixed inset-0 z-50 flex justify-end"><button type="button" className="absolute inset-0 bg-black/30" onClick={()=>setFilterOpen(false)} aria-label="Close filter"/><aside className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="text-base font-bold text-slate-900">Search data</h2><button type="button" onClick={()=>setFilterOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18}/></button></div><div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
      <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer / Marketing user</span><SearchableUserSelect users={users} value={draftFilters.userId} onChange={userId => setDraftFilters(current => ({ ...current, userId }))} placeholder="All users"/></label>
      <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Platform</span><select value={draftFilters.platform} onChange={event=>setDraftFilters(current=>({...current,platform:event.target.value}))} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><option value="">All platforms</option>{['Instagram','Facebook','YouTube','LinkedIn'].map(value=><option key={value}>{value}</option>)}</select></label>
      <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Content type</span><select value={draftFilters.contentType} onChange={event=>setDraftFilters(current=>({...current,contentType:event.target.value}))} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><option value="">Post & Reel</option><option>Post</option><option>Reel</option></select></label>
      <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span><select value={draftFilters.status} onChange={event=>setDraftFilters(current=>({...current,status:event.target.value}))} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><option value="">All statuses</option>{['AVAILABLE','LOCKED','SCHEDULED','PROCESSING','PUBLISHED','FAILED','CANCELLED'].map(value=><option key={value} value={value}>{prettyStatus(value)}</option>)}</select></label>
      <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Date to search</span><select value={draftFilters.dateField} onChange={event=>setDraftFilters(current=>({...current,dateField:event.target.value}))} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><option value="publishDate">Publish date</option><option value="releaseDate">Release date</option></select></label>
      <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">From date</span><input type="date" value={draftFilters.dateFrom} onChange={event=>setDraftFilters(current=>({...current,dateFrom:event.target.value}))} className="w-full rounded-lg border border-slate-300 px-2.5 py-2.5 text-sm"/></label><label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">To date</span><input type="date" value={draftFilters.dateTo} onChange={event=>setDraftFilters(current=>({...current,dateTo:event.target.value}))} className="w-full rounded-lg border border-slate-300 px-2.5 py-2.5 text-sm"/></label></div>
      </div><div className="flex gap-3 border-t border-slate-100 bg-white px-5 py-4"><button type="button" onClick={resetContentFilters} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Reset</button><button type="button" onClick={applyContentFilters} className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Filter</button></div></aside></div>}
  </section>;
}
