import { useState, useEffect } from 'react';
import { Zap, Plus, Edit, Trash2 } from 'lucide-react';
import api from '../api/axios';
import AdminListLayout from '../components/AdminListLayout';
import SimpleFormModal from '../components/SimpleFormModal';
import { useListPagination } from '../hooks/useListPagination';
import { STATUS_STYLES } from '../constants/promotionModules';
import { LIST_TEAL, listBtnNavy, listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass } from '../constants/listTheme';

const FIELDS = [
  { key: 'title', label: 'Sale Title', required: true },
  { key: 'store', label: 'Store', type: 'select', options: ['All Stores', 'ShriKart', "Mummy's Food", 'Krishiv Ethnic Wear', 'FreshMart Sitabuldi', 'Tech Hub Store', 'Sweet Corner'] },
  { key: 'discount', label: 'Discount (%)', type: 'number', required: true },
  { key: 'products', label: 'Products Count', type: 'number' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'endDate', label: 'End Date' },
];

export default function FlashSalesPage() {
  const [items, setItems] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const stopRow = (e) => e.stopPropagation();

  useEffect(() => {
    api.get('/flash-sales').then(r => setItems(r.data)).catch(() => {});
  }, []);

  const filtered = items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()));
  const { page, setPage, perPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [search] });

  const openAdd = () => {
    setForm({ title: '', store: 'All Stores', discount: 10, products: 0, startDate: '', endDate: '', status: 'Scheduled' });
    setModal({ mode: 'add' });
  };

  const openEdit = (item) => {
    setForm({ ...item });
    setModal({ mode: 'edit', id: item._id });
  };

  const handleSave = async () => {
    if (!form.title || !form.discount) return alert('Title aur discount zaroori hai');
    try {
      if (modal.mode === 'edit') {
        const { data } = await api.put(`/flash-sales/${modal.id}`, form);
        setItems(prev => prev.map(i => i._id === data._id ? data : i));
      } else {
        const { data } = await api.post('/flash-sales', { ...form, status: 'Scheduled' });
        setItems(prev => [data, ...prev]);
      }
      setModal(null);
    } catch { alert('Save failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this flash sale?')) return;
    await api.delete(`/flash-sales/${id}`);
    setItems(prev => prev.filter(i => i._id !== id));
  };

  const toggleStatus = async (item) => {
    const next = item.status === 'Active' ? 'Ended' : 'Active';
    const { data } = await api.put(`/flash-sales/${item._id}`, { status: next });
    setItems(prev => prev.map(i => i._id === data._id ? data : i));
  };

  return (
    <>
      <AdminListLayout
        breadcrumb={<>Dashboard &gt; Order Management &gt; <span className="text-gray-600">Flash Sales</span></>}
        title="Flash Sales"
        icon={Zap}
        count={filtered.length}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => setSearch(searchInput.trim())}
        searchPlaceholder="Search flash sales..."
        page={page}
        totalPages={totalPages}
        total={total}
        perPage={perPage}
        onPageChange={setPage}
        isEmpty={paginated.length === 0}
        emptyMessage="Koi flash sale nahi mila"
        footerBar={(
          <button type="button" onClick={openAdd}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${listBtnNavy}`}>
            <Plus size={16} /> New Flash Sale
          </button>
        )}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className={listTheadClass} style={listTheadStyle}>
              <th className={`${listThClass} w-14`}>#</th>
              <th className={listThClass}>Title</th>
              <th className={listThClass}>Store</th>
              <th className={listThClass}>Discount</th>
              <th className={listThClass}>Products</th>
              <th className={listThClass}>Start</th>
              <th className={listThClass}>End</th>
              <th className={listThClass}>Status</th>
              <th className={listThClass}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((sale, i) => (
              <tr key={sale._id} className={listRowClass} style={listRowStyle}>
                <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
                <td className={`${listTdClass} font-semibold text-gray-900`}>{sale.title}</td>
                <td className={listTdClass}>
                  <span className="font-medium text-sm" style={{ color: LIST_TEAL }}>{sale.store}</span>
                </td>
                <td className={`${listTdClass} font-bold`} style={{ color: '#1a3a8a' }}>{sale.discount}%</td>
                <td className={listTdClass}>{sale.products}</td>
                <td className={`${listTdClass} text-gray-500 text-xs`}>{sale.startDate}</td>
                <td className={`${listTdClass} text-gray-500 text-xs`}>{sale.endDate}</td>
                <td className={listTdClass} onClick={stopRow}>
                  <button type="button" onClick={() => toggleStatus(sale)}
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer ${STATUS_STYLES[sale.status] || 'bg-gray-100'}`}>
                    {sale.status}
                  </button>
                </td>
                <td className={listTdClass} onClick={stopRow}>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openEdit(sale)} className="p-1.5 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50"><Edit size={14} /></button>
                    <button type="button" onClick={() => handleDelete(sale._id)} className="p-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminListLayout>

      {modal && (
        <SimpleFormModal
          title={modal.mode === 'edit' ? 'Edit Flash Sale' : 'New Flash Sale'}
          fields={FIELDS}
          values={form}
          onChange={(k, v) => setForm(prev => ({ ...prev, [k]: v }))}
          onSubmit={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
