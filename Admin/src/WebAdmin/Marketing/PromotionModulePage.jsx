import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import AdminListLayout from '../Qucik commerce/components/AdminListLayout';
import SimpleFormModal from '../Qucik commerce/components/SimpleFormModal';
import { useListPagination } from '../../hooks/useListPagination';
import { PROMOTION_MODULES, STATUS_STYLES } from './promotionModules';
import { listBtnNavy, listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass } from '../../constants/listTheme';

export default function PromotionModulePage() {
  const { module } = useParams();
  const config = PROMOTION_MODULES[module];
  const [items, setItems] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const stopRow = (e) => e.stopPropagation();

  useEffect(() => {
    if (!config) return;
    api.get(`/promotions/${config.type}`).then(r => setItems(r.data)).catch(() => {});
  }, [config]);

  if (!config) {
    return <div className="py-20 text-center text-gray-400">Promotion module not found</div>;
  }

  const Icon = config.icon;
  const filtered = items.filter(i =>
    Object.values(i).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
  );
  const { page, setPage, perPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [search] });

  const openAdd = () => {
    const init = {};
    config.fields.forEach(f => { init[f.key] = f.options?.[0] || ''; });
    setForm(init);
    setModal({ mode: 'add' });
  };

  const openEdit = (item) => {
    setForm({ ...item });
    setModal({ mode: 'edit', id: item._id });
  };

  const handleSave = async () => {
    const required = config.fields.filter(f => f.required);
    if (required.some(f => !form[f.key]?.toString().trim())) {
      alert('Required fields fill karein');
      return;
    }
    try {
      if (modal.mode === 'edit') {
        const { data } = await api.put(`/promotions/${config.type}/${modal.id}`, form);
        setItems(prev => prev.map(i => i._id === data._id ? data : i));
      } else {
        const { data } = await api.post(`/promotions/${config.type}`, form);
        setItems(prev => [data, ...prev]);
      }
      setModal(null);
    } catch {
      alert('Save failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete karna hai?')) return;
    await api.delete(`/promotions/${config.type}/${id}`);
    setItems(prev => prev.filter(i => i._id !== id));
  };

  const toggleStatus = async (item) => {
    const cycle = { Active: 'Inactive', Inactive: 'Active', Scheduled: 'Active', Draft: 'Scheduled', Paused: 'Active' };
    const next = cycle[item.status] || 'Active';
    const { data } = await api.put(`/promotions/${config.type}/${item._id}`, { status: next });
    setItems(prev => prev.map(i => i._id === data._id ? data : i));
  };

  return (
    <>
      <AdminListLayout
        breadcrumb={<>Dashboard &gt; Promotion Management &gt; <span className="text-gray-600">{config.breadcrumb}</span></>}
        title={config.title}
        icon={Icon}
        count={filtered.length}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => setSearch(searchInput.trim())}
        searchPlaceholder="Search..."
        page={page}
        totalPages={totalPages}
        total={total}
        perPage={perPage}
        onPageChange={setPage}
        isEmpty={paginated.length === 0}
        emptyMessage="Koi record nahi"
        footerBar={(
          <button type="button" onClick={openAdd}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${listBtnNavy}`}>
            <Plus size={16} /> Add New
          </button>
        )}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className={listTheadClass} style={listTheadStyle}>
              <th className={`${listThClass} w-14`}>#</th>
              {config.columns.map(c => <th key={c.key} className={listThClass}>{c.label}</th>)}
              <th className={listThClass}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, i) => (
              <tr key={item._id} className={listRowClass} style={listRowStyle}>
                <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
                {config.columns.map(col => (
                  <td key={col.key} className={`${listTdClass} ${col.className || ''}`}>
                    {col.badge ? (
                      <button type="button" onClick={() => toggleStatus(item)}
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer ${STATUS_STYLES[item[col.key]] || 'bg-gray-100 text-gray-600'}`}>
                        {item[col.key]}
                      </button>
                    ) : col.render ? col.render(item[col.key], item) : (item[col.key] ?? '—')}
                  </td>
                ))}
                <td className={listTdClass} onClick={stopRow}>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openEdit(item)} className="p-1.5 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50"><Edit size={14} /></button>
                    <button type="button" onClick={() => handleDelete(item._id)} className="p-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminListLayout>

      {modal && (
        <SimpleFormModal
          title={modal.mode === 'edit' ? `Edit ${config.title}` : `Add ${config.title}`}
          fields={config.fields}
          values={form}
          onChange={(k, v) => setForm(prev => ({ ...prev, [k]: v }))}
          onSubmit={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
