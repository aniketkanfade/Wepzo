import { useEffect, useState } from 'react';
import { ToggleLeft } from 'lucide-react';
import api from '../../../api/axios';
import AdminListLayout from '../../../components/AdminListLayout';
import NavyToggle from '../../../components/NavyToggle';
import { useListPagination } from '../../../hooks/useListPagination';
import { listTheadClass, listTheadStyle, listThClass, listTdClass, listRowClass, listRowStyle } from '../../../constants/listTheme';

export default function SettingsEmployeeStatusPage() {
  const [employees, setEmployees] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const load = () => api.get('/employees').then(r => setEmployees(r.data || [])).catch(() => setEmployees([]));
  useEffect(() => { load(); }, []);

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    if (!q) return true;
    return e.name.toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q);
  });
  const pager = useListPagination(filtered, { resetDeps: [search] });

  const toggle = async (e) => {
    const next = e.status === 'active' ? 'inactive' : 'active';
    await api.put(`/employees/${e._id}`, { status: next, loginEnabled: next === 'active' ? e.loginEnabled : false });
    load();
  };

  return (
    <AdminListLayout
      breadcrumb={<>Employee Management &gt; <span className="text-gray-600">Employee Status</span></>}
      title="Employee Status"
      icon={ToggleLeft}
      count={filtered.length}
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      onSearchSubmit={() => setSearch(searchInput.trim())}
      searchPlaceholder="Search employee..."
      page={pager.page}
      totalPages={pager.totalPages}
      total={pager.total}
      perPage={pager.perPage}
      onPageChange={pager.setPage}
      isEmpty={pager.paginated.length === 0}
      emptyMessage="Koi employee nahi"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className={listTheadClass} style={listTheadStyle}>
            <th className={`${listThClass} w-12`}>#</th>
            <th className={listThClass}>Name</th>
            <th className={listThClass}>Email</th>
            <th className={listThClass}>Role</th>
            <th className={listThClass}>Status</th>
            <th className={listThClass}>Toggle</th>
          </tr>
        </thead>
        <tbody>
          {pager.paginated.map((e, i) => (
            <tr key={e._id} className={listRowClass} style={listRowStyle}>
              <td className={`${listTdClass} text-gray-500`}>{(pager.page - 1) * pager.perPage + i + 1}</td>
              <td className={`${listTdClass} font-medium`}>{e.name}</td>
              <td className={listTdClass}>{e.email}</td>
              <td className={listTdClass}>{e.roleName}</td>
              <td className={listTdClass}>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${e.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {e.status}
                </span>
              </td>
              <td className={listTdClass}>
                <NavyToggle checked={e.status === 'active'} onChange={() => toggle(e)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminListLayout>
  );
}
