import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Trash2, Eye } from 'lucide-react';
import api from '../../api/axios';
import AdminListLayout from '../../components/AdminListLayout';
import { useListPagination } from '../../hooks/useListPagination';
import {
  listBtnNavy, listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass,
} from '../../constants/listTheme';

export default function SettingsEmployeesPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    api.get('/employees').then(r => setEmployees(r.data || [])).catch(() => setEmployees([]));
  };
  useEffect(() => { load(); }, []);

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    if (!q) return true;
    return e.name.toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q) || (e.roleName || '').toLowerCase().includes(q);
  });
  const { page, setPage, perPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [search] });

  const handleDelete = async (id) => {
    if (!confirm('Employee delete karna hai?')) return;
    await api.delete(`/employees/${id}`);
    load();
  };

  return (
    <AdminListLayout
      breadcrumb={<>Employee Management &gt; <span className="text-gray-600">Employee List</span></>}
      title="Employee List"
      icon={Users}
      count={filtered.length}
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      onSearchSubmit={() => setSearch(searchInput.trim())}
      searchPlaceholder="Search employee..."
      page={page}
      totalPages={totalPages}
      total={total}
      perPage={perPage}
      onPageChange={setPage}
      isEmpty={paginated.length === 0}
      emptyMessage="Koi employee nahi"
      headerActions={(
        <button type="button" onClick={() => navigate('/settings/employees/add')}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold ${listBtnNavy}`}>
          <Plus size={16} /> Add Employee
        </button>
      )}
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className={listTheadClass} style={listTheadStyle}>
            <th className={`${listThClass} w-12`}>#</th>
            <th className={listThClass}>Name</th>
            <th className={listThClass}>Email</th>
            <th className={listThClass}>Role</th>
            <th className={listThClass}>Store Access</th>
            <th className={listThClass}>Status</th>
            <th className={`${listThClass} w-28`}>Action</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((e, i) => (
            <tr key={e._id} className={listRowClass} style={listRowStyle}>
              <td className={`${listTdClass} text-gray-500`}>{(page - 1) * perPage + i + 1}</td>
              <td className={`${listTdClass} font-medium`}>{e.name}</td>
              <td className={listTdClass}>{e.email}</td>
              <td className={listTdClass}>{e.roleName}</td>
              <td className={listTdClass}>{e.storeName || 'All Stores'}</td>
              <td className={listTdClass}>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${e.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {e.status}
                </span>
              </td>
              <td className={listTdClass}>
                <div className="flex gap-2">
                  <button type="button" title="View" onClick={() => navigate(`/settings/employees/profile/${e._id}`)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border text-sky-600"
                    style={{ borderColor: '#bae6fd' }}>
                    <Eye size={14} />
                  </button>
                  <button type="button" onClick={() => handleDelete(e._id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border text-red-500"
                    style={{ borderColor: '#fecaca' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminListLayout>
  );
}
