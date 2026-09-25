import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Layers } from 'lucide-react';
import api from '../api/axios';

export default function ComponentsPage() {
  const [components, setComponents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'header', moduleType: 'general', price: 0, description: '' });

  useEffect(() => {
    api.get('/components?status=').then(res => setComponents(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const slug = form.name.toLowerCase().replace(/\s+/g, '-');
      const { data } = await api.post('/components', { ...form, slug });
      setComponents(prev => [...prev, data]);
      setShowForm(false);
      setForm({ name: '', type: 'header', moduleType: 'general', price: 0, description: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this component?')) return;
    await api.delete(`/components/${id}`);
    setComponents(prev => prev.filter(c => c._id !== id));
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
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700">
          <Plus size={18} /> Add Component
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Add New Component</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Component Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm" required />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm">
              {['header', 'footer', 'hero', 'banner', 'product_grid', 'cart', 'checkout', 'contact', 'gallery', 'testimonial', 'newsletter', 'navbar'].map(t =>
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              )}
            </select>
            <select value={form.moduleType} onChange={e => setForm({ ...form, moduleType: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm">
              {['ecommerce', 'marketing', 'portfolio', 'blog', 'general'].map(t =>
                <option key={t} value={t}>{t}</option>
              )}
            </select>
            <input type="number" placeholder="Price (₹)" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })}
              className="px-3 py-2 border rounded-lg text-sm" required />
            <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm md:col-span-2" />
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border rounded-lg text-sm">Cancel</button>
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
                <td className="px-6 py-3 capitalize">{c.type?.replace('_', ' ')}</td>
                <td className="px-6 py-3 capitalize">{c.moduleType}</td>
                <td className="px-6 py-3 font-bold text-primary-600">₹{c.price}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-6 py-3 flex gap-2">
                  <button className="p-1.5 text-primary-600 hover:bg-primary-50 rounded"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(c._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
