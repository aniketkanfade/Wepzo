import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Layers, Save, X } from 'lucide-react';
import api from '../api/axios';
import { useModuleStore } from '../store/useStore';
import { getAdminModuleLabel } from '../constants/adminModules';

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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, moduleType: getDefaultModuleType(activeModule) });

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
              {['header', 'footer', 'hero', 'banner', 'product_grid', 'cart', 'checkout', 'contact', 'gallery', 'testimonial', 'newsletter', 'navbar'].map(t =>
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              )}
            </select>

            <input
              type="number"
              min="0"
              step="1"
              placeholder="Price (₹)"
              value={form.price}
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
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
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
            {components.map((c, i) => (
              <tr key={c._id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-3">{i + 1}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
