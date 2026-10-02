import { useState, useEffect } from 'react';
import { AlertTriangle, Edit, Trash2, Download, ChevronDown, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import AdminListLayout from './components/AdminListLayout';
import ViewableImage from './components/ViewableImage';
import { useListPagination } from '../../hooks/useListPagination';
import { LIST_TEAL, listBtnOutline, listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass } from '../../constants/listTheme';

export default function ProductLowStockPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const stopRow = (e) => e.stopPropagation();

  useEffect(() => { api.get('/product-items?lowStock=true').then(r => setItems(r.data)).catch(() => {}); }, []);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku || '').toLowerCase().includes(search.toLowerCase())
  );
  const { page, setPage, perPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [search] });

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/product-items/${id}`);
    setItems(prev => prev.filter(i => i._id !== id));
  };

  return (
    <AdminListLayout
      breadcrumb={<>Dashboard &gt; Product Setup &gt; <span className="text-gray-600">Low Stock List</span></>}
      title="Low Stock List"
      icon={AlertTriangle}
      count={filtered.length}
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      onSearchSubmit={() => setSearch(searchInput.trim())}
      searchPlaceholder="Ex : search item by name"
      page={page}
      totalPages={totalPages}
      total={total}
      perPage={perPage}
      onPageChange={setPage}
      isEmpty={paginated.length === 0}
      emptyMessage="Koi low stock item nahi mila"
      headerActions={(
        <button type="button" className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${listBtnOutline}`}>
          <Download size={14} /> Export <ChevronDown size={14} className="text-gray-400" />
        </button>
      )}
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className={listTheadClass} style={listTheadStyle}>
            <th className={`${listThClass} w-14`}>SI</th>
            <th className={listThClass}>Name</th>
            <th className={listThClass}>SKU</th>
            <th className={listThClass}>Category</th>
            <th className={listThClass}>Store</th>
            <th className={`${listThClass} w-[96px]`}>Quantity</th>
            <th className={listThClass}>Limit</th>
            <th className={listThClass}>Status</th>
            <th className={`${listThClass} w-24`}>Action</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((item, i) => (
            <tr key={item._id} onClick={() => navigate(`/products/setup/view/${item._id}`)} className={listRowClass} style={listRowStyle}>
              <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
              <td className={listTdClass} onClick={stopRow}>
                <div className="flex items-center gap-3 min-w-0">
                  <ViewableImage src={item.image} images={[item.image].filter(Boolean)} title={item.name} alt="" className="w-10 h-10 rounded-md object-cover border" style={{ borderColor: '#e8ecf3' }} />
                  <span className="font-semibold text-gray-800 truncate max-w-[200px]">{item.name}</span>
                </div>
              </td>
              <td className={`${listTdClass} text-gray-600`}>{item.sku}</td>
              <td className={`${listTdClass} text-gray-600`}>{item.mainCategory}</td>
              <td className={listTdClass}><span className="font-medium text-sm" style={{ color: LIST_TEAL }}>{item.store}</span></td>
              <td className={listTdClass} onClick={stopRow}>
                <div className="inline-grid grid-cols-[2.75rem_1.375rem] items-center gap-2">
                  <span className="text-right tabular-nums text-sm text-[#ff4d4f] font-semibold">{item.stock}</span>
                  <Link to={`/products/setup/view/${item._id}`} className="w-[22px] h-[22px] flex items-center justify-center bg-[#1a3a8a] text-white rounded-md" onClick={stopRow}>
                    <Plus size={13} strokeWidth={3} />
                  </Link>
                </div>
              </td>
              <td className={listTdClass}>{item.lowStockLimit}</td>
              <td className={listTdClass}>
                <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-xs font-semibold">Low Stock</span>
              </td>
              <td className={listTdClass} onClick={stopRow}>
                <div className="flex items-center gap-2">
                  <Link to={`/products/setup/add?edit=${item._id}`} title="Edit"
                    className="w-9 h-9 flex items-center justify-center rounded-lg border text-[#1a3a8a] hover:bg-[#f0f4ff]" style={{ borderColor: '#b8c9e8' }}>
                    <Edit size={15} />
                  </Link>
                  <button type="button" title="Delete" onClick={() => handleDelete(item._id)}
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
