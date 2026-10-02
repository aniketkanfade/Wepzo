import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Eye } from 'lucide-react';
import api from '../api/axios';
import AdminListLayout from '../WebAdmin/Qucik commerce/components/AdminListLayout';
import { useListPagination } from '../hooks/useListPagination';
import { listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass } from '../constants/listTheme';

const roleColors = {
  main_admin: 'bg-purple-100 text-purple-700',
  store_admin: 'bg-blue-100 text-blue-700',
  subdomain_user: 'bg-green-100 text-green-700',
  employee: 'bg-gray-100 text-gray-700',
  website_user: 'bg-sky-100 text-sky-700',
};

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => { api.get('/users').then(res => setUsers(res.data || [])).catch(() => setUsers([])); }, []);

  const filtered = users.filter(user => `${user.name || ''} ${user.email || ''} ${user.role || ''}`.toLowerCase().includes(search.toLowerCase()));
  const { page, setPage, perPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [search] });

  return <AdminListLayout
    breadcrumb={<>Dashboard &gt; <span className="text-gray-600">User Management</span></>}
    title="User Management" icon={Users} count={filtered.length}
    searchValue={searchInput} onSearchChange={setSearchInput} onSearchSubmit={() => setSearch(searchInput.trim())}
    searchPlaceholder="Search name, email or role..." page={page} totalPages={totalPages} total={total}
    perPage={perPage} onPageChange={setPage} isEmpty={paginated.length === 0} emptyMessage="Koi user nahi mila"
  >
    <table className="w-full text-sm">
      <thead className="sticky top-0 z-10"><tr className={listTheadClass} style={listTheadStyle}>
        <th className={`${listThClass} w-14`}>#</th><th className={listThClass}>Name</th><th className={listThClass}>Email</th>
        <th className={listThClass}>Role</th><th className={listThClass}>Status</th><th className={listThClass}>Access Sections</th><th className={listThClass}>Actions</th>
      </tr></thead>
      <tbody>{paginated.map((user, index) => <tr key={user._id} className={listRowClass} style={listRowStyle}>
        <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + index + 1}</td>
        <td className={`${listTdClass} font-medium text-gray-800`}>{user.name}</td><td className={listTdClass}>{user.email}</td>
        <td className={listTdClass}><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-700'}`}>{(user.role || 'user').replaceAll('_', ' ')}</span></td>
        <td className={listTdClass}><span className={`rounded-full px-2 py-1 text-xs ${(user.status || 'active') === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{user.status || 'active'}</span></td>
        <td className={`${listTdClass} text-xs text-gray-500`}>{(user.accessSections || []).slice(0, 3).join(', ')}{(user.accessSections?.length || 0) > 3 && ` +${user.accessSections.length - 3} more`}</td>
        <td className={listTdClass}><button type="button" onClick={() => navigate(`/users/${user._id}`)} className="inline-flex items-center gap-1 rounded-lg border border-blue-100 px-2.5 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-50"><Eye size={14}/> View</button></td>
      </tr>)}</tbody>
    </table>
  </AdminListLayout>;
}
