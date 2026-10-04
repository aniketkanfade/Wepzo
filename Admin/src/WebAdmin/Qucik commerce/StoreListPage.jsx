import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, Settings, Download, ChevronDown, Store } from 'lucide-react';
import api from '../../api/axios';
import AdminListLayout from './components/AdminListLayout';
import NavyToggle from './components/NavyToggle';
import { useListPagination } from '../../hooks/useListPagination';
import { useDeliveryZones } from '../../hooks/useDeliveryZones';
import { useModuleStore } from '../../store/useStore';
import { getAdminModuleLabel } from '../../constants/adminModules';
import { LIST_TEAL, listBtnNavy, listBtnOutline, listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass } from '../../constants/listTheme';

export default function StoreListPage() {
  const activeModule = useModuleStore(state => state.activeModule);
  const commerceModuleLabel = getAdminModuleLabel(activeModule);
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [zone, setZone] = useState('all');
  const { names: zoneNames } = useDeliveryZones();
  const [stats, setStats] = useState({});
  const stopRow = (e) => e.stopPropagation();

  const load = useCallback(() => {
    api.get('/stores', { params: { filter: 'list', zone } }).then(r => setStores(r.data)).catch(() => {});
    api.get('/stores/stats').then(r => setStats(r.data)).catch(() => {});
  }, [zone]);

  useEffect(() => { load(); }, [load]);

  const filtered = stores.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.ownerName || '').toLowerCase().includes(search.toLowerCase()) ||
    String(s.storeId || '').includes(search)
  );

  const { page, setPage, perPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [search, zone] });

  const patchStore = async (storeId, data) => {
    try {
      const { data: updated } = await api.put(`/stores/${storeId}`, data);
      setStores(prev => prev.map(s => String(s.storeId) === String(updated.storeId) ? updated : s));
      api.get('/stores/stats').then(r => setStats(r.data)).catch(() => {});
    } catch {
      alert('Update failed — page refresh karein');
    }
  };

  const handleDelete = async (storeId, storeName) => {
    if (!confirm(`"${storeName}" delete karna hai? Is store ke products aur orders bhi delete ho jayenge.`)) return;
    try {
      const { data } = await api.delete(`/stores/${storeId}`);
      const r = data.removed;
      if (r) {
        alert(`Store deleted — ${r.products} products, ${r.orders} orders remove hue.`);
      }
      load();
    } catch {
      alert('Delete failed — page refresh karein');
    }
  };

  const handleExport = () => {
    const rows = [['SI', 'Store', 'Id', 'Owner', 'Phone', 'Zone', 'Module', 'Featured', 'Status', 'Blocked']];
    filtered.forEach((s, i) => {
      rows.push([i + 1, s.name, s.storeId, s.ownerName, s.phone, s.area, s.module, s.isRecommended, s.status, s.isBlocked]);
    });
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stores_list_${Date.now()}.csv`;
    a.click();
  };

  const statCards = [
    { label: 'Total stores', value: stats.total, bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700' },
    { label: 'Active stores', value: stats.active, bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700' },
    { label: 'Inactive stores', value: stats.inactive, bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700' },
    { label: 'Newly joined stores', value: stats.newlyJoined, bg: 'bg-pink-50', border: 'border-pink-100', text: 'text-pink-700' },
  ];

  return (
    <AdminListLayout
      breadcrumb={<>Dashboard &gt; Store Management &gt; <span className="text-gray-600">Stores List</span></>}
      title="Stores List"
      icon={Store}
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
      emptyMessage="Koi store nahi mila"
      emptyColSpan={9}
      beforeCard={(
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-1">
            {statCards.map(c => (
              <div key={c.label} className={`${c.bg} ${c.border} border rounded-xl px-4 py-4`}>
                <p className="text-xs text-gray-600 font-medium mb-1">{c.label}</p>
                <p className={`text-2xl font-bold ${c.text}`}>{c.value ?? 0}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white border rounded-xl text-xs font-semibold text-gray-600 mx-1" style={{ borderColor: '#e8ecf3' }}>
            <span>TOTAL TRANSACTIONS : <span className="text-slate-800">{stats.totalTransactions ?? 0}</span></span>
            <span>TOTAL STORE WITHDRAWS : <span className="text-slate-800">₹ {(stats.totalWithdraws ?? 0).toLocaleString('en-IN')}</span></span>
          </div>
        </>
      )}
      headerActions={(
        <>
          <select value={zone} onChange={e => setZone(e.target.value)}
            className="border rounded-lg px-3 py-2.5 text-sm bg-white outline-none" style={{ borderColor: '#e0e4ec' }}>
            <option value="all">All Zones</option>
            {zoneNames.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          <button type="button" onClick={handleExport}
            className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${listBtnOutline}`}>
            <Download size={15} /> Export <ChevronDown size={14} className="text-gray-400" />
          </button>
        </>
      )}
      footerBar={(
        <Link to="/stores/add"
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition ${listBtnNavy}`}>
          <Plus size={16} /> Add Store
        </Link>
      )}
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className={listTheadClass} style={listTheadStyle}>
            <th className={`${listThClass} w-14`}>SI</th>
            <th className={`${listThClass} min-w-[200px]`}>Store Information</th>
            <th className={`${listThClass} min-w-[150px]`}>Owner Information</th>
            <th className={listThClass}>Zone</th>
            <th className={listThClass}>Module</th>
            <th className={`${listThClass} text-center`}>Products</th>
            <th className={`${listThClass} text-center`}>Orders</th>
            <th className={`${listThClass} text-center`}>Featured</th>
            <th className={`${listThClass} text-center`}>Status</th>
            <th className={`${listThClass} text-center`}>Blocked</th>
            <th className={`${listThClass} w-36`}>Action</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((s, i) => (
            <tr key={s._id} onClick={() => navigate(`/stores/view/${s.storeId}`)} className={listRowClass} style={listRowStyle}>
              <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
              <td className={listTdClass}>
                <div className="flex items-center gap-3">
                  <img src={s.logoImage || `https://placehold.co/48x48/e2e8f0/64748b?text=${s.name?.charAt(0)}`}
                    alt="" className="w-10 h-10 rounded-full object-cover border shrink-0" style={{ borderColor: '#e8ecf3' }} />
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate max-w-[160px]">{s.name}</p>
                    <p className="text-xs text-gray-400">Id:{s.storeId || '—'}</p>
                  </div>
                </div>
              </td>
              <td className={listTdClass}>
                <p className="font-medium text-gray-900">{s.ownerName}</p>
                <p className="text-xs font-medium" style={{ color: LIST_TEAL }}>+91{s.phone}</p>
              </td>
              <td className={`${listTdClass} text-gray-700`}>{s.area || s.zone || 'Nagpur'}</td>
              <td className={listTdClass}>
                <p className="font-medium text-gray-800">{s.module || '—'}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                  {commerceModuleLabel}
                </p>
              </td>
              <td className={`${listTdClass} text-center tabular-nums font-semibold text-gray-800`}>{s.productCount ?? 0}</td>
              <td className={`${listTdClass} text-center tabular-nums font-semibold text-gray-800`}>{s.orderCount ?? 0}</td>
              <td className={`${listTdClass} text-center`} onClick={stopRow}>
                <div className="flex justify-center"><NavyToggle checked={!!s.isRecommended} onChange={v => patchStore(s.storeId, { isRecommended: v })} /></div>
              </td>
              <td className={`${listTdClass} text-center`} onClick={stopRow}>
                <div className="flex justify-center"><NavyToggle checked={s.status === 'active'} onChange={v => patchStore(s.storeId, { status: v ? 'active' : 'inactive' })} /></div>
              </td>
              <td className={`${listTdClass} text-center`} onClick={stopRow}>
                <div className="flex justify-center"><NavyToggle checked={!!s.isBlocked} onChange={v => patchStore(s.storeId, { isBlocked: v })} /></div>
              </td>
              <td className={listTdClass} onClick={stopRow}>
                <div className="flex items-center gap-2">
                  <Link to={`/stores/edit/${s.storeId}`} title="Settings"
                    className="w-9 h-9 flex items-center justify-center rounded-lg border text-[#1a3a8a] hover:bg-[#f0f4ff]" style={{ borderColor: '#b8c9e8' }}>
                    <Settings size={15} />
                  </Link>
                  <Link to={`/stores/edit/${s.storeId}`} title="Edit"
                    className="w-9 h-9 flex items-center justify-center rounded-lg border text-[#1a3a8a] hover:bg-[#f0f4ff]" style={{ borderColor: '#b8c9e8' }}>
                    <Pencil size={15} />
                  </Link>
                  <button type="button" title="Delete" onClick={() => handleDelete(s.storeId, s.name)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border text-[#ff4d4f] hover:bg-red-50" style={{ borderColor: '#ffc9c9' }}>
                    <Trash2 size={15} />
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
