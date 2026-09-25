import { useState, useEffect, useRef } from 'react';
import {
  Layers, HelpCircle, Tag, BarChart3, Upload, Camera, FolderTree,
  Edit, Trash2, Search, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../api/axios';
import { downloadFile } from '../api/download';
import Toggle from '../components/Toggle';
import { PageCard, PageCardHeader, PageCardDivider } from '../components/PageCard';
import ViewableImage from '../components/ViewableImage';
import {
  LIST_NAVY, LIST_CARD_BORDER, listBtnNavy, listBtnOutline,
  listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass,
} from '../constants/listTheme';

const tabs = ['Default', 'English (EN)', 'Hindi - हिन्दी (HI)'];
const priorities = ['Normal', 'High', 'Low'];

export default function SubCategoriesPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const fileRef = useRef(null);
  const perPage = 25;

  const [form, setForm] = useState({
    name: '', nameEn: '', nameHi: '', categoryId: '', priority: 'Normal',
    status: true, featured: false, image: ''
  });

  useEffect(() => {
    api.get('/sub-categories').then(res => setItems(res.data)).catch(() => {});
    api.get('/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.mainCategory?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const resetForm = () => {
    setForm({ name: '', nameEn: '', nameHi: '', categoryId: '', priority: 'Normal', status: true, featured: false, image: '' });
    setEditingId(null);
    setActiveTab(0);
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, image: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.categoryId) return;
    const mainCat = categories.find(c => c._id === form.categoryId);
    const payload = { ...form, mainCategory: mainCat?.name || '' };
    try {
      if (editingId) {
        const { data } = await api.put(`/sub-categories/${editingId}`, payload);
        setItems(prev => prev.map(i => i._id === editingId ? data : i));
      } else {
        const { data } = await api.post('/sub-categories', payload);
        setItems(prev => [...prev, data]);
      }
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name, nameEn: item.nameEn || '', nameHi: item.nameHi || '',
      categoryId: item.categoryId, priority: item.priority,
      status: item.status, featured: item.featured, image: item.image || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this sub category?')) return;
    await api.delete(`/sub-categories/${id}`);
    setItems(prev => prev.filter(i => i._id !== id));
  };

  const toggleField = async (id, field, value) => {
    const item = items.find(i => i._id === id);
    if (!item) return;
    const { data } = await api.put(`/sub-categories/${id}`, { ...item, [field]: value });
    setItems(prev => prev.map(i => i._id === id ? data : i));
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Dashboard &gt; Categories &gt; Sub Category &gt; <span className="text-gray-700">Add New</span>
      </p>

      <PageCard>
        <PageCardHeader
          icon={Layers}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          title="Add New Sub Category"
          description="Create a new sub category under a main category."
        />

        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex gap-1 border-b border-gray-200 mb-6">
            {tabs.map((tab, i) => (
              <button key={tab} type="button" onClick={() => setActiveTab(i)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${activeTab === i ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              {activeTab === 0 && (
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <Tag size={14} className="text-gray-400" /> Name (Default) <span className="text-red-500">*</span>
                  </label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter sub category name" required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              )}
              {activeTab === 1 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Name (English)</label>
                  <input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })}
                    placeholder="Enter English name"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              )}
              {activeTab === 2 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Name (Hindi)</label>
                  <input value={form.nameHi} onChange={e => setForm({ ...form, nameHi: e.target.value })}
                    placeholder="उप श्रेणी का नाम दर्ज करें"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              )}

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <FolderTree size={14} className="text-gray-400" /> Main Category <span className="text-red-500">*</span>
                </label>
                <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                  <option value="">Select Main Category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <BarChart3 size={14} className="text-gray-400" /> Priority
                </label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none">
                  {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between py-2">
                <div><p className="text-sm font-medium text-gray-700">Status</p><p className="text-xs text-gray-400">{form.status ? 'Active' : 'Inactive'}</p></div>
                <Toggle checked={form.status} onChange={v => setForm({ ...form, status: v })} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div><p className="text-sm font-medium text-gray-700">Featured</p><p className="text-xs text-gray-400">Set as featured sub category</p></div>
                <Toggle checked={form.featured} onChange={v => setForm({ ...form, featured: v })} />
              </div>
            </div>

            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary-300 min-h-[220px]">
                {form.image ? (
                  <ViewableImage src={form.image} alt="Preview" title="Sub Category Image" className="w-32 h-32 object-cover rounded-xl" />
                ) : (
                  <>
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3"><Upload size={24} className="text-gray-400" /></div>
                    <p className="font-medium text-gray-700 text-sm">Upload Sub Category Image</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP (Max 2MB) · 500 x 500</p>
                    <button type="button" className="mt-4 flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">
                      <Camera size={16} /> Choose Image
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
            <button type="button" onClick={resetForm} className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Reset</button>
            <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
              {editingId ? 'Update Sub Category' : 'Add Sub Category'}
            </button>
          </div>
        </form>

        <PageCardDivider />

        <ListTable
        embedded
        title="Sub Category List" count={items.length} search={search} setSearch={setSearch} setPage={setPage}
        paginated={paginated} page={page} perPage={perPage} filtered={filtered} totalPages={totalPages}
        columns={['mainCategory', 'subCategory']}
        idKey="subCategoryId"
        onEdit={handleEdit} onDelete={handleDelete} onToggle={toggleField}
        onExport={() => downloadFile('/bulk/sub-categories/export', `sub-categories_${new Date().toISOString().slice(0, 10)}.csv`)}
        searchPlaceholder="Search sub categories..."
      />
      </PageCard>
    </div>
  );
}

function ListTable({ title, count, search, setSearch, setPage, paginated, page, perPage, filtered, totalPages, columns, idKey, onEdit, onDelete, onToggle, onExport, searchPlaceholder, embedded = false }) {
  const priorities = ['Normal', 'High', 'Low'];

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  const outerClass = embedded ? 'flex flex-col min-h-0' : 'flex flex-col max-h-[calc(100vh-7rem)] rounded-xl border shadow-sm overflow-hidden bg-white';
  return (
    <div className={outerClass} style={embedded ? undefined : { borderColor: LIST_CARD_BORDER }}>
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b bg-white" style={{ borderColor: LIST_CARD_BORDER }}>
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-bold tracking-tight" style={{ color: LIST_NAVY }}>{title}</h2>
          <span className="text-sm font-medium px-3 py-0.5 rounded-full min-w-[2rem] text-center tabular-nums" style={{ backgroundColor: '#eef2f8', color: LIST_NAVY }}>
            {filtered?.length ?? count}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={searchPlaceholder}
              className="pl-8 pr-3 py-2.5 border rounded-lg text-sm w-52 outline-none bg-white" style={{ borderColor: '#e0e4ec' }} />
          </div>
          <button type="button" onClick={onExport} className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${listBtnOutline}`}>
            Export <ChevronDown size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto dropdown-scroll">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className={listTheadClass} style={listTheadStyle}>
              <th className={`${listThClass} w-12`}>#</th>
              <th className={listThClass}>ID</th>
              <th className={listThClass}>Image</th>
              {columns.includes('mainCategory') && <th className={listThClass}>Main Category</th>}
              {columns.includes('subCategory') && <th className={listThClass}>Sub Category</th>}
              {columns.includes('childCategory') && <th className={listThClass}>Child Category</th>}
              <th className={listThClass}>Status</th>
              <th className={listThClass}>Featured</th>
              <th className={listThClass}>Priority</th>
              <th className={listThClass}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, i) => (
              <tr key={item._id} className={listRowClass} style={listRowStyle}>
                <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
                <td className={`${listTdClass} text-gray-600 font-medium`}>{item[idKey] ?? (page - 1) * perPage + i + 1}</td>
                <td className={listTdClass}>
                  <ViewableImage src={item.image || 'https://via.placeholder.com/40'} title={item.name} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                </td>
                {columns.includes('mainCategory') && <td className={`${listTdClass} text-gray-700`}>{item.mainCategory}</td>}
                {columns.includes('subCategory') && <td className={`${listTdClass} font-medium text-gray-800`}>{columns.includes('childCategory') ? item.subCategory : item.name}</td>}
                {columns.includes('childCategory') && <td className={`${listTdClass} font-medium text-gray-800`}>{item.name}</td>}
                <td className={listTdClass}><Toggle checked={item.status} onChange={v => onToggle(item._id, 'status', v)} /></td>
                <td className={listTdClass}><Toggle checked={item.featured} onChange={v => onToggle(item._id, 'featured', v)} /></td>
                <td className={listTdClass}>
                  <select value={item.priority} onChange={e => onToggle(item._id, 'priority', e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded text-xs bg-white">
                    {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>
                <td className={listTdClass}>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => onEdit(item)} className="p-1.5 text-[#1a3a8a] hover:bg-[#eef2f8] rounded-lg"><Edit size={16} /></button>
                    <button type="button" onClick={() => onDelete(item._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t bg-white"
          style={{ borderColor: LIST_CARD_BORDER }}>
        <p className="text-sm text-gray-500">
          Showing {filtered.length ? (page - 1) * perPage + 1 : 0} to {Math.min(page * perPage, filtered.length)} of {filtered.length} entries
        </p>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className={`p-2 rounded-lg disabled:opacity-40 transition ${listBtnOutline}`}><ChevronLeft size={16} /></button>
          {pages.map((p, i) => typeof p === 'string' ? (
            <span key={`gap-${i}`} className="w-8 text-center text-gray-400 text-sm">…</span>
          ) : (
            <button key={p} type="button" onClick={() => setPage(p)}
              className={`min-w-9 h-9 px-1 rounded-lg text-sm font-medium transition ${page === p ? listBtnNavy : listBtnOutline}`}>{p}</button>
          ))}
          <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className={`p-2 rounded-lg disabled:opacity-40 transition ${listBtnOutline}`}><ChevronRight size={16} /></button>
        </div>
        </div>
      </div>
    </div>
  );
}

export { ListTable };
