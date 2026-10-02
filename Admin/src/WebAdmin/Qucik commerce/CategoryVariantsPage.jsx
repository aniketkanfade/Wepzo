import { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, Save, Tag, Search, Edit } from 'lucide-react';
import api from '../../api/axios';
import SearchableSelect from './components/SearchableSelect';
import { PageCard, PageCardHeader } from './components/PageCard';
import { capitalizeWords } from '../../utils/mediaUtils';
import { isColorAttribute, getColorHex, hashColor } from '../../utils/colorMap';

const perPage = 25;

function ColorDot({ name, size = 'sm' }) {
  const hex = getColorHex(name) || hashColor(name);
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return <span className={`${cls} rounded-full border border-gray-200 shrink-0 inline-block`} style={{ backgroundColor: hex }} title={name} />;
}

export default function CategoryVariantsPage() {
  const [categories, setCategories] = useState([]);
  const [allConfigs, setAllConfigs] = useState([]);
  const [mainCategory, setMainCategory] = useState('');
  const [attributes, setAttributes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newAttr, setNewAttr] = useState({ name: '', options: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const loadAll = () => api.get('/category-variants').then(r => setAllConfigs(r.data)).catch(() => {});

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {});
    loadAll();
  }, []);

  useEffect(() => {
    if (!mainCategory) { setAttributes([]); return; }
    api.get('/category-variants', { params: { mainCategory } })
      .then(r => setAttributes(r.data[0]?.attributes || [])).catch(() => {});
  }, [mainCategory]);

  const addAttribute = () => {
    if (!newAttr.name.trim()) return;
    const name = capitalizeWords(newAttr.name.trim());
    if (attributes.some(a => a.name === name)) return alert('Attribute already exists');
    const options = newAttr.options.split(',').map(o => capitalizeWords(o.trim())).filter(Boolean);
    setAttributes(prev => [...prev, { name, options }]);
    setNewAttr({ name: '', options: '' });
  };

  const removeAttribute = (name) => setAttributes(prev => prev.filter(a => a.name !== name));

  const updateOptions = (name, opts) => {
    setAttributes(prev => prev.map(a => a.name === name ? { ...a, options: opts } : a));
  };

  const handleSave = async () => {
    if (!mainCategory) return;
    setSaving(true);
    try {
      await api.put('/category-variants', { mainCategory, attributes });
      await loadAll();
      alert('Variants saved for ' + mainCategory);
    } catch { alert('Save failed'); }
    setSaving(false);
  };

  const handleEditConfig = (cfg) => {
    setMainCategory(cfg.mainCategory);
    setAttributes(cfg.attributes || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteConfig = async (id, name) => {
    if (!confirm(`Delete all variants for "${name}"?`)) return;
    await api.delete(`/category-variants/${id}`);
    if (mainCategory === name) { setMainCategory(''); setAttributes([]); }
    loadAll();
  };

  const filtered = allConfigs.filter(c => c.mainCategory.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/30';

  return (
    <div className="space-y-6">
      <PageCard>
        <PageCardHeader icon={Layers} iconBg="bg-violet-50" iconColor="text-violet-600"
          title="Category Variants" description="Define variant attributes per category. Color, Size, RAM, etc." />

        {/* Form */}
        <div className="p-6 space-y-5">
          <div className="max-w-md">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Select Main Category</label>
            <SearchableSelect value={mainCategory} onChange={setMainCategory}
              options={categories.map(c => c.name)} placeholder="Choose Category..." />
          </div>

          {mainCategory && (
            <>
              <div className="p-4 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Editing: {mainCategory}</p>
                  <p className="text-xs text-gray-500">{attributes.length} attribute{attributes.length !== 1 ? 's' : ''}</p>
                </div>
                <button type="button" onClick={() => { setMainCategory(''); setAttributes([]); }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg bg-white">Clear</button>
              </div>

              <div className="p-5 border border-gray-200 rounded-xl bg-gray-50/50">
                <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><Plus size={16} /> Add Variant Attribute</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input value={newAttr.name} onChange={e => setNewAttr({ ...newAttr, name: e.target.value })}
                    placeholder="Attribute name (e.g. Color, Size)" className={inputCls + ' bg-white'} />
                  <input value={newAttr.options} onChange={e => setNewAttr({ ...newAttr, options: e.target.value })}
                    placeholder="Values: Red, Blue, S, M, L" className={inputCls + ' bg-white'} />
                  <button type="button" onClick={addAttribute}
                    className="px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
                    Add Attribute
                  </button>
                </div>
              </div>

              {attributes.length > 0 && (
                <div className="space-y-3">
                  {attributes.map(a => (
                    <div key={a.name} className="p-4 border border-gray-200 rounded-xl bg-white hover:border-violet-200 transition shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Tag size={14} className="text-violet-600" />
                          <span className="text-sm font-semibold text-gray-800 capitalize">{a.name}</span>
                          {isColorAttribute(a.name) && (
                            <span className="text-[10px] font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">Color</span>
                          )}
                          <span className="text-xs text-gray-400">({a.options?.length || 0} values)</span>
                        </div>
                        <button type="button" onClick={() => removeAttribute(a.name)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
                      </div>
                      {isColorAttribute(a.name) && a.options?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {a.options.map(opt => (
                            <span key={opt} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 capitalize">
                              <ColorDot name={opt} /> {opt}
                            </span>
                          ))}
                        </div>
                      )}
                      <input
                        value={(a.options || []).join(', ')}
                        onChange={e => updateOptions(a.name, e.target.value.split(',').map(o => capitalizeWords(o.trim())).filter(Boolean))}
                        placeholder="Values: Red, Blue, S, M, L..."
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button type="button" onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition shadow-sm">
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Variants'}
                </button>
              </div>
            </>
          )}
        </div>

      </PageCard>

      <PageCard>
        {/* List — all saved configs */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">Variant List</h2>
              <span className="bg-violet-100 text-violet-700 text-xs font-bold px-2 py-0.5 rounded-full">{allConfigs.length}</span>
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
                  <th className="text-left px-4 py-3 font-medium">Attributes</th>
                  <th className="text-left px-4 py-3 font-medium">Values Preview</th>
                  <th className="text-left px-4 py-3 font-medium w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">No variants configured yet. Select a category above and add attributes.</td></tr>
                ) : paginated.map((cfg, i) => (
                  <tr key={cfg._id} className="border-b border-gray-50 hover:bg-violet-50/30 transition">
                    <td className="px-6 py-3.5 text-gray-400">{(page - 1) * perPage + i + 1}</td>
                    <td className="px-4 py-3.5 font-medium text-gray-800">{cfg.mainCategory}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(cfg.attributes || []).map(a => (
                          <span key={a.name} className="text-xs px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-100 rounded-md capitalize font-medium">{a.name}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-2">
                        {(cfg.attributes || []).map(a => (
                          <div key={a.name} className="flex items-center gap-1">
                            {isColorAttribute(a.name) ? (
                              (a.options || []).slice(0, 6).map(opt => <ColorDot key={opt} name={opt} />)
                            ) : (
                              <span className="text-xs text-gray-500 capitalize">{a.name}: {(a.options || []).slice(0, 3).join(', ')}{(a.options?.length > 3 ? '...' : '')}</span>
                            )}
                          </div>
                        ))}
                      </div>
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
