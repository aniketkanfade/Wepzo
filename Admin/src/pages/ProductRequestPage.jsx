import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, Plus, Eye, Check, X, Edit, Trash2 } from 'lucide-react';
import api from '../api/axios';
import AdminListLayout from '../components/AdminListLayout';
import ViewableImage from '../components/ViewableImage';
import ProductRequestDetailModal from '../components/ProductRequestDetailModal';
import { useListPagination } from '../hooks/useListPagination';
import { LIST_NAVY, LIST_TEAL, LIST_CARD_BORDER, listBtnNavy, listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass } from '../constants/listTheme';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
];

export default function ProductRequestPage() {
  const [items, setItems] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [viewItem, setViewItem] = useState(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'rejected' ? 'rejected' : 'pending';
  const stopRow = (e) => e.stopPropagation();

  const loadItems = () => {
    api.get('/product-requests').then(r => setItems(r.data)).catch(() => {});
  };

  useEffect(() => { loadItems(); }, []);

  const viewId = searchParams.get('view');
  useEffect(() => {
    if (!viewId) return;
    api.get('/product-requests').then(r => {
      setItems(r.data);
      const item = r.data.find(i => i._id === viewId);
      if (item) setViewItem(item);
    }).finally(() => {
      setSearchParams({}, { replace: true });
    });
  }, [viewId, setSearchParams]);

  const pendingItems = items.filter(i => i.status === 'Pending');
  const rejectedItems = items.filter(i => i.status === 'Rejected');
  const tabItems = activeTab === 'rejected' ? rejectedItems : pendingItems;

  const filtered = tabItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.sku || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.brand || '').toLowerCase().includes(search.toLowerCase())
  );

  const { page, setPage, perPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [search, activeTab] });

  const setTab = (key) => {
    setSearch('');
    setSearchInput('');
    setViewItem(null);
    setSearchParams(key === 'rejected' ? { tab: 'rejected' } : {}, { replace: true });
  };

  const handleApprove = async (item) => {
    if (!confirm(`Approve "${item.name}" and add to product list?`)) return;
    try {
      await api.post(`/product-requests/${item._id}/approve`);
      setItems(prev => prev.filter(i => i._id !== item._id));
      if (viewItem?._id === item._id) setViewItem(null);
    } catch { /* ignore */ }
  };

  const handleReject = async (item) => {
    if (!confirm(`Reject "${item.name}"?`)) return;
    try {
      const { data } = await api.post(`/product-requests/${item._id}/reject`);
      setItems(prev => prev.map(i => i._id === data._id ? data : i));
      if (viewItem?._id === item._id) setViewItem(null);
    } catch { /* ignore */ }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this request?')) return;
    await api.delete(`/product-requests/${id}`);
    setItems(prev => prev.filter(i => i._id !== id));
    if (viewItem?._id === id) setViewItem(null);
  };

  const openEdit = (item) => {
    setViewItem(null);
    navigate(`/products/setup/add?requestEdit=${item._id}`);
  };

  const isPendingTab = activeTab === 'pending';

  const statCards = [
    { label: 'Pending', count: pendingItems.length, color: 'bg-orange-50 text-orange-600' },
    { label: 'Rejected', count: rejectedItems.length, color: 'bg-red-50 text-red-600' },
  ];

  return (
    <>
      <AdminListLayout
        breadcrumb={<>Dashboard &gt; Product Setup &gt; <span className="text-gray-600">New Item Requests</span></>}
        title="New Item Requests"
        icon={Bell}
        count={filtered.length}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => setSearch(searchInput.trim())}
        searchPlaceholder="Search item name, SKU or brand..."
        page={page}
        totalPages={totalPages}
        total={total}
        perPage={perPage}
        onPageChange={setPage}
        isEmpty={paginated.length === 0}
        emptyMessage={isPendingTab ? 'Koi pending request nahi hai.' : 'Koi rejected request nahi hai.'}
        beforeCard={(
          <div className="grid grid-cols-2 gap-4 px-1">
            {statCards.map(s => (
              <div key={s.label} className="bg-white border rounded-xl p-4 flex items-center gap-3" style={{ borderColor: LIST_CARD_BORDER }}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${s.color}`}>{s.count}</div>
                <span className="text-sm text-gray-600">{s.label}</span>
              </div>
            ))}
          </div>
        )}
        filterBar={(
          <div className="shrink-0 flex gap-1 px-6 pt-4 border-b" style={{ borderColor: LIST_CARD_BORDER }}>
            {TABS.map(tab => {
              const count = tab.key === 'pending' ? pendingItems.length : rejectedItems.length;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition -mb-px ${
                    active ? 'bg-[#f8faff]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  style={active ? { borderColor: LIST_NAVY, color: LIST_NAVY } : undefined}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={active ? { backgroundColor: '#eef2f8', color: LIST_NAVY } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        footerBar={(
          <button type="button" className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${listBtnNavy}`}>
            <Plus size={16} /> New Item Request
          </button>
        )}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className={listTheadClass} style={listTheadStyle}>
              <th className={`${listThClass} w-10`}><input type="checkbox" /></th>
              <th className={`${listThClass} w-14`}>#</th>
              <th className={listThClass}>Image</th>
              <th className={listThClass}>Item Name</th>
              <th className={listThClass}>Store</th>
              <th className={listThClass}>Category</th>
              <th className={listThClass}>Price</th>
              <th className={listThClass}>{isPendingTab ? 'Requested On' : 'Rejected On'}</th>
              <th className={listThClass}>Status</th>
              <th className={listThClass}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, i) => (
              <tr key={item._id} className={listRowClass} style={listRowStyle}>
                <td className={listTdClass} onClick={stopRow}><input type="checkbox" /></td>
                <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
                <td className={listTdClass} onClick={stopRow}>
                  <ViewableImage src={item.image} images={[item.image].filter(Boolean)} title={item.name} alt="" className="w-10 h-10 rounded-lg object-cover" />
                </td>
                <td className={`${listTdClass} font-medium`}>{item.name}</td>
                <td className={listTdClass}>
                  <span className="font-medium text-sm" style={{ color: LIST_TEAL }}>{item.store}</span>
                </td>
                <td className={listTdClass}>{item.mainCategory}</td>
                <td className={`${listTdClass} tabular-nums`}>₹ {item.price?.toLocaleString('en-IN')}</td>
                <td className={`${listTdClass} text-gray-500`}>{isPendingTab ? item.requestedOn : (item.rejectedOn || '—')}</td>
                <td className={listTdClass}>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    item.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>{item.status}</span>
                </td>
                <td className={listTdClass} onClick={stopRow}>
                  <div className="flex gap-1">
                    <button type="button" title="View" onClick={() => setViewItem(item)}
                      className="p-1.5 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 hover:text-[#1a3a8a] transition">
                      <Eye size={14} />
                    </button>
                    {isPendingTab && (
                      <>
                        <button type="button" title="Approve" onClick={() => handleApprove(item)}
                          className="p-1.5 border border-green-200 text-green-600 rounded hover:bg-green-50 transition">
                          <Check size={14} />
                        </button>
                        <button type="button" title="Reject" onClick={() => handleReject(item)}
                          className="p-1.5 border border-red-200 text-red-500 rounded hover:bg-red-50 transition">
                          <X size={14} />
                        </button>
                        <button type="button" title="Edit" onClick={() => openEdit(item)}
                          className="p-1.5 border border-blue-200 text-blue-600 rounded hover:bg-blue-50 transition">
                          <Edit size={14} />
                        </button>
                      </>
                    )}
                    <button type="button" title="Delete" onClick={() => handleDelete(item._id)}
                      className="p-1.5 border border-red-200 text-red-500 rounded hover:bg-red-50 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminListLayout>

      {viewItem && (
        <ProductRequestDetailModal
          item={viewItem}
          onClose={() => setViewItem(null)}
          onApprove={isPendingTab && viewItem.status === 'Pending' ? handleApprove : undefined}
          onReject={isPendingTab && viewItem.status === 'Pending' ? handleReject : undefined}
          onEdit={isPendingTab ? openEdit : undefined}
        />
      )}
    </>
  );
}
