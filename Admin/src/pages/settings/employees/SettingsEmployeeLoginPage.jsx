import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import api from '../../../api/axios';
import AdminListLayout from '../../../WebAdmin/Qucik commerce/components/AdminListLayout';
import NavyToggle from '../../../WebAdmin/Qucik commerce/components/NavyToggle';
import { useListPagination } from '../../../hooks/useListPagination';
import {
  listTheadClass, listTheadStyle, listThClass, listTdClass, listRowClass, listRowStyle, listBtnOutline,
} from '../../../constants/listTheme';
import { formatWhen } from './employeeForm.jsx';

export default function SettingsEmployeeLoginPage() {
  const [employees, setEmployees] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pwd, setPwd] = useState({});

  const load = () => api.get('/employees').then(r => setEmployees(r.data || [])).catch(() => setEmployees([]));
  useEffect(() => { load(); }, []);

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    if (!q) return true;
    return e.name.toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q);
  });
  const pager = useListPagination(filtered, { resetDeps: [search] });

  const toggleLogin = async (e) => {
    await api.put(`/employees/${e._id}`, { loginEnabled: e.loginEnabled === false });
    load();
  };

  const resetPassword = async (e) => {
    const password = (pwd[e._id] || '').trim();
    if (!password) return alert('Naya password likho');
    await api.put(`/employees/${e._id}`, { password });
    setPwd(p => ({ ...p, [e._id]: '' }));
    alert('Password update ho gaya');
  };

  return (
    <AdminListLayout
      breadcrumb={<>Employee Management &gt; <span className="text-gray-600">Employee Login</span></>}
      title="Employee Login"
      icon={LogIn}
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
      filterBar={(
        <p className="text-xs text-gray-500 px-1 mb-2">
          Employees panel pe apna email + password se login kar sakte hain. Default password: <b>emp123</b>
        </p>
      )}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className={listTheadClass} style={listTheadStyle}>
            <th className={`${listThClass} w-12`}>#</th>
            <th className={listThClass}>Name</th>
            <th className={listThClass}>Email</th>
            <th className={listThClass}>Last login</th>
            <th className={listThClass}>Login</th>
            <th className={listThClass}>Reset password</th>
          </tr>
        </thead>
        <tbody>
          {pager.paginated.map((e, i) => (
            <tr key={e._id} className={listRowClass} style={listRowStyle}>
              <td className={`${listTdClass} text-gray-500`}>{(pager.page - 1) * pager.perPage + i + 1}</td>
              <td className={`${listTdClass} font-medium`}>{e.name}</td>
              <td className={listTdClass}>{e.email}</td>
              <td className={`${listTdClass} text-xs text-gray-500`}>{formatWhen(e.lastLoginAt)}</td>
              <td className={listTdClass}>
                <NavyToggle checked={e.loginEnabled !== false && e.status === 'active'} onChange={() => toggleLogin(e)} />
              </td>
              <td className={listTdClass}>
                <div className="flex items-center gap-1.5">
                  <input type="password" placeholder="New password" value={pwd[e._id] || ''}
                    onChange={ev => setPwd(p => ({ ...p, [e._id]: ev.target.value }))}
                    className="px-2 py-1 border rounded-lg text-xs w-32" />
                  <button type="button" onClick={() => resetPassword(e)} className={`px-2 py-1 text-xs rounded-lg ${listBtnOutline}`}>Save</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminListLayout>
  );
}
