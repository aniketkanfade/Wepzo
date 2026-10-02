import { useState, useEffect } from 'react';
import { Image, Plus, Heart, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import AdminListLayout from './components/AdminListLayout';
import ViewableImage from './components/ViewableImage';
import ProductPreviewModal from './components/ProductPreviewModal';
import { useListPagination } from '../../hooks/useListPagination';
import { LIST_CARD_BORDER, listBtnNavy, listBtnOutline } from '../../constants/listTheme';

export default function ProductGalleryPage() {
  const [items, setItems] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [store, setStore] = useState('');
  const [category, setCategory] = useState('');
  const [previewProduct, setPreviewProduct] = useState(null);

  useEffect(() => { api.get('/product-items?gallery=true').then(r => setItems(r.data)).catch(() => {}); }, []);

  const filtered = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchStore = !store || i.store === store;
    const matchCat = !category || i.mainCategory === category;
    return matchSearch && matchStore && matchCat;
  });
  const stores = [...new Set(items.map(i => i.store))];
  const categories = [...new Set(items.map(i => i.mainCategory))];
  const { page, setPage, perPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [search, store, category] });

  const applySearch = () => setSearch(searchInput.trim());

  return (
    <>
      <AdminListLayout
        breadcrumb={<>Dashboard &gt; Product Setup &gt; <span className="text-gray-600">Product Gallery</span></>}
        title="Product Gallery"
        icon={Image}
        count={filtered.length}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={applySearch}
        searchPlaceholder="Search by product name..."
        page={page}
        totalPages={totalPages}
        total={total}
        perPage={perPage}
        onPageChange={setPage}
        isEmpty={paginated.length === 0}
        emptyMessage="Koi product nahi mila"
        headerActions={(
          <>
            <select value={store} onChange={e => setStore(e.target.value)}
              className="border rounded-lg px-3 py-2.5 text-sm bg-white outline-none" style={{ borderColor: '#e0e4ec' }}>
              <option value="">All stores</option>
              {stores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="border rounded-lg px-3 py-2.5 text-sm bg-white outline-none" style={{ borderColor: '#e0e4ec' }}>
              <option value="">All category</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}
        footerBar={(
          <Link to="/products/setup/add"
            className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${listBtnNavy}`}>
            <Plus size={16} /> Add New Item
          </Link>
        )}
      >
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {paginated.map(item => (
            <div key={item._id} className="border rounded-xl overflow-hidden hover:shadow-md transition bg-white" style={{ borderColor: LIST_CARD_BORDER }}>
              <div className="relative p-2">
                <button type="button" className="absolute top-2 left-2 p-1 bg-white rounded-full shadow text-gray-400 hover:text-red-500"><Heart size={14} /></button>
                <button type="button" className="absolute top-2 right-2 p-1 bg-white rounded-full shadow text-gray-400"><MoreVertical size={14} /></button>
                <ViewableImage
                  src={item.image}
                  images={[item.image, ...(item.images || [])].filter(Boolean)}
                  title={item.name}
                  alt={item.name}
                  className="w-full aspect-square object-cover rounded-lg bg-gray-50"
                />
              </div>
              <div className="px-3 pb-3">
                <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                <p className="text-xs text-gray-400 truncate">{item.mainCategory}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">{(item.tags || []).slice(0, 2).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{t}</span>)}</div>
                <div className="flex gap-1.5 mt-2">
                  <button type="button" onClick={() => setPreviewProduct(item)}
                    className={`flex-1 py-1.5 border rounded text-xs text-gray-600 hover:bg-gray-50 transition ${listBtnOutline}`}>
                    View
                  </button>
                  <Link to={`/products/setup/add?edit=${item._id}`}
                    className={`flex-1 py-1.5 rounded text-xs text-center ${listBtnNavy}`}>
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AdminListLayout>

      {previewProduct && (
        <ProductPreviewModal product={previewProduct} onClose={() => setPreviewProduct(null)} />
      )}
    </>
  );
}
