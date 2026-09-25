import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Star, ThumbsUp, ThumbsDown, Meh, Eye, Edit, Trash2,
  Download, ChevronDown, Filter, Calendar, X,
} from 'lucide-react';
import api from '../api/axios';
import { downloadFile } from '../api/download';
import AdminListLayout from '../components/AdminListLayout';
import ViewableImage from '../components/ViewableImage';
import ProductReviewDetailModal from '../components/ProductReviewDetailModal';
import { useListPagination } from '../hooks/useListPagination';
import {
  LIST_NAVY, LIST_CARD_BORDER, listBtnNavy, listBtnOutline,
  listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass,
} from '../constants/listTheme';

const STATUS_STYLE = {
  Approved: 'bg-green-100 text-green-700',
  Pending: 'bg-orange-100 text-orange-700',
  Rejected: 'bg-red-100 text-red-700',
};

const EMPTY_FILTERS = { store: '', category: '', rating: '', status: '', dateFrom: '', dateTo: '' };

function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local[0]}***@${domain}`;
}

function StarRating({ n }) {
  return (
    <span className="text-amber-400 text-sm tracking-tight">
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  );
}

function applyClientFilters(list, { store, category, rating, status, dateFrom, dateTo, search }) {
  let result = [...list];
  if (store) result = result.filter(i => i.store === store);
  if (category) result = result.filter(i => i.category === category);
  if (rating) result = result.filter(i => i.rating === parseInt(rating, 10));
  if (status) result = result.filter(i => i.status === status);
  if (dateFrom) {
    const from = new Date(dateFrom).getTime();
    result = result.filter(i => i.dateIso && new Date(i.dateIso).getTime() >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo).getTime() + 86400000 - 1;
    result = result.filter(i => i.dateIso && new Date(i.dateIso).getTime() <= to);
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(i =>
      i.productName.toLowerCase().includes(q) ||
      i.customerName.toLowerCase().includes(q) ||
      (i.customerEmail || '').toLowerCase().includes(q) ||
      (i.productSku || '').toLowerCase().includes(q)
    );
  }
  return result;
}

export default function ProductReviewPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [editOnOpen, setEditOnOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const stopRow = (e) => e.stopPropagation();

  const loadItems = useCallback(() => {
    api.get('/product-reviews').then(r => {
      setItems((r.data || []).map((item, i) => ({
        ...item,
        store: item.store || 'Krishiv Ethnic Wear',
        category: item.category || 'General',
        reviewImages: item.reviewImages || [],
        dateIso: item.dateIso || `2025-09-${String(1 + (i % 18)).padStart(2, '0')}T12:00:00`,
      })));
    }).catch(() => {});
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const stores = useMemo(() => [...new Set(items.map(i => i.store).filter(Boolean))].sort(), [items]);
  const categories = useMemo(() => [...new Set(items.map(i => i.category).filter(Boolean))].sort(), [items]);

  const positive = items.filter(i => i.rating >= 4).length;
  const neutral = items.filter(i => i.rating === 3).length;
  const negative = items.filter(i => i.rating <= 2).length;

  const filtered = useMemo(
    () => applyClientFilters(items, { ...filters, search }),
    [items, filters, search]
  );

  const { page, setPage, perPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [filters, search] });

  const updateFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));

  const runSearch = () => setSearch(searchInput.trim());

  const applyFilters = () => {
    setSearch(searchInput.trim());
    setShowDatePicker(false);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
    setSearchInput('');
    setShowDatePicker(false);
  };

  const openView = (item, edit = false) => { setEditOnOpen(edit); setViewItem(item); };

  const handleSaveReview = async (payload) => {
    const { data } = await api.put(`/product-reviews/${viewItem._id}`, payload);
    setItems(prev => prev.map(i => i._id === data._id ? data : i));
    setViewItem(data);
  };

  const updateStatus = async (id, status) => {
    const { data } = await api.put(`/product-reviews/${id}`, { status });
    setItems(prev => prev.map(i => i._id === id ? data : i));
    if (viewItem?._id === id) setViewItem(data);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this review?')) return;
    await api.delete(`/product-reviews/${id}`);
    setItems(prev => prev.filter(i => i._id !== id));
    setSelected(prev => prev.filter(x => x !== id));
    if (viewItem?._id === id) setViewItem(null);
  };

  const handleBulkDelete = async () => {
    if (!selected.length) return alert('Pehle reviews select karein');
    if (!confirm(`Delete ${selected.length} selected review(s)?`)) return;
    await Promise.all(selected.map(id => api.delete(`/product-reviews/${id}`)));
    setItems(prev => prev.filter(i => !selected.includes(i._id)));
    setSelected([]);
  };

  const handleExport = () => downloadFile('/product-reviews/export', 'product_reviews.csv');

  const toggleAll = () => {
    const ids = paginated.map(i => i._id);
    const allOn = ids.every(id => selected.includes(id));
    setSelected(allOn ? selected.filter(id => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
  };

  const dateLabel = filters.dateFrom || filters.dateTo
    ? `${filters.dateFrom || '...'} – ${filters.dateTo || '...'}`
    : 'Select date range';

  const statCards = [
    { label: 'Total Reviews', count: items.length, icon: Star, bg: 'bg-blue-50', color: 'text-blue-600' },
    { label: 'Positive', count: positive, icon: ThumbsUp, bg: 'bg-green-50', color: 'text-green-600' },
    { label: 'Neutral', count: neutral, icon: Meh, bg: 'bg-orange-50', color: 'text-orange-600' },
    { label: 'Negative', count: negative, icon: ThumbsDown, bg: 'bg-red-50', color: 'text-red-600' },
  ];

  const hasActiveFilters = Object.values(filters).some(Boolean) || search;

  return (
    <>
      <AdminListLayout
        breadcrumb={<>Dashboard &gt; Product Setup &gt; <span className="text-gray-600">Product Review</span></>}
        title="Product Review"
        icon={Star}
        count={filtered.length}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={runSearch}
        searchPlaceholder="Search by product name or customer name..."
        page={page}
        totalPages={totalPages}
        total={total}
        perPage={perPage}
        onPageChange={setPage}
        isEmpty={paginated.length === 0}
        emptyMessage="Koi review nahi mila — filters reset karein"
        beforeCard={(
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-1">
            {statCards.map(s => (
              <div key={s.label} className="bg-white border rounded-xl p-4 flex items-center gap-3 shadow-sm" style={{ borderColor: LIST_CARD_BORDER }}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.bg}`}>
                  <s.icon size={18} className={s.color} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{s.count}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        headerActions={(
          <>
            {selected.length > 0 && (
              <button type="button" onClick={handleBulkDelete}
                className="flex items-center gap-1 px-3 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">
                <Trash2 size={14} /> Delete ({selected.length})
              </button>
            )}
            <button type="button" onClick={handleExport}
              className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${listBtnOutline}`}>
              <Download size={14} /> Export <ChevronDown size={12} />
            </button>
          </>
        )}
        filterBar={(
          <>
        <div className="shrink-0 grid grid-cols-2 md:grid-cols-5 gap-3 px-6 pt-4 border-b" style={{ borderColor: LIST_CARD_BORDER }}>
          <select value={filters.store} onChange={e => updateFilter('store', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary-500/30">
            <option value="">All stores</option>
            {stores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.category} onChange={e => updateFilter('category', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary-500/30">
            <option value="">All category</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filters.rating} onChange={e => updateFilter('rating', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary-500/30">
            <option value="">All rating</option>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>)}
          </select>
          <select value={filters.status} onChange={e => updateFilter('status', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary-500/30">
            <option value="">All status</option>
            <option>Approved</option><option>Pending</option><option>Rejected</option>
          </select>
          <div className="relative">
            <button type="button" onClick={() => setShowDatePicker(v => !v)}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition ${
                filters.dateFrom || filters.dateTo ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              <Calendar size={14} />
              <span className="truncate text-xs">{dateLabel}</span>
            </button>
            {showDatePicker && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-64 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">Date Range</p>
                  <button type="button" onClick={() => setShowDatePicker(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">From</label>
                  <input type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">To</label>
                  <input type="date" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none" />
                </div>
                <button type="button" onClick={() => { updateFilter('dateFrom', ''); updateFilter('dateTo', ''); }}
                  className="text-xs text-gray-500 hover:text-gray-700">Clear dates</button>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-wrap gap-2 px-6 py-3 border-b" style={{ borderColor: LIST_CARD_BORDER, backgroundColor: '#fafbfd' }}>
          <button type="button" onClick={resetFilters}
            className={`px-4 py-2.5 rounded-lg text-sm transition ${listBtnOutline}`}>
            Reset
          </button>
          <button type="button" onClick={applyFilters}
            className={`flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition ${listBtnNavy}`}>
            <Filter size={14} /> Filter
          </button>
          {hasActiveFilters && (
            <span className="text-xs text-gray-500 self-center ml-1">
              Showing <b className="text-gray-800">{filtered.length}</b> of {items.length} reviews —
              <button type="button" onClick={resetFilters} className="ml-1 hover:underline" style={{ color: LIST_NAVY }}>Clear all</button>
            </span>
          )}
        </div>
          </>
        )}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className={listTheadClass} style={listTheadStyle}>
              <th className={`${listThClass} w-10`}>
                <input type="checkbox" checked={paginated.length > 0 && paginated.every(i => selected.includes(i._id))} onChange={toggleAll} />
              </th>
              <th className={`${listThClass} w-14`}>#</th>
              <th className={listThClass}>Product</th>
              <th className={listThClass}>Customer</th>
              <th className={listThClass}>Rating</th>
              <th className={listThClass}>Review</th>
              <th className={listThClass}>Images</th>
              <th className={listThClass}>Date</th>
              <th className={listThClass}>Status</th>
              <th className={listThClass}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, i) => (
              <tr key={item._id} className={listRowClass} style={listRowStyle}>
                <td className={listTdClass} onClick={stopRow}>
                  <input type="checkbox" checked={selected.includes(item._id)}
                    onChange={() => setSelected(prev => prev.includes(item._id) ? prev.filter(x => x !== item._id) : [...prev, item._id])} />
                </td>
                <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
                <td className={listTdClass}>
                  <div className="flex items-center gap-2.5 min-w-[180px]">
                    <ViewableImage src={item.productImage} title={item.productName} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0 border border-gray-100" />
                    <div>
                      <p className="font-medium text-gray-800 leading-tight line-clamp-2">{item.productName}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {item.productCode ? `Code: ${item.productCode}` : `SKU: ${item.productSku}`}
                      </p>
                    </div>
                  </div>
                </td>
                <td className={listTdClass}>
                  <p className="font-medium text-gray-800">{item.customerName}</p>
                  <p className="text-xs text-gray-400">{maskEmail(item.customerEmail)}</p>
                </td>
                <td className={listTdClass}><StarRating n={item.rating} /></td>
                <td className={`${listTdClass} text-gray-600 max-w-[180px] truncate`} title={item.review}>{item.review}</td>
                <td className={listTdClass}>
                  <div className="flex gap-1">
                    {(item.reviewImages || []).slice(0, 3).map((img, idx) => (
                      <ViewableImage key={idx} src={img} images={item.reviewImages} index={idx} alt="" className="w-9 h-9 rounded object-cover border border-gray-100" />
                    ))}
                    {!(item.reviewImages || []).length && <span className="text-gray-300 text-xs">—</span>}
                  </div>
                </td>
                <td className={`${listTdClass} text-gray-500 text-xs whitespace-nowrap`}>{item.reviewDate || item.date}</td>
                <td className={listTdClass} onClick={stopRow}>
                  <select
                    value={item.status}
                    onChange={e => updateStatus(item._id, e.target.value)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border-0 outline-none cursor-pointer ${STATUS_STYLE[item.status] || 'bg-gray-100'}`}
                  >
                    <option>Approved</option><option>Pending</option><option>Rejected</option>
                  </select>
                </td>
                <td className={listTdClass} onClick={stopRow}>
                  <div className="flex gap-1">
                    <button type="button" title="View" onClick={() => openView(item, false)}
                      className="p-1.5 border border-gray-200 text-gray-600 rounded hover:bg-gray-50 transition">
                      <Eye size={14} />
                    </button>
                    <button type="button" title="Edit" onClick={() => openView(item, true)}
                      className="p-1.5 border border-blue-200 text-blue-600 rounded hover:bg-blue-50 transition">
                      <Edit size={14} />
                    </button>
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
        <ProductReviewDetailModal
          item={viewItem}
          startEditing={editOnOpen}
          onClose={() => { setViewItem(null); setEditOnOpen(false); }}
          onSave={handleSaveReview}
        />
      )}
    </>
  );
}
