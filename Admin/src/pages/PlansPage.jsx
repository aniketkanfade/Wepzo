import { useState, useEffect } from 'react';
import { Plus, CreditCard, Check } from 'lucide-react';
import api from '../api/axios';

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', price: 0, maxComponents: 10, maxWebsites: 1, features: '' });

  useEffect(() => {
    api.get('/plans/all').then(res => setPlans(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const slug = form.name.toLowerCase().replace(/\s+/g, '-');
      const features = form.features.split(',').map(f => f.trim()).filter(Boolean);
      const { data } = await api.post('/plans', { ...form, slug, features });
      setPlans(prev => [...prev, data]);
      setShowForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CreditCard size={28} className="text-primary-600" /> Plan Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage subscription plans</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700">
          <Plus size={18} /> Add Plan
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input placeholder="Plan Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
            <input type="number" placeholder="Price (₹)" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="px-3 py-2 border rounded-lg text-sm" />
            <input type="number" placeholder="Max Components" value={form.maxComponents} onChange={e => setForm({ ...form, maxComponents: Number(e.target.value) })} className="px-3 py-2 border rounded-lg text-sm" />
            <input type="number" placeholder="Max Websites" value={form.maxWebsites} onChange={e => setForm({ ...form, maxWebsites: Number(e.target.value) })} className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Features (comma separated)" value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} className="px-3 py-2 border rounded-lg text-sm md:col-span-2" />
            <button type="submit" className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium">Save Plan</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div key={plan._id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="text-3xl font-bold text-primary-600 mt-2">
              ₹{plan.price}<span className="text-sm text-gray-400 font-normal">/month</span>
            </p>
            <ul className="mt-4 space-y-2">
              {(plan.features || []).map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check size={14} className="text-green-500" /> {f}
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t text-xs text-gray-400">
              {plan.maxComponents} components · {plan.maxWebsites} websites
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
