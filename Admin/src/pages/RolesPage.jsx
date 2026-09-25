import { useState, useEffect } from 'react';
import { Shield, Plus } from 'lucide-react';
import api from '../api/axios';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    api.get('/roles').then(res => setRoles(res.data)).catch(() => {});
    api.get('/access').then(res => setSections(res.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield size={28} className="text-primary-600" /> Roles & Access Control
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage roles and assign access sections to users</p>
        </div>
        <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700">
          <Plus size={18} /> Add Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map(role => (
          <div key={role._id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{role.name}</h3>
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full capitalize">
                {role.type?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-4">{role.description || 'No description'}</p>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Access Sections</p>
              <div className="flex flex-wrap gap-1.5">
                {(role.accessSections || []).map(s => (
                  <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{s}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h3 className="font-semibold mb-4">All Access Sections</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sections.map(s => (
            <div key={s._id} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-gray-400 capitalize">{s.category}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
