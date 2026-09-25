import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import api from '../api/axios';
import AdminListLayout from '../components/AdminListLayout';
import { useListPagination } from '../hooks/useListPagination';
import { listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass } from '../constants/listTheme';

const roleColors = {
  main_admin: 'bg-purple-100 text-purple-700',
  store_admin: 'bg-blue-100 text-blue-700',
  subdomain_user: 'bg-green-100 text-green-700',
  employee: 'bg-gray-100 text-gray-700',
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/users').then(res => setUsers(res.data)).catch(() => {});
  }, []);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(search.toLowerCase())
  );

  const { page, setPage, perPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [search] });

  return (
    <AdminListLayout
      breadcrumb={<>Dashboard &gt; <span className="text-gray-600">User Management</span></>}
      title="User Management"
      icon={Users}
      count={filtered.length}
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      onSearchSubmit={() => setSearch(searchInput.trim())}
      searchPlaceholder="Search name, email or role..."
      page={page}
      totalPages={totalPages}
      total={total}
      perPage={perPage}
      onPageChange={setPage}
      isEmpty={paginated.length === 0}
      emptyMessage="Koi user nahi mila"
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className={listTheadClass} style={listTheadStyle}>
            <th className={`${listThClass} w-14`}>#</th>
            <th className={listThClass}>Name</th>
            <th className={listThClass}>Email</th>
            <th className={listThClass}>Role</th>
            <th className={listThClass}>Status</th>
            <th className={listThClass}>Access Sections</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((u, i) => (
            <tr key={u._id} className={listRowClass} style={listRowStyle}>
              <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
              <td className={`${listTdClass} font-medium text-gray-800`}>{u.name}</td>
              <td className={listTdClass}>{u.email}</td>
              <td className={listTdClass}>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[u.role] || ''}`}>
                  {u.role?.replace('_', ' ')}
                </span>
              </td>
              <td className={listTdClass}>
                <span className={`px-2 py-1 rounded-full text-xs ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {u.status}
                </span>
              </td>
              <td className={`${listTdClass} text-xs text-gray-500`}>
                {(u.accessSections || []).slice(0, 3).join(', ')}
                {(u.accessSections?.length || 0) > 3 && ` +${u.accessSections.length - 3} more`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminListLayout>
  );
}
