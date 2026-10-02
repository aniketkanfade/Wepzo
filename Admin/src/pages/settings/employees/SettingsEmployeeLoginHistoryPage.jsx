import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import api from '../../../api/axios';
import AdminListLayout from '../../../WebAdmin/Qucik commerce/components/AdminListLayout';
import { useListPagination } from '../../../hooks/useListPagination';
import { listTheadClass, listTheadStyle, listThClass, listTdClass, listRowClass, listRowStyle } from '../../../constants/listTheme';
import { formatWhen } from './employeeForm.jsx';

export default function SettingsEmployeeLoginHistoryPage() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [status, setStatus] = useState('');

  const load = () => {
    api.get('/employee-login-history', { params: { q: search || undefined, employeeId: employeeId || undefined, status: status || undefined } })
      .then(r => setRows(r.data || [])).catch(() => setRows([]));
  };
  useEffect(() => {
    api.get('/employees').then(r => setEmployees(r.data || [])).catch(() => setEmployees([]));
  }, []);
  useEffect(() => { load(); }, [search, employeeId, status]);

  const pager = useListPagination(rows, { resetDeps: [search, employeeId, status] });

  return (
    <AdminListLayout
      breadcrumb={<>Employee Management &gt; <span className="text-gray-600">Login History</span></>}
      title="Login History"
      icon={History}
      count={rows.length}
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      onSearchSubmit={() => setSearch(searchInput.trim())}
      searchPlaceholder="Search name / email / IP"
      page={pager.page}
      totalPages={pager.totalPages}
      total={pager.total}
      perPage={pager.perPage}
      onPageChange={pager.setPage}
      isEmpty={pager.paginated.length === 0}
      emptyMessage="Koi login history nahi"
      filterBar={(
        <div className="flex flex-wrap gap-2 mb-3">
          <select value={employeeId} onChange={e => setEmployeeId(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">All employees</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">All status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      )}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className={listTheadClass} style={listTheadStyle}>
            <th className={`${listThClass} w-12`}>#</th>
            <th className={listThClass}>Employee</th>
            <th className={listThClass}>Email</th>
            <th className={listThClass}>Date / Time</th>
            <th className={listThClass}>Status</th>
            <th className={listThClass}>IP</th>
            <th className={listThClass}>Device</th>
          </tr>
        </thead>
        <tbody>
          {pager.paginated.map((h, i) => (
            <tr key={h._id} className={listRowClass} style={listRowStyle}>
              <td className={`${listTdClass} text-gray-500`}>{(pager.page - 1) * pager.perPage + i + 1}</td>
              <td className={`${listTdClass} font-medium`}>{h.employeeName}</td>
              <td className={listTdClass}>{h.email}</td>
              <td className={listTdClass}>{formatWhen(h.at)}</td>
              <td className={listTdClass}>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  h.status === 'success' ? 'bg-green-50 text-green-700'
                    : h.status === 'blocked' ? 'bg-amber-50 text-amber-700'
                    : 'bg-red-50 text-red-600'
                }`}>{h.status}</span>
              </td>
              <td className={listTdClass}>{h.ip}</td>
              <td className={listTdClass}>{h.device}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminListLayout>
  );
}
