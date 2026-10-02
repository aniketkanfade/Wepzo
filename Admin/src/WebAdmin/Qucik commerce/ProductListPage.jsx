import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight, Edit, Trash2, Plus, Filter, Lock, ShoppingBag } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { downloadFile } from '../../api/download';
import ProductStockUpdateModal from './components/ProductStockUpdateModal';
import SearchDataFilterDrawer from './components/SearchDataFilterDrawer';
import ViewableImage from './components/ViewableImage';
import { useDeliveryZones } from '../../hooks/useDeliveryZones';
import NavyToggle from './components/NavyToggle';
import { LIST_NAVY as NAVY, LIST_TEAL as TEAL, LIST_PAGE_BG as PAGE_BG, LIST_CARD_BORDER as CARD_BORDER, LIST_PER_PAGE as perPage, listBtnNavy, listBtnOutline, listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass } from '../../constants/listTheme';
const EMPTY_FILTERS = { storeId: '', zone: '', category: '', subCategory: '' };
const FILTER_STORAGE_KEY = 'wepzo-item-list-filters';

function loadSavedFilters() {
  try {
    const saved = JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY) || 'null');
    if (!saved?.locked) return null;
    return {
      filters: { ...EMPTY_FILTERS, ...(saved.filters || {}) },
      search: saved.search || '',
    };
  } catch {
    return null;
  }
}

function saveFilters(filters, locked, search) {
  if (!locked) {
    localStorage.removeItem(FILTER_STORAGE_KEY);
    return;
  }
  localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ filters, locked: true, search }));
}

function clearSavedFilters() {
  localStorage.removeItem(FILTER_STORAGE_KEY);
}

function applyFilters(list, filters, search, storeZoneMap, storeNameMap) {
  let result = [...list];
  if (filters.storeId) {
    result = result.filter(i => String(i.storeId) === String(filters.storeId));
  } else if (filters.store) {
    result = result.filter(i => i.store === filters.store);
  }
  if (filters.zone) {
    result = result.filter(i => {
      const zone = storeZoneMap[i.storeId] || storeZoneMap[i.store];
      return zone === filters.zone;
    });
  }
  if (filters.category) result = result.filter(i => i.mainCategory === filters.category);
  if (filters.subCategory) result = result.filter(i => i.subCategory === filters.subCategory);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.productCode || '').toLowerCase().includes(q) ||
      (i.sku || '').toLowerCase().includes(q) ||
      (i.store || '').toLowerCase().includes(q)
    );
  }
  return result;
}

