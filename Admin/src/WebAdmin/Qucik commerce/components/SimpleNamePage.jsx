import { useState, useEffect } from 'react';
import { Tag } from 'lucide-react';
import api from '../../../api/axios';
import SimpleListTable from './SimpleListTable';
import { PageCard, PageCardHeader, PageCardBody } from './PageCard';

const perPage = 25;

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = v => {
    const s = String(v ?? '');
    return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

export default function SimpleNamePage({
  title, plural, apiPath, idKey, icon, iconColor, iconBg,
  breadcrumb, placeholder, searchPlaceholder, formDescription,
}) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', nameEn: '', nameHi: '' });

  useEffect(() => { load(); }, []);

  const load = () => api.get(apiPath).then(res => setItems(res.data)).catch(() => {});

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const resetForm = () => {
    setForm({ name: '', nameEn: '', nameHi: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      if (editingId) {
        const { data } = await api.put(`${apiPath}/${editingId}`, form);
        setItems(prev => prev.map(i => i._id === editingId ? data : i));
      } else {
        const { data } = await api.post(apiPath, form);
        setItems(prev => [...prev, data]);
      }
      resetForm();
    } catch (err) { console.error(err); }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({ name: item.name, nameEn: item.nameEn || '', nameHi: item.nameHi || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm(`Delete this ${title.toLowerCase()}?`)) return;
    await api.delete(`${apiPath}/${id}`);
    setItems(prev => prev.filter(i => i._id !== id));
  };

  const handleExport = () => {
    const rows = items.map(i => ({ ID: i[idKey], Name: i.name, Name_EN: i.nameEn || '', Name_HI: i.nameHi || '' }));
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${apiPath.replace('/', '')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6">
      <PageCard>
        <PageCardHeader
          icon={icon}
          iconBg={iconBg}
          iconColor={iconColor}
          title={`Add New ${title}`}
          description={formDescription || `Create and manage ${plural.toLowerCase()}.`}
        />

        <PageCardBody className="pb-0">
          <form onSubmit={handleSubmit}>
            <div className="max-w-xl space-y-5">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Tag size={14} className="text-gray-400" /> Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder={placeholder}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
              <button type="button" onClick={resetForm} className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                Reset
              </button>
              <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
                {editingId ? `Update ${title}` : `Add ${title}`}
              </button>
            </div>
          </form>
        </PageCardBody>
      </PageCard>

        <SimpleListTable
          title={`${title} List`}
          count={items.length}
          search={search}
          setSearch={setSearch}
          setPage={setPage}
          searchPlaceholder={searchPlaceholder}
          onExport={handleExport}
          paginated={paginated}
          page={page}
          perPage={perPage}
          filtered={filtered}
          totalPages={totalPages}
          idKey={idKey}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
    </div>
  );
}
