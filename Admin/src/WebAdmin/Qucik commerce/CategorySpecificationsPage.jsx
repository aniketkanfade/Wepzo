import { useState, useEffect } from 'react';
import { Ruler, Plus, Trash2, Save, Tag, Search, Edit } from 'lucide-react';
import api from '../../api/axios';
import SearchableSelect from './components/SearchableSelect';
import { PageCard, PageCardHeader } from './components/PageCard';
import { capitalizeWords } from '../../utils/mediaUtils';

const perPage = 25;

export default function CategorySpecificationsPage() {
  const [categories, setCategories] = useState([]);
  const [allConfigs, setAllConfigs] = useState([]);
  const [mainCategory, setMainCategory] = useState('');
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newField, setNewField] = useState({ label: '', options: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const loadAll = () => api.get('/category-specifications').then(r => setAllConfigs(r.data)).catch(() => {});

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {});
    loadAll();
  }, []);

  useEffect(() => {
    if (!mainCategory) { setFields([]); return; }
    api.get('/category-specifications', { params: { mainCategory } })
      .then(r => setFields(r.data[0]?.fields || [])).catch(() => {});
  }, [mainCategory]);

  const addField = () => {
    if (!newField.label.trim()) return;
    const key = newField.label.trim().toLowerCase().replace(/\s+/g, '_');
    const options = newField.options.split(',').map(o => capitalizeWords(o.trim())).filter(Boolean);
    if (fields.some(f => f.key === key)) return alert('Field already exists');
    setFields(prev => [...prev, { key, label: capitalizeWords(newField.label.trim()), options }]);
    setNewField({ label: '', options: '' });
  };

  const removeField = (key) => setFields(prev => prev.filter(f => f.key !== key));

  const updateOptions = (key, opts) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, options: opts } : f));
  };

  const handleSave = async () => {
    if (!mainCategory) return;
    setSaving(true);
    try {
      await api.put('/category-specifications', { mainCategory, fields });
      await loadAll();
      alert('Specifications saved for ' + mainCategory);
    } catch { alert('Save failed'); }
    setSaving(false);
  };

  const handleEditConfig = (cfg) => {
    setMainCategory(cfg.mainCategory);
    setFields(cfg.fields || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteConfig = async (id, name) => {
    if (!confirm(`Delete all specifications for "${name}"?`)) return;
    await api.delete(`/category-specifications/${id}`);
    if (mainCategory === name) { setMainCategory(''); setFields([]); }
    loadAll();
  };

  const filtered = allConfigs.filter(c => c.mainCategory.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/30';

  return (
    <div className="space-y-6">
      <PageCard>
        <PageCardHeader icon={Ruler} iconBg="bg-amber-50" iconColor="text-amber-600"
          title="Category Specifications" description="Define specification fields per category. Fashion, Electronics, etc." />

        <div className="p-6 space-y-5">
          <div className="max-w-md">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Select Main Category</label>
            <SearchableSelect value={mainCategory} onChange={setMainCategory}
              options={categories.map(c => c.name)} placeholder="Choose Category..." />
          </div>

          {mainCategory && (
            <>
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Editing: {mainCategory}</p>
                  <p className="text-xs text-gray-500">{fields.length} field{fields.length !== 1 ? 's' : ''}</p>
                </div>
                <button type="button" onClick={() => { setMainCategory(''); setFields([]); }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg bg-white">Clear</button>
              </div>

              <div className="p-5 border border-gray-200 rounded-xl bg-gray-50/50">
                <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><Plus size={16} /> Add Specification Field</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input value={newField.label} onChange={e => setNewField({ ...newField, label: e.target.value })}
                    placeholder="Field name (e.g. Fabric, RAM)" className={inputCls + ' bg-white'} />
                  <input value={newField.options} onChange={e => setNewField({ ...newField, options: e.target.value })}
                    placeholder="Options: Cotton, 8GB, Red" className={inputCls + ' bg-white'} />
                  <button type="button" onClick={addField}
                    className="px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
                    Add Field
                  </button>
                </div>
              </div>

              {fields.length > 0 && (
                <div className="space-y-3">
                  {fields.map(f => (
                    <div key={f.key} className="p-4 border border-gray-200 rounded-xl bg-white hover:border-amber-200 transition shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Tag size={14} className="text-amber-600" />
                          <span className="text-sm font-semibold text-gray-800">{f.label}</span>
                          <span className="text-xs text-gray-400">({f.options?.length || 0} options)</span>
                        </div>
                        <button type="button" onClick={() => removeField(f.key)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
                      </div>
                      {f.options?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {f.options.map(opt => (
                            <span key={opt} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-100 rounded-md">{opt}</span>
                          ))}
                        </div>
                      )}
                      <input
                        value={(f.options || []).join(', ')}
                        onChange={e => updateOptions(f.key, e.target.value.split(',').map(o => capitalizeWords(o.trim())).filter(Boolean))}
                        placeholder="Options: Red, Blue, Cotton..."
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button type="button" onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition shadow-sm">
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Specifications'}
                </button>
              </div>
            </>
          )}
        </div>

      </PageCard>

      <PageCard>
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">Specification List</h2>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{allConfigs.length}</span>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search category..."
                className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-52 outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[520px] overflow-y-auto scroll-smooth">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-50 bg-gray-50 sticky top-0 z-10">
                  <th className="text-left px-6 py-3 font-medium w-12">#</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Fields</th>
                  <th className="text-left px-4 py-3 font-medium">Options Preview</th>
                  <th className="text-left px-4 py-3 font-medium w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">No specifications configured yet. Select a category above and add fields.</td></tr>
                ) : paginated.map((cfg, i) => (
                  <tr key={cfg._id} className="border-b border-gray-50 hover:bg-amber-50/30 transition">
                    <td className="px-6 py-3.5 text-gray-400">{(page - 1) * perPage + i + 1}</td>
                    <td className="px-4 py-3.5 font-medium text-gray-800">{cfg.mainCategory}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(cfg.fields || []).map(f => (
                          <span key={f.key} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-100 rounded-md font-medium">{f.label}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      {(cfg.fields || []).map(f => (
                        <span key={f.key} className="mr-3"><b className="text-gray-700">{f.label}:</b> {(f.options || []).slice(0, 3).join(', ')}{(f.options?.length > 3 ? '...' : '')}</span>
                      ))}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1.5">
                        <button onClick={() => handleEditConfig(cfg)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteConfig(cfg._id, cfg.mainCategory)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 text-sm text-gray-500">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded-lg disabled:opacity-40">Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded-lg disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      </PageCard>
    </div>
  );
}
