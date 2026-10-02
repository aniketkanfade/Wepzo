import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, Pencil, Download, ChevronDown, UserPlus } from 'lucide-react';
import api from '../../api/axios';
import AdminListLayout from './components/AdminListLayout';
import { useListPagination } from '../../hooks/useListPagination';
import { useDeliveryZones } from '../../hooks/useDeliveryZones';
import { LIST_NAVY, listBtnOutline, listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass } from '../../constants/listTheme';

export default function StoreNewRequestsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('pending');
  const [stores, setStores] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [zone, setZone] = useState('all');
  const { names: zoneNames } = useDeliveryZones();
  const stopRow = (e) => e.stopPropagation();

  const load = useCallback(() => {
    api.get('/stores', { params: { filter: tab === 'denied' ? 'denied' : 'pending', zone } }).then(r => setStores(r.data)).catch(() => {});
  }, [tab, zone]);

  useEffect(() => { load(); }, [load]);

  const filtered = stores.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.ownerName || '').toLowerCase().includes(search.toLowerCase()) ||
    String(s.storeId || '').includes(search)
  );

  const { page, setPage, perPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [search, tab, zone] });

  const approve = async (id) => {
    if (!confirm('Store approve karna hai?')) return;
    await api.post(`/stores/${id}/approve`);
    load();
  };

  const reject = async (id) => {
    if (!confirm('Request reject karni hai?')) return;
    await api.post(`/stores/${id}/reject`);
    load();
  };

  const handleExport = () => {
    const rows = [['SI', 'Store', 'Id', 'Module', 'Owner', 'Phone', 'Zone', 'Status']];
    filtered.forEach((s, i) => {
      rows.push([i + 1, s.name, s.storeId, s.module, s.ownerName, s.phone, s.area || s.zone, s.status]);
    });
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stores_${tab}_${Date.now()}.csv`;
    a.click();
  };

  return (
    <AdminListLayout
      breadcrumb={<>Dashboard &gt; Store Management &gt; <span className="text-gray-600">New Joining Requests</span></>}
      title="New Joining Requests"
      icon={UserPlus}
      count={filtered.length}
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      onSearchSubmit={() => setSearch(searchInput.trim())}
      searchPlaceholder="Ex : Search Store Name"
      page={page}
      totalPages={totalPages}
      total={total}
      perPage={perPage}
      onPageChange={setPage}
      isEmpty={paginated.length === 0}
      emptyMessage={tab === 'pending' ? 'Koi pending store nahi' : 'Koi denied store nahi'}
      beforeCard={(
        <div className="flex gap-1 p-1 bg-white border rounded-xl w-fit mx-1" style={{ borderColor: '#e8ecf3' }}>
          {['pending', 'denied'].map(key => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === key ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              style={tab === key ? { backgroundColor: LIST_NAVY } : undefined}>
              {key === 'pending' ? 'Pending Stores' : 'Denied Stores'}
            </button>
          ))}
        </div>
      )}
      headerActions={(
        <>
          <select value={zone} onChange={e => setZone(e.target.value)}
            className="border rounded-lg px-3 py-2.5 text-sm bg-white outline-none" style={{ borderColor: '#e0e4ec' }}>
            <option value="all">All Zones</option>
            {zoneNames.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          <button type="button" onClick={handleExport}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition ${listBtnOutline}`}>
            <Download size={15} /> Export <ChevronDown size={14} className="text-gray-400" />
          </button>
        </>
      )}
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className={listTheadClass} style={listTheadStyle}>
            <th className={`${listThClass} w-14`}>SI</th>
            <th className={`${listThClass} min-w-[200px]`}>Store Information</th>
            <th className={listThClass}>Module</th>
            <th className={`${listThClass} min-w-[160px]`}>Owner Information</th>
            <th className={listThClass}>Zone</th>
            <th className={listThClass}>Status</th>
            <th className={`${listThClass} w-28`}>Action</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((s, i) => (
            <tr key={s._id} onClick={() => navigate(`/stores/edit/${s.storeId}`)} className={listRowClass} style={listRowStyle}>
              <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
              <td className={listTdClass}>
                <div className="flex items-center gap-3">
                  <img src={s.logoImage || `https://placehold.co/48x48/e2e8f0/64748b?text=${s.name?.charAt(0)}`}
                    alt="" className="w-11 h-11 rounded-lg object-cover border shrink-0" style={{ borderColor: '#e8ecf3' }} />
                  <div>
                    <p className="font-bold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">Id:{s.storeId || '—'}</p>
                  </div>
                </div>
              </td>
              <td className={`${listTdClass} text-gray-700 font-medium`}>{s.module || '—'}</td>
              <td className={listTdClass}>
                <p className="font-medium text-gray-900">{s.ownerName}</p>
                <p className="text-xs text-gray-500">+91{s.phone}</p>
              </td>
              <td className={`${listTdClass} text-gray-700`}>{s.area || s.zone || 'Nagpur'}</td>
              <td className={listTdClass}>
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${s.status === 'denied' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-pink-50 text-red-500 border-pink-100'}`}>
                  {s.status === 'denied' ? 'Denied' : 'Pending'}
                </span>
              </td>
              <td className={listTdClass} onClick={stopRow}>
                <div className="flex items-center gap-2">
                  <Link to={`/stores/edit/${s.storeId}`} title="Edit"
                    className="w-9 h-9 flex items-center justify-center rounded-lg border text-[#1a3a8a] hover:bg-[#f0f4ff]" style={{ borderColor: '#b8c9e8' }}>
                    <Pencil size={15} />
                  </Link>
                  {tab === 'pending' && (
                    <>
                      <button type="button" title="Approve" onClick={() => approve(s.storeId)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                        <Check size={15} />
                      </button>
                      <button type="button" title="Reject" onClick={() => reject(s.storeId)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg border text-[#ff4d4f] hover:bg-red-50" style={{ borderColor: '#ffc9c9' }}>
                        <X size={15} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminListLayout>
  );
}
