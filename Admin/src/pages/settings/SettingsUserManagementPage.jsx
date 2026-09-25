import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import {
  LIST_CARD_BORDER as CARD_BORDER, listTheadClass, listTheadStyle, listThClass, listTdClass, listRowClass, listRowStyle,
} from '../../constants/listTheme';

const roleColors = {
  main_admin: 'bg-purple-100 text-purple-700',
  store_admin: 'bg-blue-100 text-blue-700',
  subdomain_user: 'bg-green-100 text-green-700',
  employee: 'bg-gray-100 text-gray-700',
  customer: 'bg-sky-100 text-sky-700',
};

export default function SettingsUserManagementPage() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data || [])).catch(() => setUsers([]));
  }, []);

  const filtered = users.filter(u => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users size={22} className="text-[#1a3a8a]" /> User Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage customers, groups, blocked users and activity logs</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/users" className="text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:underline">Open full users list</Link>
        <Link to="/settings/audit-logs" className="text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:underline">Activity logs</Link>
        <Link to="/settings/employees" className="text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:underline">Employees</Link>
      </div>

      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search users..."
        className="max-w-sm w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-[#1a3a8a]/20"
      />

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: CARD_BORDER }}>
        <table className="w-full text-sm">
          <thead className={listTheadClass} style={listTheadStyle}>
            <tr>
              <th className={listThClass}>Name</th>
              <th className={listThClass}>Email</th>
              <th className={listThClass}>Role</th>
              <th className={listThClass}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u._id} className={listRowClass} style={listRowStyle}>
                <td className={`${listTdClass} font-medium`}>{u.name}</td>
                <td className={listTdClass}>{u.email}</td>
                <td className={listTdClass}>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${roleColors[u.role] || 'bg-gray-100 text-gray-600'}`}>
                    {(u.role || 'user').replace('_', ' ')}
                  </span>
                </td>
                <td className={listTdClass}>{u.status || (u.blocked ? 'Blocked' : 'Active')}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
