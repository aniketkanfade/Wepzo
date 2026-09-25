import { useState, useEffect } from 'react';
import { Barcode, Search, Printer, RotateCcw, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/axios';
import { PageCard } from '../components/PageCard';
import ViewableImage from '../components/ViewableImage';
import BarcodeSvg from '../components/BarcodeSvg';
import { getBarcodeValue, getProductCode, printBarcodeLabels } from '../utils/barcodeUtils';
import { useListPagination } from '../hooks/useListPagination';
import {
  LIST_PER_PAGE, LIST_CARD_BORDER, listBtnNavy, listBtnOutline,
  listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass,
} from '../constants/listTheme';

const defaultSettings = {
  showName: true,
  showProductCode: true,
  showPrice: true,
  showStore: true,
  labelQty: 1,
};

export default function ProductBarcodePage() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => { api.get('/product-items').then(r => setItems(r.data)).catch(() => {}); }, []);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    getBarcodeValue(i).toLowerCase().includes(search.toLowerCase()) ||
    getProductCode(i).toLowerCase().includes(search.toLowerCase()) ||
    (i.sku || '').toLowerCase().includes(search.toLowerCase())
  );
  const { page, setPage, perPage, totalPages, paginated } = useListPagination(filtered, { resetDeps: [search] });
  const selectedItems = items.filter(i => selected.includes(i._id));
  const preview = selectedItems[0] || items[0];

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectPageAll = () => {
    const pageIds = paginated.map(i => i._id);
    const allOnPage = pageIds.every(id => selected.includes(id));
    if (allOnPage) {
      setSelected(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelected(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  const selectAllFiltered = () => {
    if (selected.length === filtered.length && filtered.length > 0) {
      setSelected([]);
    } else {
      setSelected(filtered.map(i => i._id));
    }
  };

  const handlePrint = () => {
    const toPrint = selected.length > 0 ? selectedItems : (preview ? [preview] : []);
    if (!toPrint.length) {
      alert('Pehle kam se kam ek product select karein.');
      return;
    }
    printBarcodeLabels(toPrint, settings);
  };

  const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const pageAllSelected = paginated.length > 0 && paginated.every(i => selected.includes(i._id));
  const allFilteredSelected = filtered.length > 0 && selected.length === filtered.length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Dashboard &gt; Product Setup &gt; <span className="text-gray-700">Barcode Labels</span></p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PageCard>
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center"><Barcode size={20} className="text-indigo-600" /></div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Barcode Labels</h1>
                  <p className="text-sm text-gray-500">Products select karein aur ek saath print karein.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-gray-100">
              <div className="border border-gray-100 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">Total Products</p>
                <p className="text-xl font-bold">{items.length}</p>
              </div>
              <div className="border border-green-100 bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">Selected</p>
                <p className="text-xl font-bold text-green-600">{selected.length}</p>
              </div>
              <div className="border border-orange-100 bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">Labels to Print</p>
                <p className="text-xl font-bold text-orange-600">{selected.length * (settings.labelQty || 1)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-gray-100">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search name, product code or barcode..."
                  className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>
              <button type="button" onClick={() => setSelected([])} title="Clear selection"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                <RotateCcw size={14} />
              </button>
              <button type="button" onClick={selectAllFiltered}
                className={`flex items-center gap-1 px-3 py-2 border rounded-lg text-sm transition ${
                  allFilteredSelected ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                <CheckSquare size={14} /> {allFilteredSelected ? 'Deselect All' : `Select All (${filtered.length})`}
              </button>
              <button type="button" onClick={handlePrint}
                className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
                <Printer size={16} />
                Print {selected.length > 0 ? `(${selected.length * (settings.labelQty || 1)} labels)` : 'Labels'}
              </button>
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto dropdown-scroll">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className={listTheadClass} style={listTheadStyle}>
                    <th className={`${listThClass} w-10`}>
                      <input type="checkbox" checked={pageAllSelected} onChange={selectPageAll} />
                    </th>
                    <th className={`${listThClass} w-14`}>#</th>
                    <th className={listThClass}>Image</th>
                    <th className={listThClass}>Product Name</th>
                    <th className={listThClass}>Product Code</th>
                    <th className={listThClass}>Store</th>
                    <th className={listThClass}>Price</th>
                    <th className={listThClass}>Stock</th>
                    <th className={`${listThClass} w-10`}>Print</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((item, i) => (
                    <tr key={item._id} className={`${listRowClass} ${selected.includes(item._id) ? 'bg-[#f8faff]' : ''}`} style={listRowStyle}>
                      <td className={listTdClass}>
                        <input type="checkbox" checked={selected.includes(item._id)} onChange={() => toggle(item._id)} />
                      </td>
                      <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
                      <td className={listTdClass}>
                        <ViewableImage src={item.image} images={[item.image].filter(Boolean)} title={item.name} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      </td>
                      <td className={`${listTdClass} font-medium`}>{item.name}</td>
                      <td className={`${listTdClass} text-gray-600 font-mono text-xs`}>{getProductCode(item) || '—'}</td>
                      <td className={listTdClass}>{item.store}</td>
                      <td className={`${listTdClass} tabular-nums`}>₹ {item.price?.toLocaleString('en-IN')}</td>
                      <td className={listTdClass}>{item.stock}</td>
                      <td className={listTdClass}>
                        <button
                          type="button"
                          title="Print this label"
                          onClick={() => printBarcodeLabels([item], settings)}
                          className="p-1.5 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 hover:text-[#1a3a8a] transition"
                        >
                          <Printer size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length > perPage && (
                <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t bg-white"
                  style={{ borderColor: LIST_CARD_BORDER }}>
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, filtered.length)} of {filtered.length} entries
                </p>
                <div className="flex items-center gap-1.5">
                  <button type="button" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                    className={`p-2 rounded-lg disabled:opacity-40 transition ${listBtnOutline}`}>
                    <ChevronLeft size={16} />
                  </button>
                  <button type="button" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className={`p-2 rounded-lg disabled:opacity-40 transition ${listBtnOutline}`}>
                    <ChevronRight size={16} />
                  </button>
                </div>
                </div>
              )}
            </div>
          </PageCard>
        </div>

        <PageCard>
          <div className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Label Preview</h3>
            {preview ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center bg-white">
                <ViewableImage src={preview.image} title={preview.name} alt="" className="w-16 h-16 object-cover rounded mx-auto mb-2" />
                {settings.showName && <p className="text-xs font-medium text-gray-800 line-clamp-2">{preview.name}</p>}
                {settings.showPrice && <p className="text-sm font-bold text-primary-600 mt-1">₹ {preview.price?.toLocaleString('en-IN')}</p>}
                <div className="mt-2 flex justify-center overflow-hidden">
                  <BarcodeSvg item={preview} className="max-w-full h-auto" />
                </div>
                {settings.showProductCode && <p className="text-[10px] text-gray-500 mt-1 font-mono">{getProductCode(preview) || '—'}</p>}
                {settings.showStore && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{preview.store}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">Koi product nahi mila</p>
            )}

            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Label Settings</h4>
              {[
                { key: 'showName', label: 'Show Product Name' },
                { key: 'showProductCode', label: 'Show Product Code' },
                { key: 'showPrice', label: 'Show Price' },
                { key: 'showStore', label: 'Show Store' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between text-sm text-gray-600 cursor-pointer">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={e => updateSetting(key, e.target.checked)}
                    className="accent-primary-600"
                  />
                </label>
              ))}
              <div>
                <label className="text-sm text-gray-600">Label Quantity (per product)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.labelQty}
                  onChange={e => updateSetting('labelQty', Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>
              <button type="button" onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition mt-2">
                <Printer size={16} />
                {selected.length > 0
                  ? `Print ${selected.length} Product${selected.length > 1 ? 's' : ''} (${selected.length * settings.labelQty} labels)`
                  : 'Print Preview Label'}
              </button>
            </div>
          </div>
        </PageCard>
      </div>
    </div>
  );
}
