import { useState, useEffect, useRef } from 'react';
import {
  LayoutGrid, HelpCircle, Tag, BarChart3, Upload, Camera, Layers,
  Edit, Trash2, Search, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../../api/axios';
import { Link } from 'react-router-dom';
import { downloadFile } from '../../api/download';
import { PageCard, PageCardHeader } from './components/PageCard';
import ViewableImage from './components/ViewableImage';
import {
  LIST_NAVY, LIST_CARD_BORDER, listBtnNavy, listBtnOutline,
  listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass,
} from '../../constants/listTheme';

const tabs = ['Default', 'English (EN)', 'Hindi - हिन्दी (HI)'];
const priorities = ['Normal', 'High', 'Low'];

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition ${checked ? 'bg-primary-600' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition ${checked ? 'translate-x-5' : ''}`} />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [modules, setModules] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const fileRef = useRef(null);
  const formCardRef = useRef(null);

  const [form, setForm] = useState({
    name: '', nameEn: '', nameHi: '', priority: 'Normal', moduleId: '',
    status: true, featured: false, image: ''
  });

  const perPage = 25;

  useEffect(() => {
    loadCategories();
    api.get('/system-modules').then(res => setModules((res.data || []).filter(m => m.status !== false))).catch(() => setModules([]));
  }, []);

  const loadCategories = () => {
    api.get('/categories').then(res => setCategories(res.data)).catch(() => {});
  };

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const resetForm = () => {
    setForm({ name: '', nameEn: '', nameHi: '', priority: 'Normal', moduleId: '', status: true, featured: false, image: '' });
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
    if (!form.name.trim()) return;
    try {
      if (editingId) {
        const { data } = await api.put(`/categories/${editingId}`, form);
        setCategories(prev => prev.map(c => c._id === editingId ? data : c));
      } else {
        const { data } = await api.post('/categories', form);
        setCategories(prev => [...prev, data]);
      }
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (cat) => {
    setEditingId(cat._id);
    setForm({
      name: cat.name, nameEn: cat.nameEn || '', nameHi: cat.nameHi || '',
      priority: cat.priority, moduleId: cat.moduleId || '', status: cat.status, featured: cat.featured, image: cat.image || ''
    });
    requestAnimationFrame(() => formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return;
    await api.delete(`/categories/${id}`);
    setCategories(prev => prev.filter(c => c._id !== id));
  };

  const toggleField = async (id, field, value) => {
    const cat = categories.find(c => c._id === id);
    if (!cat) return;
    const updated = { ...cat, [field]: value };
    const { data } = await api.put(`/categories/${id}`, updated);
    setCategories(prev => prev.map(c => c._id === id ? data : c));
  };

  return (
    <div className="space-y-6">
<PageCard className="rounded-xl">
        <PageCardHeader
          icon={LayoutGrid}
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          title="Add New Category"
          description="Create a new category to organize your products."
        />

        <form ref={formCardRef} onSubmit={handleSubmit} className="p-6 scroll-mt-4">
          {/* Language Tabs */}
          <div className="flex gap-1 border-b border-gray-200 mb-6">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                  activeTab === i
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Form Fields */}
            <div className="space-y-5">
              {activeTab === 0 && (
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <Tag size={14} className="text-gray-400" /> Name (Default) <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter category name"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    required
                  />
                </div>
              )}
              {activeTab === 1 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Name (English)</label>
                  <input
                    value={form.nameEn}
                    onChange={e => setForm({ ...form, nameEn: e.target.value })}
                    placeholder="Enter English name"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              )}
              {activeTab === 2 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Name (Hindi)</label>
                  <input
                    value={form.nameHi}
                    onChange={e => setForm({ ...form, nameHi: e.target.value })}
                    placeholder="श्रेणी का नाम दर्ज करें"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <BarChart3 size={14} className="text-gray-400" /> Priority
                </label>
                <select
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                >
                  {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700"><Layers size={14} className="text-gray-400" /> Main Module <span className="text-red-500">*</span></label>
                  <Link to="/quick-commerce/modules/add" className="text-xs font-semibold text-blue-700 hover:underline">+ Add main module</Link>
                </div>
                <select required value={form.moduleId} onChange={e => setForm({ ...form, moduleId: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                  <option value="">Select a module</option>
                  {modules.map(module => <option key={module._id} value={module._id}>{module.name}</option>)}
                </select>
                {modules.length === 0 && <p className="mt-1 text-xs text-amber-600">Add an active module first.</p>}
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">Status</p>
                  <p className="text-xs text-gray-400">{form.status ? 'Active' : 'Inactive'}</p>
                </div>
                <Toggle checked={form.status} onChange={v => setForm({ ...form, status: v })} />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">Featured</p>
                  <p className="text-xs text-gray-400">Set as featured category</p>
                </div>
                <Toggle checked={form.featured} onChange={v => setForm({ ...form, featured: v })} />
              </div>
            </div>

            {/* Right: Image Upload */}
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition min-h-[220px]"
              >
                {form.image ? (
                  <ViewableImage src={form.image} alt="Preview" title="Category Image" className="w-32 h-32 object-cover rounded-xl" />
                ) : (
                  <>
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <Upload size={24} className="text-gray-400" />
                    </div>
                    <p className="font-medium text-gray-700 text-sm">Upload Category Image</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP (Max 2MB)</p>
                    <p className="text-xs text-gray-400">Recommended size: 500 x 500</p>
                    <button type="button" className="mt-4 flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                      <Camera size={16} /> Choose Image
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
            <button type="button" onClick={resetForm} className={`px-6 py-2.5 rounded-lg text-sm font-medium transition ${listBtnOutline}`}>
              Reset
            </button>
            <button type="submit" className={`px-6 py-2.5 rounded-lg text-sm font-medium transition ${listBtnNavy}`}>
              {editingId ? 'Update Category' : 'Add Category'}
            </button>
          </div>
        </form>
      </PageCard>

      <PageCard className="rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b" style={{ borderColor: LIST_CARD_BORDER }}>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold tracking-tight" style={{ color: LIST_NAVY }}>Category List</h2>
            <span className="text-sm font-medium px-3 py-0.5 rounded-full min-w-[2rem] text-center tabular-nums" style={{ backgroundColor: '#eef2f8', color: LIST_NAVY }}>{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search categories..."
                className="pl-8 pr-3 py-2.5 border rounded-lg text-sm w-48 outline-none bg-white"
                style={{ borderColor: '#e0e4ec' }}
              />
            </div>
            <button type="button"
              onClick={() => downloadFile('/bulk/categories/export', `categories_${new Date().toISOString().slice(0, 10)}.csv`)}
              className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${listBtnOutline}`}
            >
              Export <ChevronDown size={14} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={listTheadClass} style={listTheadStyle}>
                <th className={`${listThClass} w-12`}>#</th>
                <th className={listThClass}>ID</th>
                <th className={listThClass}>Image</th>
                <th className={listThClass}>Name</th>
                <th className={listThClass}>Module</th>
                <th className={listThClass}>Status</th>
                <th className={listThClass}>Featured</th>
                <th className={listThClass}>Priority</th>
                <th className={listThClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((cat, i) => (
                <tr key={cat._id} className={listRowClass} style={listRowStyle}>
                  <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
                  <td className={`${listTdClass} text-gray-600`}>{cat.categoryId}</td>
                  <td className={listTdClass}>
                    <ViewableImage
                      src={cat.image || 'https://via.placeholder.com/40'}
                      title={cat.name}
                      alt={cat.name}
                      className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                    />
                  </td>
                  <td className={`${listTdClass} font-medium text-gray-800`}>{cat.name}</td>
                  <td className={listTdClass}>{modules.find(module => module._id === cat.moduleId)?.name || <span className="text-gray-400">-</span>}</td>
                  <td className={listTdClass}>
                    <Toggle checked={cat.status} onChange={v => toggleField(cat._id, 'status', v)} />
                  </td>
                  <td className={listTdClass}>
                    <Toggle checked={cat.featured} onChange={v => toggleField(cat._id, 'featured', v)} />
                  </td>
                  <td className={listTdClass}>
                    <select
                      value={cat.priority}
                      onChange={e => toggleField(cat._id, 'priority', e.target.value)}
                      className="px-2 py-1 border border-gray-200 rounded text-xs bg-white"
                    >
                      {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className={listTdClass}>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => handleEdit(cat)} className="p-1.5 text-[#1a3a8a] hover:bg-[#eef2f8] rounded-lg">
                        <Edit size={16} />
                      </button>
                      <button type="button" onClick={() => handleDelete(cat._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-20 text-center text-gray-400">No categories found</td></tr>
              )}
            </tbody>
          </table>

          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t bg-white"
            style={{ borderColor: LIST_CARD_BORDER }}>
          <p className="text-sm text-gray-500">
            Showing {filtered.length ? (page - 1) * perPage + 1 : 0} to {Math.min(page * perPage, filtered.length)} of {filtered.length} entries
          </p>
          <div className="flex items-center gap-1.5">
            <button type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`p-2 rounded-lg disabled:opacity-40 transition ${listBtnOutline}`}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => typeof p === 'string' ? (
                <span key={`gap-${i}`} className="w-8 text-center text-gray-400 text-sm">…</span>
              ) : (
                <button key={p} type="button" onClick={() => setPage(p)}
                  className={`min-w-9 h-9 px-1 rounded-lg text-sm font-medium transition ${page === p ? listBtnNavy : listBtnOutline}`}>
                  {p}
                </button>
              ))}
            <button type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`p-2 rounded-lg disabled:opacity-40 transition ${listBtnOutline}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          </div>
        </div>
      </PageCard>
    </div>
  );
}