export default function ProductListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topSelling = searchParams.get('filter') === 'top-selling';
  const [items, setItems] = useState([]);
  const [storeList, setStoreList] = useState([]);
  const [storeZoneMap, setStoreZoneMap] = useState({});
  const [storeNameMap, setStoreNameMap] = useState({});
  const [subCategories, setSubCategories] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const savedOnMount = loadSavedFilters();
  const [draftFilters, setDraftFilters] = useState(savedOnMount?.filters || EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(savedOnMount?.filters || EMPTY_FILTERS);
  const [filtersLocked, setFiltersLocked] = useState(!!savedOnMount);
  const [searchInput, setSearchInput] = useState(savedOnMount?.search || '');
  const [search, setSearch] = useState(savedOnMount?.search || '');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [page, setPage] = useState(1);
  const [stockProduct, setStockProduct] = useState(null);
  const { names: zoneNames } = useDeliveryZones();

  const stopRow = (e) => e.stopPropagation();

  const load = useCallback(() => {
    const productUrl = topSelling ? '/product-items?topSelling=true' : '/product-items';
    api.get(productUrl).then(r => {
      const list = r.data || [];
      setItems(topSelling ? list.filter(p => (p.sold || 0) > 0) : list);
    }).catch(() => {});
    api.get('/product-requests').then(r => {
      setPendingCount(r.data.filter(i => i.status === 'Pending').length);
    }).catch(() => {});
    api.get('/stores', { params: { filter: 'list' } }).then(r => {
      const zoneMap = {};
      const nameMap = {};
      r.data.forEach(s => {
        zoneMap[s.storeId] = s.zone || s.area || '';
        zoneMap[s.name] = s.zone || s.area || '';
        nameMap[s.storeId] = s.name;
      });
      setStoreList(r.data);
      setStoreZoneMap(zoneMap);
      setStoreNameMap(nameMap);
    }).catch(() => {});
    api.get('/sub-categories').then(r => setSubCategories(r.data)).catch(() => {});
  }, [topSelling]);

  useEffect(() => { load(); }, [load]);

  const storeOptions = useMemo(
    () => storeList.map(s => ({ value: String(s.storeId), label: `${s.name} (ID: ${s.storeId})` })),
    [storeList]
  );
  const categories = useMemo(() => [...new Set(items.map(i => i.mainCategory).filter(Boolean))].sort(), [items]);

  const filtered = useMemo(
    () => applyFilters(items, appliedFilters, search, storeZoneMap, storeNameMap),
    [items, appliedFilters, search, storeZoneMap, storeNameMap]
  );
  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [appliedFilters, search]);

  const openFilterDrawer = () => {
    setDraftFilters(appliedFilters);
    setShowFilterDrawer(true);
  };

  const updateDraft = (key, value) => {
    setDraftFilters(f => {
      const next = { ...f, [key]: value };
      if (key === 'category' && value !== f.category) next.subCategory = '';
      return next;
    });
  };

  const applyFilterAction = () => {
    const locked = Object.values(draftFilters).some(Boolean);
    const nextSearch = searchInput.trim();
    setAppliedFilters(draftFilters);
    setFiltersLocked(locked);
    setSearch(nextSearch);
    saveFilters(draftFilters, locked, nextSearch);
    setShowFilterDrawer(false);
  };

  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setFiltersLocked(false);
    setSearchInput('');
    setSearch('');
    clearSavedFilters();
    setPage(1);
  };

  const hasActiveFilters = filtersLocked || Object.values(appliedFilters).some(Boolean);

  const toggleStatus = async (id, status) => {
    const { data } = await api.put(`/product-items/${id}`, { status });
    setItems(prev => prev.map(i => i._id === id ? data : i));
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/product-items/${id}`);
    setItems(prev => prev.filter(i => i._id !== id));
  };

  const handleStockSaved = (updated) => {
    setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
  };

  const runSearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const filterLabels = [
    appliedFilters.storeId && `Store: ${storeNameMap[appliedFilters.storeId] || appliedFilters.storeId} (ID: ${appliedFilters.storeId})`,
    appliedFilters.store && !appliedFilters.storeId && `Store: ${appliedFilters.store}`,
    appliedFilters.zone && `Zone: ${appliedFilters.zone}`,
    appliedFilters.category && `Category: ${appliedFilters.category}`,
    appliedFilters.subCategory && `Sub: ${appliedFilters.subCategory}`,
  ].filter(Boolean);

  const btnNavy = listBtnNavy;
  const btnOutline = listBtnOutline;

  return (
    <div className="space-y-4 -m-1 p-1 min-h-full" style={{ backgroundColor: PAGE_BG }}>
      <div
        className="flex flex-col max-h-[calc(100vh-7rem)] rounded-xl border shadow-sm overflow-hidden bg-white"
        style={{ borderColor: CARD_BORDER }}
      >
        {/* Header row */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b" style={{ borderColor: CARD_BORDER }}>
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={20} style={{ color: NAVY }} strokeWidth={2.25} />
            <h1 className="text-lg font-bold tracking-tight" style={{ color: NAVY }}>
              {topSelling ? 'Top Selling Products' : 'Item List'}
            </h1>
            <span
              className="text-sm font-medium px-3 py-0.5 rounded-full min-w-[2rem] text-center tabular-nums"
              style={{ backgroundColor: '#eef2f8', color: NAVY }}
              title={search || hasActiveFilters ? `${filtered.length} of ${items.length} products` : `${items.length} products`}
            >
              {filtered.length}
            </span>
          </div>

          <div className="flex flex-1 max-w-lg mx-auto">
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              placeholder="Ex : search item by name"
              className="flex-1 pl-4 pr-2 py-2.5 border rounded-l-lg text-sm outline-none bg-white text-gray-700"
              style={{ borderColor: '#e0e4ec' }}
            />
            <button type="button" onClick={runSearch}
              className={`px-4 rounded-r-lg transition ${btnNavy}`}>
              <Search size={17} />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={openFilterDrawer}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition ${btnOutline}
                ${hasActiveFilters ? 'border-[#1a3a8a] text-[#1a3a8a] bg-[#f0f4ff]' : ''}`}>
              {filtersLocked ? <Lock size={14} /> : <Filter size={14} />}
              Filter
            </button>
            <button type="button" onClick={() => downloadFile('/product-items/export', 'products.csv')}
              className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${btnOutline}`}>
              Export <ChevronDown size={14} className="text-gray-400" />
            </button>
            <Link to="/products/setup/low-stock"
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition whitespace-nowrap ${btnNavy}`}>
              Low Stock List
            </Link>
          </div>
        </div>

        <div className="shrink-0 flex justify-end px-6 py-3 border-b" style={{ borderColor: CARD_BORDER, backgroundColor: '#fafbfd' }}>
          <Link to="/products/setup/requests"
            className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-sm whitespace-nowrap ${btnNavy}`}>
            New Product Request
            <span className="min-w-[22px] h-[22px] px-1.5 flex items-center justify-center bg-white/25 rounded text-xs font-bold">
              {pendingCount}
            </span>
          </Link>
        </div>

        {topSelling && (
          <div className="shrink-0 px-6 py-2.5 flex flex-wrap items-center gap-2 text-xs border-b bg-[#f0f4ff]" style={{ borderColor: CARD_BORDER }}>
            <span className="font-semibold" style={{ color: NAVY }}>Dashboard filter — sold products, revenue ke hisaab se sorted</span>
            <Link to="/products/setup/list" className="font-medium hover:underline ml-auto" style={{ color: NAVY }}>
              Clear filter / All items
            </Link>
          </div>
        )}

        {hasActiveFilters && (
          <div className="shrink-0 px-6 py-2.5 flex flex-wrap items-center gap-2 text-xs border-b bg-[#f0f4ff]" style={{ borderColor: CARD_BORDER }}>
            {filtersLocked && (
              <span className="inline-flex items-center gap-1 font-semibold" style={{ color: NAVY }}>
                <Lock size={11} /> Filters locked
              </span>
            )}
            {filterLabels.map(label => (
              <span key={label} className="px-2.5 py-1 bg-white border text-gray-700 rounded-md" style={{ borderColor: CARD_BORDER }}>{label}</span>
            ))}
            <span className="text-gray-500">
              — <b className="text-gray-800">{filtered.length}</b> of {items.length} items
            </span>
            <button type="button" onClick={resetFilters} className="font-medium hover:underline ml-auto" style={{ color: NAVY }}>
              Reset filters
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto dropdown-scroll">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className={listTheadClass} style={listTheadStyle}>
                <th className={`${listThClass} w-14`}>SI</th>
                <th className={`${listThClass} min-w-[220px]`}>Name</th>
                <th className={listThClass}>Category</th>
                <th className={`${listThClass} w-[96px]`}>Quantity</th>
                <th className={listThClass}>Store</th>
                {topSelling && <th className={`${listThClass} text-center`}>Sold</th>}
                {topSelling && <th className={listThClass}>Revenue</th>}
                <th className={listThClass}>Price</th>
                <th className={`${listThClass} text-center`}>Status</th>
                <th className={`${listThClass} w-24`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={topSelling ? 10 : 8} className="px-5 py-20 text-center text-gray-400">
                    Koi item nahi mila — filters reset karein
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
                        className="w-10 h-10 rounded-md object-cover bg-gray-100 shrink-0 border"
                        style={{ borderColor: CARD_BORDER }}
                      />
                      <Link to={`/products/setup/view/${item._id}`} onClick={stopRow}
                        className="font-semibold text-gray-800 truncate max-w-[200px] hover:text-primary-600 hover:underline">
                        {item.name}
                      </Link>
                    </div>
                  </td>
                  <td className={`${listTdClass} text-gray-600`}>{item.mainCategory}</td>
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
                  <td className={listTdClass}>
                    <span className="font-medium text-sm hover:underline" style={{ color: TEAL }} title={`Store ID: ${item.storeId || '—'}`}>
                      {item.store}{item.storeId ? ` (#${item.storeId})` : ''}
                    </span>
                  </td>
                  {topSelling && (
                    <td className={`${listTdClass} text-center tabular-nums font-semibold text-gray-800`}>{item.sold ?? 0}</td>
                  )}
                  {topSelling && (
                    <td className={`${listTdClass} font-semibold text-gray-800 tabular-nums`}>₹ {(item.revenue || 0).toLocaleString('en-IN')}</td>
                  )}
                  <td className={`${listTdClass} font-semibold text-gray-800 tabular-nums`}>
                    ₹ {item.price?.toLocaleString('en-IN')}
                  </td>
                  <td className={`${listTdClass} text-center`} onClick={stopRow}>
                    <div className="flex justify-center">
                      <NavyToggle checked={item.status} onChange={v => toggleStatus(item._id, v)} />
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

          <div
            className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t bg-white"
            style={{ borderColor: CARD_BORDER }}
          >
          <p className="text-sm text-gray-500">
            Showing {filtered.length ? (page - 1) * perPage + 1 : 0} to {Math.min(page * perPage, filtered.length)} of {filtered.length} entries
          </p>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className={`p-2 rounded-lg disabled:opacity-40 transition ${btnOutline}`}>
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => typeof p === 'string' ? (
                <span key={`gap-${i}`} className="w-8 text-center text-gray-400 text-sm">…</span>
              ) : (
                <button key={p} type="button" onClick={() => setPage(p)}
                  className={`min-w-9 h-9 px-1 rounded-lg text-sm font-medium transition
                    ${page === p ? btnNavy : btnOutline}`}>
                  {p}
                </button>
              ))}
            <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className={`p-2 rounded-lg disabled:opacity-40 transition ${btnOutline}`}>
              <ChevronRight size={16} />
            </button>
          </div>
          </div>
        </div>
      </div>

      <SearchDataFilterDrawer
        open={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        draft={draftFilters}
        onChange={updateDraft}
        onApply={applyFilterAction}
        onReset={resetFilters}
        stores={storeOptions}
        zones={zoneNames}
        categories={categories}
        subCategories={subCategories}
      />

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
