import { useState, useEffect } from 'react';
import { Star, MapPin, Phone } from 'lucide-react';
import api from '../api/axios';
import AdminListLayout from '../components/AdminListLayout';
import { useListPagination } from '../hooks/useListPagination';
import { LIST_TEAL, LIST_CARD_BORDER } from '../constants/listTheme';

export default function StoreRecommendedPage() {
  const [stores, setStores] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/stores', { params: { filter: 'recommended' } }).then(r => setStores(r.data)).catch(() => {});
  }, []);

  const filtered = stores.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const { page, setPage, perPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [search] });

  const toggleRecommend = async (storeId) => {
    const { data } = await api.post(`/stores/${storeId}/toggle-recommend`);
    if (!data.isRecommended) setStores(prev => prev.filter(s => String(s.storeId) !== String(storeId)));
    else setStores(prev => prev.map(s => String(s.storeId) === String(data.storeId) ? data : s));
  };

  return (
    <AdminListLayout
      breadcrumb={<>Dashboard &gt; Store Management &gt; <span className="text-gray-600">Recommended Store</span></>}
      title="Recommended Stores"
      icon={Star}
      count={filtered.length}
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      onSearchSubmit={() => setSearch(searchInput.trim())}
      searchPlaceholder="Search store name..."
      page={page}
      totalPages={totalPages}
      total={total}
      perPage={perPage}
      onPageChange={setPage}
      isEmpty={paginated.length === 0}
      emptyMessage="Koi recommended store nahi"
    >
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginated.map(s => (
          <div key={s._id} className="relative border rounded-xl p-4 shadow-sm bg-gradient-to-br from-violet-50/50 to-white" style={{ borderColor: '#e8e0f5' }}>
            <div className="absolute top-3 right-3">
              <button type="button" onClick={() => toggleRecommend(s.storeId)} title="Remove from recommended"
                className="p-1.5 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition">
                <Star size={14} fill="currentColor" />
              </button>
            </div>
            <h3 className="font-bold text-gray-900 pr-8">{s.name}</h3>
            <p className="text-xs font-medium mt-0.5" style={{ color: LIST_TEAL }}>★ Recommended</p>
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              <p>{s.ownerName}</p>
              <p className="flex items-center gap-1.5 text-xs"><Phone size={11} /> {s.phone}</p>
              <p className="flex items-center gap-1.5 text-xs" style={{ color: LIST_TEAL }}><MapPin size={11} /> {s.area}</p>
            </div>
            <div className="flex gap-3 mt-3 pt-3 text-xs" style={{ borderTop: `1px solid ${LIST_CARD_BORDER}` }}>
              <span><strong>{s.productCount}</strong> products</span>
              <span><strong>{s.orderCount}</strong> orders</span>
            </div>
          </div>
        ))}
      </div>
    </AdminListLayout>
  );
}
