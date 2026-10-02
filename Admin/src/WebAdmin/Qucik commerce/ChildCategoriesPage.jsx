import { useState, useEffect, useRef } from 'react';
import {
  GitBranch, HelpCircle, Tag, BarChart3, Upload, Camera, FolderTree, Layers,
  Edit, Trash2, Search, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../../api/axios';
import { downloadFile } from '../../api/download';
import Toggle from './components/Toggle';
import { ListTable } from './SubCategoriesPage';
import { PageCard, PageCardHeader } from './components/PageCard';
import ViewableImage from './components/ViewableImage';

const priorities = ['Normal', 'High', 'Low'];

export default function ChildCategoriesPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const fileRef = useRef(null);
  const perPage = 25;

  const [form, setForm] = useState({
    name: '', nameEn: '', nameHi: '', categoryId: '', subCategoryId: '',
    priority: 'Normal', status: true, featured: false, image: ''
  });

  useEffect(() => {
    api.get('/child-categories').then(res => setItems(res.data)).catch(() => {});
    api.get('/categories').then(res => setCategories(res.data)).catch(() => {});
    api.get('/sub-categories').then(res => setSubCategories(res.data)).catch(() => {});
  }, []);

  const filteredSubs = subCategories.filter(s => !form.categoryId || s.categoryId === form.categoryId);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.subCategory?.toLowerCase().includes(search.toLowerCase()) ||
    i.mainCategory?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const resetForm = () => {
    setForm({ name: '', nameEn: '', nameHi: '', categoryId: '', subCategoryId: '', priority: 'Normal', status: true, featured: false, image: '' });
    setEditingId(null);
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
    if (!form.name.trim() || !form.categoryId || !form.subCategoryId) return;
    const mainCat = categories.find(c => c._id === form.categoryId);
    const subCat = subCategories.find(s => s._id === form.subCategoryId);
    const payload = {
      ...form,
      mainCategory: mainCat?.name || '',
      subCategory: subCat?.name || ''
    };
    try {
      if (editingId) {
        const { data } = await api.put(`/child-categories/${editingId}`, payload);
        setItems(prev => prev.map(i => i._id === editingId ? data : i));
      } else {
        const { data } = await api.post('/child-categories', payload);
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
      categoryId: item.categoryId, subCategoryId: item.subCategoryId,
      priority: item.priority, status: item.status, featured: item.featured, image: item.image || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this child category?')) return;
    await api.delete(`/child-categories/${id}`);
    setItems(prev => prev.filter(i => i._id !== id));
  };

  const toggleField = async (id, field, value) => {
    const item = items.find(i => i._id === id);
    if (!item) return;
    const { data } = await api.put(`/child-categories/${id}`, { ...item, [field]: value });
    setItems(prev => prev.map(i => i._id === id ? data : i));
  };

  return (
    <div className="space-y-6">
      <PageCard>
        <PageCardHeader
          icon={GitBranch}
          iconBg="bg-purple-50"
          iconColor="text-purple-500"
          title="Add New Child Category"
          description="Create a new child category under a sub category."
        />

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Tag size={14} className="text-gray-400" /> Name <span className="text-red-500">*</span>
                </label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter child category name" required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <FolderTree size={14} className="text-gray-400" /> Main Category <span className="text-red-500">*</span>
                </label>
                <select value={form.categoryId}
                  onChange={e => setForm({ ...form, categoryId: e.target.value, subCategoryId: '' })} required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none">
                  <option value="">Select Main Category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Layers size={14} className="text-gray-400" /> Sub Category <span className="text-red-500">*</span>
                </label>
                <select value={form.subCategoryId} onChange={e => setForm({ ...form, subCategoryId: e.target.value })} required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none">
                  <option value="">Select Sub Category</option>
                  {filteredSubs.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
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
                <div><p className="text-sm font-medium text-gray-700">Featured</p><p className="text-xs text-gray-400">Set as featured child category</p></div>
                <Toggle checked={form.featured} onChange={v => setForm({ ...form, featured: v })} />
              </div>
            </div>

            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary-300 min-h-[220px]">
                {form.image ? (
                  <ViewableImage src={form.image} alt="Preview" title="Child Category Image" className="w-32 h-32 object-cover rounded-xl" />
                ) : (
                  <>
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3"><Upload size={24} className="text-gray-400" /></div>
                    <p className="font-medium text-gray-700 text-sm">Upload Child Category Image</p>
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
              {editingId ? 'Update Child Category' : 'Add Child Category'}
            </button>
          </div>
        </form>

      </PageCard>

        <ListTable
        title="Child Category List" count={items.length} search={search} setSearch={setSearch} setPage={setPage}
        paginated={paginated} page={page} perPage={perPage} filtered={filtered} totalPages={totalPages}
        columns={['mainCategory', 'subCategory', 'childCategory']}
        idKey="childCategoryId"
        onEdit={handleEdit} onDelete={handleDelete} onToggle={toggleField}
        onExport={() => downloadFile('/bulk/child-categories/export', `child-categories_${new Date().toISOString().slice(0, 10)}.csv`)}
        searchPlaceholder="Search child categories..."
      />
    </div>
  );
}
