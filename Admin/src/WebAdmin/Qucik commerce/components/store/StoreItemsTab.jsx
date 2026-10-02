import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ChevronDown, ChevronLeft, ChevronRight, Edit, Trash2, Plus,
  Package, PackageCheck, PackageX, Clock, Ban, Download,
} from 'lucide-react';
import api from '../../../../api/axios';
import ViewableImage from '../ViewableImage';
import NavyToggle from '../NavyToggle';
import ProductStockUpdateModal from '../ProductStockUpdateModal';
import { useListPagination } from '../../../../hooks/useListPagination';
import {
  LIST_NAVY as NAVY, LIST_CARD_BORDER as CARD_BORDER, LIST_PER_PAGE as perPage,
  listBtnNavy, listBtnOutline, listTheadClass, listTheadStyle, listThClass,
  listRowClass, listRowStyle, listTdClass,
} from '../../../../constants/listTheme';

function StatCard({ icon: Icon, label, value, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm min-w-0">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
        <p className="text-xl font-bold text-slate-900 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function exportStoreProducts(products, storeName) {
  const rows = [['SI', 'Name', 'SKU', 'Category', 'Stock', 'Price', 'Status']];
  products.forEach((p, i) => {
    rows.push([
      i + 1, p.name, p.sku || '', p.mainCategory || '', p.stock ?? 0,
      p.price ?? 0, p.status === false ? 'Inactive' : 'Active',
    ]);
  });
  const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(storeName || 'store').replace(/\s+/g, '_')}_items.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function StoreItemsTab({ store, products, setProducts, loading }) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState([]);
  const [stockProduct, setStockProduct] = useState(null);

  const stopRow = (e) => e.stopPropagation();

  useEffect(() => {
    api.get('/product-requests').then(r => {
      const list = (r.data || []).filter(req =>
        String(req.storeId) === String(store.storeId) || req.store === store.name
      );
      setRequests(list);
    }).catch(() => setRequests([]));
  }, [store.storeId, store.name]);

  const stats = useMemo(() => ({
    all: products.length,
    active: products.filter(p => p.status !== false).length,
    inactive: products.filter(p => p.status === false).length,
    pending: requests.filter(r => r.status === 'Pending').length,
    rejected: requests.filter(r => r.status === 'Rejected').length,
  }), [products, requests]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.trim().toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.mainCategory || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const { page, setPage, totalPages, paginated } = useListPagination(filtered, { resetDeps: [search] });

  const toggleStatus = async (id, val) => {
    await api.put(`/product-items/${id}`, { status: val });
    setProducts(prev => prev.map(i => i._id === id ? { ...i, status: val } : i));
  };

  const handleDelete = async (id) => {
    if (!confirm('Is product delete karna hai?')) return;
    await api.delete(`/product-items/${id}`);
    setProducts(prev => prev.filter(i => i._id !== id));
  };

  const handleStockSaved = (updated) => {
    setProducts(prev => prev.map(i => i._id === updated._id ? updated : i));
  };

  const runSearch = () => { setSearch(searchInput.trim()); setPage(1); };

  const btnNavy = listBtnNavy;
  const btnOutline = listBtnOutline;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
        <span className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        Items load ho rahe hain...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={Package} label="All Items" value={stats.all} iconBg="bg-sky-50" iconColor="text-sky-600" />
        <StatCard icon={PackageCheck} label="Active Items" value={stats.active} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <StatCard icon={PackageX} label="Inactive Items" value={stats.inactive} iconBg="bg-red-50" iconColor="text-red-500" />
        <StatCard icon={Clock} label="Pending For Approval" value={stats.pending} iconBg="bg-amber-50" iconColor="text-amber-600" />
        <StatCard icon={Ban} label="Rejected Items" value={stats.rejected} iconBg="bg-rose-50" iconColor="text-rose-500" />
      </div>

      <div
        className="flex flex-col rounded-xl border shadow-sm overflow-hidden bg-white"
        style={{ borderColor: CARD_BORDER }}
      >
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <div className="flex items-center gap-2.5">
            <Package size={18} style={{ color: NAVY }} strokeWidth={2.25} />
            <h2 className="text-base font-bold tracking-tight" style={{ color: NAVY }}>Items</h2>
            <span
              className="text-sm font-medium px-2.5 py-0.5 rounded-full min-w-[1.75rem] text-center tabular-nums"
              style={{ backgroundColor: '#eef2f8', color: NAVY }}
            >
              {filtered.length}
            </span>
          </div>

          <div className="flex flex-1 max-w-md mx-auto min-w-[200px]">
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              placeholder="Search by name..."
              className="flex-1 pl-4 pr-2 py-2.5 border rounded-l-lg text-sm outline-none bg-white text-gray-700"
              style={{ borderColor: '#e0e4ec' }}
            />
            <button type="button" onClick={runSearch} className={`px-4 rounded-r-lg transition ${btnNavy}`}>
              <Search size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => exportStoreProducts(filtered, store.name)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition ${btnOutline}`}>
              <Download size={14} /> Export <ChevronDown size={12} className="text-gray-400" />
            </button>
            <Link to={`/products/setup/add?storeId=${store.storeId}`}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition whitespace-nowrap ${btnNavy}`}>
              <Plus size={16} strokeWidth={2.5} /> Add New Item
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto dropdown-scroll">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className={listTheadClass} style={listTheadStyle}>
                <th className={`${listThClass} w-14`}>SI</th>
                <th className={`${listThClass} min-w-[220px]`}>Name</th>
                <th className={listThClass}>Category</th>
                <th className={`${listThClass} w-[96px]`}>Quantity</th>
                <th className={listThClass}>Price</th>
                <th className={`${listThClass} text-center`}>Status</th>
                <th className={`${listThClass} w-24`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-gray-400">
                    {products.length === 0 ? 'Koi item nahi — Add New Item karein' : 'Search mein koi item nahi mila'}
                  </td>
                </tr>
              ) : paginated.map((item, i) => (
                <tr
                  key={item._id}
                  onClick={() => navigate(`/products/setup/view/${item._id}`)}
                  className={listRowClass}
                  style={listRowStyle}
                >
                  <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
                  <td className={listTdClass}>
                    <div className="flex items-center gap-3 min-w-0">
                      <ViewableImage
                        src={item.image}
                        images={[item.image, ...(item.images || [])].filter(Boolean)}
                        title={item.name}
                        alt={item.name}
                        viewable={false}
                        className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0 border"
                        style={{ borderColor: CARD_BORDER }}
                      />
                      <Link to={`/products/setup/view/${item._id}`} onClick={stopRow}
                        className="font-semibold text-gray-800 truncate max-w-[180px] hover:text-primary-600 hover:underline">
                        {item.name}
                      </Link>
                    </div>
                  </td>
                  <td className={`${listTdClass} text-gray-600 max-w-[160px] truncate`}>{item.mainCategory}</td>
                  <td className={listTdClass} onClick={stopRow}>
                    <div className="inline-grid grid-cols-[2.75rem_1.375rem] items-center gap-2">
                      <span className={`text-right tabular-nums text-sm ${item.stock <= item.lowStockLimit ? 'text-[#ff4d4f] font-semibold' : 'text-gray-800 font-medium'}`}>
                        {item.stock}
                      </span>
                      <button
                        type="button"
                        title="Update stock & price"
                        onClick={() => setStockProduct(item)}
                        className="w-[22px] h-[22px] flex items-center justify-center text-white rounded-md text-xs font-bold hover:opacity-90 shrink-0"
                        style={{ backgroundColor: NAVY }}
                      >
                        <Plus size={13} strokeWidth={3} />
                      </button>
                    </div>
                  </td>
                  <td className={`${listTdClass} font-semibold text-gray-800 tabular-nums whitespace-nowrap`}>
                    ₹ {item.price?.toLocaleString('en-IN')}
                  </td>
                  <td className={`${listTdClass} text-center`} onClick={stopRow}>
                    <div className="flex justify-center">
                      <NavyToggle checked={item.status !== false} onChange={v => toggleStatus(item._id, v)} />
                    </div>
                  </td>
                  <td className={listTdClass} onClick={stopRow}>
                    <div className="flex items-center gap-2">
                      <Link to={`/products/setup/add?edit=${item._id}`} title="Edit"
                        className="w-9 h-9 flex items-center justify-center rounded-lg border text-[#1a3a8a] hover:bg-[#f0f4ff] transition"
                        style={{ borderColor: '#b8c9e8' }}>
                        <Edit size={15} />
                      </Link>
                      <button type="button" title="Delete" onClick={() => handleDelete(item._id)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg border text-[#ff4d4f] hover:bg-red-50 transition"
                        style={{ borderColor: '#ffc9c9' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > perPage && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t bg-white" style={{ borderColor: CARD_BORDER }}>
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className={`p-2 rounded-lg disabled:opacity-40 transition ${btnOutline}`}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => typeof p === 'string' ? (
                  <span key={`gap-${i}`} className="w-8 text-center text-gray-400 text-sm">…</span>
                ) : (
                  <button key={p} type="button" onClick={() => setPage(p)}
                    className={`min-w-9 h-9 px-1 rounded-lg text-sm font-medium transition ${page === p ? btnNavy : btnOutline}`}>
                    {p}
                  </button>
                ))}
              <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className={`p-2 rounded-lg disabled:opacity-40 transition ${btnOutline}`}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {stockProduct && (
        <ProductStockUpdateModal
          product={stockProduct}
          onClose={() => setStockProduct(null)}
          onSaved={handleStockSaved}
        />
      )}
    </div>
  );
}
