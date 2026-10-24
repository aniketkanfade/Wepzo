import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Layers, Save, X, Search, LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import api from '../api/axios';
import { numericInputValue } from '../utils/numericInput';
import { useModuleStore } from '../store/useStore';
import { getAdminModuleLabel } from '../constants/adminModules';
import PaginationControls from '../WebAdmin/Qucik commerce/components/PaginationControls';

const getDefaultModuleType = (module) => {
  const value = String(module?.slug || module?.type || 'ecommerce').toLowerCase();
  if (['ecommerce', 'e-commerce', 'e_commerce', 'quick-commerce', 'quick_commerce', 'qcommerce'].includes(value)) return 'ecommerce';
  if (value.includes('marketing') || value.includes('promotion')) return 'marketing';
  if (value.includes('general') || value.includes('website') || value.includes('information')) return 'general';
  return 'ecommerce';
};

const EMPTY_FORM = {
  name: '',
  type: 'header',
  moduleType: 'ecommerce',
  price: 0,
  description: '',
  status: 'active',
};

export default function ComponentsPage() {
  const { activeModule } = useModuleStore();
  const [components, setComponents] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, moduleType: getDefaultModuleType(activeModule) });
  const [search, setSearch] = useState('');
  const [locked, setLocked] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const totalPages = Math.max(1, Math.ceil(components.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const filteredComponents = components.filter(component => {
    const matchesSearch = `${component.name || ''} ${component.type || ''} ${component.moduleType || ''}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === 'all' || String(component.status || 'active') === statusFilter;
    const matchesType = typeFilter === 'all' || component.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });
  const filteredPages = Math.max(1, Math.ceil(filteredComponents.length / pageSize));
  const safePage = Math.min(currentPage, filteredPages);
  const paginatedComponents = filteredComponents.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    const key = `wepzo-list-filter:component-management`;
    const saved = localStorage.getItem(key);
    if (saved === null) return;
    const value = JSON.parse(saved);
    if (value && typeof value === 'object') {
      setSearch(value.search || '');
      setStatusFilter(value.status || 'all');
      setTypeFilter(value.type || 'all');
      setLocked(true);
    }
  }, []);

  const toggleFiltersLock = () => {
    const key = 'wepzo-list-filter:component-management';
    if (locked) {
      localStorage.removeItem(key);
      setLocked(false);
      return;
    }
    localStorage.setItem(key, JSON.stringify({ search, status: statusFilter, type: typeFilter }));
    setLocked(true);
  };

  const loadComponents = async () => {
    try {
      const moduleType = getDefaultModuleType(activeModule);
      const { data } = await api.get(`/components?status=&moduleType=${encodeURIComponent(moduleType)}`);
      setComponents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setComponents([]);
    }
  };

  useEffect(() => {
    loadComponents();
  }, [activeModule?.slug, activeModule?.type]);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, moduleType: getDefaultModuleType(activeModule) });
    setEditingId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, moduleType: getDefaultModuleType(activeModule) });
    setShowForm(true);
  };

  const openEditForm = (component) => {
    setEditingId(component._id);
    setForm({
      name: component.name || '',
      type: component.type || 'header',
      moduleType: getDefaultModuleType(activeModule),
      price: Number(component.price || 0),
      description: component.description || '',
      status: component.status || 'active',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        slug: form.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]+/g, ''),
      };

      if (editingId) {
        const { data } = await api.put(`/components/${editingId}`, payload);
        setComponents(prev => prev.map(item => item._id === editingId ? data : item));
      } else {
        const { data } = await api.post('/components', payload);
        setComponents(prev => [data, ...prev]);
        setPage(1);
      }

      resetForm();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Something went wrong while saving the component.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this component?')) return;
    try {
      await api.delete(`/components/${id}`);
      setComponents(prev => prev.filter(c => c._id !== id));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Unable to delete this component.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Layers size={28} className="text-primary-600" /> Component Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage website components and their pricing</p>
        </div>
        <button onClick={openAddForm} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700">
          <Plus size={18} /> Add Component
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-lg">{editingId ? 'Edit Component' : 'Add New Component'}</h3>
            <button type="button" onClick={resetForm} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Close form">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Component Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
              required
            />

            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {['header', 'logo', 'search', 'location', 'navbar', 'categories', 'category_tiles', 'hero', 'banner', 'stores', 'brands', 'flash_deals', 'product_grid', 'product_listing', 'product_details', 'favorites', 'cart', 'cart_page', 'checkout', 'profile', 'account', 'wishlist', 'order_tracking', 'footer', 'contact', 'gallery', 'testimonial', 'newsletter'].map(t =>
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              )}
            </select>

            <input
              type="number"
              min="0"
              step="1"
              placeholder="Price (₹)"
              value={numericInputValue(form.price)}
              onChange={e => setForm({ ...form, price: Number(e.target.value || 0) })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
              required
            />

            <div className="md:col-span-2 flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <input
              placeholder="Description"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm md:col-span-2 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />

            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
                <Save size={16} /> {editingId ? 'Update' : 'Save'}
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3">
          <label className="relative min-w-[180px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} disabled={locked} placeholder="Search component name, type or module..." aria-label="Search components"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50"/>
          </label>
          <select value={typeFilter} onChange={event => { setTypeFilter(event.target.value); setPage(1); }} disabled={locked} aria-label="Filter by component type" className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm disabled:bg-slate-50">
            <option value="all">All Types</option>
            {[...new Set(components.map(component => component.type).filter(Boolean))].sort().map(type => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
          </select>
          <select value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1); }} disabled={locked} aria-label="Filter by status" className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm disabled:bg-slate-50">
            <option value="all">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
          <button type="button" onClick={toggleFiltersLock} aria-label={locked ? 'Unlock saved filters' : 'Lock current filters'} title={locked ? 'Unlock saved filters' : 'Lock current filters'}
            className={`grid h-10 w-10 place-items-center rounded-lg border ${locked ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-gray-200 text-slate-500 hover:bg-slate-50'}`}>
            {locked ? <LockKeyhole size={16}/> : <LockKeyholeOpen size={16}/>}
          </button>
          {(search || statusFilter !== 'all' || typeFilter !== 'all') && <button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setPage(1); }}
            className="h-10 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">Clear filters</button>}
        </div>
        <div className="max-h-[65vh] overflow-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-6 py-3">#</th>
              <th className="text-left px-6 py-3">Name</th>
              <th className="text-left px-6 py-3">Type</th>
              <th className="text-left px-6 py-3">Module</th>
              <th className="text-left px-6 py-3">Price</th>
              <th className="text-left px-6 py-3">Status</th>
              <th className="text-left px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedComponents.length ? paginatedComponents.map((c, i) => (
              <tr key={c._id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-3">{(safePage - 1) * pageSize + i + 1}</td>
                <td className="px-6 py-3 font-medium">{c.name}</td>
                <td className="px-6 py-3 capitalize">{String(c.type || '').replace('_', ' ')}</td>
                <td className="px-6 py-3">{c.moduleType === 'ecommerce' ? getAdminModuleLabel(activeModule) : String(c.moduleType || '').replace(/[-_]/g, ' ')}</td>
                <td className="px-6 py-3 font-bold text-primary-600">₹{Number(c.price || 0)}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${String(c.status || 'active') === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.status || 'active'}
                  </span>
                </td>
                <td className="px-6 py-3 flex gap-2">
                  <button onClick={() => openEditForm(c)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded" aria-label={`Edit ${c.name}`}>
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(c._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" aria-label={`Delete ${c.name}`}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            )) : <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">No components found.</td></tr>}
            {paginatedComponents.length === 0 && <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">No components match these filters.</td></tr>}
          </tbody>
        </table>
        </div>
        <PaginationControls page={safePage} totalPages={filteredPages} total={filteredComponents.length} perPage={pageSize}
          onPageChange={setPage} onPerPageChange={value => { setPageSize(value); setPage(1); }} label="components"/>
      </div>
    </div>
  );
}
