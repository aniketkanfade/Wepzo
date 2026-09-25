import { useState, useEffect, useRef } from 'react';
import { Tag, Upload, Camera } from 'lucide-react';
import api from '../api/axios';
import SimpleListTable from '../components/SimpleListTable';
import { PageCard, PageCardHeader, PageCardBody, PageCardDivider } from '../components/PageCard';
import ViewableImage from '../components/ViewableImage';

const tabs = ['Default', 'English (EN)', 'Hindi - हिन्दी (HI)'];
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

export default function BrandsPage() {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', nameEn: '', nameHi: '', image: '' });
  const fileRef = useRef(null);

  useEffect(() => { load(); }, []);

  const load = () => api.get('/brands').then(res => setItems(res.data)).catch(() => {});

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const resetForm = () => {
    setForm({ name: '', nameEn: '', nameHi: '', image: '' });
    setEditingId(null);
    setActiveTab(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert('Image must be under 2MB');
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, image: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      if (editingId) {
        const { data } = await api.put(`/brands/${editingId}`, form);
        setItems(prev => prev.map(i => i._id === editingId ? data : i));
      } else {
        const { data } = await api.post('/brands', form);
        setItems(prev => [...prev, data]);
      }
      resetForm();
    } catch (err) { console.error(err); }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({ name: item.name, nameEn: item.nameEn || '', nameHi: item.nameHi || '', image: item.image || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this brand?')) return;
    await api.delete(`/brands/${id}`);
    setItems(prev => prev.filter(i => i._id !== id));
  };

  const handleExport = () => {
    const rows = items.map(i => ({ ID: i.brandId, Name: i.name, Name_EN: i.nameEn || '', Name_HI: i.nameHi || '', Image: i.image || '' }));
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `brands_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Dashboard &gt; Brands &gt; <span className="text-gray-700">Add New</span>
      </p>

      <PageCard>
        <PageCardHeader
          icon={Tag}
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          title="Add New Brand"
          description="Create a new brand with logo for your products."
        />

        <PageCardBody className="pb-0">
          <form onSubmit={handleSubmit}>
            <div className="flex gap-1 border-b border-gray-200 mb-6">
              {tabs.map((tab, i) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                    activeTab === i ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-5">
                {activeTab === 0 && (
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                      <Tag size={14} className="text-gray-400" /> Name (Default) <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Ex : Samsung"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      required
                    />
                  </div>
                )}
                {activeTab === 1 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Name (English)</label>
                    <input
                      value={form.nameEn}
                      onChange={e => setForm({ ...form, nameEn: e.target.value })}
                      placeholder="Enter English name"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                )}
                {activeTab === 2 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Name (Hindi)</label>
                    <input
                      value={form.nameHi}
                      onChange={e => setForm({ ...form, nameHi: e.target.value })}
                      placeholder="ब्रांड का नाम दर्ज करें"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition min-h-[220px]"
                >
                  {form.image ? (
                    <ViewableImage src={form.image} alt="Preview" title="Brand Logo" className="w-32 h-32 object-contain rounded-xl" />
                  ) : (
                    <>
                      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Upload size={24} className="text-gray-400" />
                      </div>
                      <p className="font-medium text-gray-700 text-sm">Upload Brand Image</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP (Max 2MB)</p>
                      <button type="button" className="mt-4 flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                        <Camera size={16} /> Choose Image
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
              <button type="button" onClick={resetForm} className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                Reset
              </button>
              <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
                {editingId ? 'Update Brand' : 'Add Brand'}
              </button>
            </div>
          </form>
        </PageCardBody>

        <PageCardDivider />

        <SimpleListTable
          embedded
          title="Brand List"
          count={items.length}
          search={search}
          setSearch={setSearch}
          setPage={setPage}
          searchPlaceholder="Search brands..."
          onExport={handleExport}
          paginated={paginated}
          page={page}
          perPage={perPage}
          filtered={filtered}
          totalPages={totalPages}
          idKey="brandId"
          onEdit={handleEdit}
          onDelete={handleDelete}
          extraColumns={[{
            key: 'image',
            label: 'Image',
            render: (item) => (
              <ViewableImage
                src={item.image || 'https://via.placeholder.com/40'}
                title={item.name}
                alt={item.name}
                className="w-10 h-10 rounded-lg object-contain bg-gray-100"
              />
            ),
          }]}
        />
      </PageCard>
    </div>
  );
}
