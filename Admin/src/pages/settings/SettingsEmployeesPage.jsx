import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Trash2, Eye } from 'lucide-react';
import api from '../../api/axios';
import AdminListLayout from '../../WebAdmin/Qucik commerce/components/AdminListLayout';
import { useListPagination } from '../../hooks/useListPagination';
import { useBulkSelection } from '../../hooks/useBulkSelection';
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
  const { page, setPage, perPage, setPerPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [search] });
  const selection = useBulkSelection(filtered);

  const handleDelete = async (id) => {
    const employee = employees.find(item => item._id === id);
    if (!confirm(`Delete employee "${employee?.name || employee?.email || 'this employee'}"?`)) return;
    await api.delete(`/employees/${id}`);
    load();
  };

  const handleBulkDelete = async () => {
    const selectedItems = selection.selectedItems;
    if (!selectedItems.length || !confirm(`Delete ${selectedItems.length} selected employee(s)? This cannot be undone.`)) return;
    const results = await Promise.allSettled(selectedItems.map(item => api.delete(`/employees/${item._id}`)));
    const deletedIds = new Set(selectedItems.filter((_, index) => results[index].status === 'fulfilled').map(item => item._id));
    setEmployees(prev => prev.filter(item => !deletedIds.has(item._id)));
    const failedCount = results.length - deletedIds.size;
    if (failedCount) alert(`${failedCount} employee(s) could not be deleted.`);
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
      onPerPageChange={setPerPage}
      selection={{
        allSelected: selection.allSelected,
        selectedCount: selection.selectedItems.length,
        onToggleAll: selection.toggleAll,
        onBulkDelete: handleBulkDelete,
      }}
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
            <th className={`${listThClass} w-10`}>
              <input type="checkbox" checked={selection.allSelected} onChange={selection.toggleAll}
                aria-label={`Select all ${filtered.length} filtered employees`} />
            </th>
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
              <td className={listTdClass}>
                <input type="checkbox" checked={selection.selectedIds.has(String(e._id))}
                  onChange={() => selection.toggle(e._id)} aria-label={`Select ${e.name}`} />
              </td>
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
