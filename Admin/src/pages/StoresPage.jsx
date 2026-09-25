import { useState, useEffect } from 'react';
import { Store, Plus } from 'lucide-react';
import api from '../api/axios';

export default function StoresPage() {
  const [stores, setStores] = useState([]);

  useEffect(() => {
    api.get('/stores').then(res => setStores(res.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Store size={28} className="text-primary-600" /> Store Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage stores and their access permissions</p>
        </div>
        <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700">
          <Plus size={18} /> Add Store
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-6 py-3">#</th>
              <th className="text-left px-6 py-3">Store Name</th>
              <th className="text-left px-6 py-3">Owner</th>
              <th className="text-left px-6 py-3">Subdomain</th>
              <th className="text-left px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {stores.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No stores yet. Add your first store.</td></tr>
            ) : stores.map((s, i) => (
              <tr key={s._id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-3">{i + 1}</td>
                <td className="px-6 py-3 font-medium">{s.name}</td>
                <td className="px-6 py-3">{s.ownerId?.name || '-'}</td>
                <td className="px-6 py-3">{s.subdomain || '-'}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
