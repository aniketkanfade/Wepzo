import { useEffect, useState } from 'react';
import { Download, Package, List, Store, Tag, FileSpreadsheet } from 'lucide-react';
import api from '../api/axios';
import { downloadFile } from '../api/download';
import { PageCard } from '../components/PageCard';

const initialFilters = { storeId: '', category: '', subCategory: '', brand: '', status: '', stock: '' };
const initialOptions = { basic: true, price: true, store: true, images: false, attributes: false, additional: false };
const optionLabels = { basic: 'Basic Information', price: 'Price & Stock', store: 'Store Information', images: 'Product Images', attributes: 'Attributes & Variations', additional: 'Additional Information' };

export default function ProductBulkExportPage() {
  const [stats, setStats] = useState({});
  const [history, setHistory] = useState([]);
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [options, setOptions] = useState(initialOptions);
  const [loading, setLoading] = useState(false);

  const refreshHistory = () => api.get('/product-export-history').then(r => setHistory(r.data)).catch(() => {});
  useEffect(() => {
    api.get('/product-items/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('/stores').then(r => setStores(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/categories').then(r => setCategories(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/sub-categories').then(r => setSubCategories(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/brands').then(r => setBrands(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    refreshHistory();
  }, []);

  const handleExport = async () => {
    const groups = Object.keys(options).filter(key => options[key]);
    if (!groups.length) return alert('Choose at least one export option.');
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), groups: groups.join(',') });
      await downloadFile(`/product-items/export?${params.toString()}`, `products_${new Date().toISOString().slice(0, 10)}.csv`);
      await refreshHistory();
    } catch (err) { alert(err.response?.data?.message || 'Export failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const select = (label, key, values, getValue = x => x.name) => <label key={key} className="block">
    <span className="mb-1 block text-sm text-gray-600">{label}</span>
    <select value={filters[key]} onChange={e => setFilters(prev => ({ ...prev, [key]: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none">
      <option value="">All</option>{values.map((item, i) => <option key={item._id || item.id || getValue(item) || i} value={getValue(item)}>{item.name || getValue(item)}</option>)}
    </select>
  </label>;

  const statCards = [
    { label: 'Total Products', value: stats.totalProducts, icon: Package, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Categories', value: stats.totalCategories, icon: List, color: 'bg-green-50 text-green-600' },
    { label: 'Total Stores', value: stats.totalStores, icon: Store, color: 'bg-purple-50 text-purple-600' },
    { label: 'Total Brands', value: stats.totalBrands, icon: Tag, color: 'bg-orange-50 text-orange-600' },
  ];

  return <div className="space-y-6">
    <p className="text-sm text-gray-500">Dashboard &gt; Product Setup &gt; <span className="text-gray-700">Bulk Export</span></p>
    <PageCard>
      <div className="border-b border-gray-100 px-6 py-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50"><Download size={20} className="text-green-600" /></div><div><h1 className="text-lg font-bold text-gray-900">Bulk Export</h1><p className="text-sm text-gray-500">Filter products and download the selected fields as CSV.</p></div></div></div>
      <div className="grid grid-cols-2 gap-4 border-b border-gray-100 p-6 md:grid-cols-4">{statCards.map(s => <div key={s.label} className="flex items-center gap-3 rounded-xl border border-gray-100 p-4"><div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}><s.icon size={18} /></div><div><p className="text-xl font-bold">{s.value || 0}</p><p className="text-xs text-gray-500">{s.label}</p></div></div>)}</div>
      <div className="grid grid-cols-1 gap-6 border-b border-gray-100 p-6 lg:grid-cols-3">
        <div className="space-y-3"><h3 className="font-semibold text-gray-800">Filter Products</h3>
          {select('Store', 'storeId', stores, item => item.storeId ?? item._id)}
          {select('Category', 'category', categories)}
          {select('Sub Category', 'subCategory', subCategories)}
          {select('Brand', 'brand', brands)}
          <label className="block"><span className="mb-1 block text-sm text-gray-600">Status</span><select value={filters.status} onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <label className="block"><span className="mb-1 block text-sm text-gray-600">Stock</span><select value={filters.stock} onChange={e => setFilters(prev => ({ ...prev, stock: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"><option value="">All</option><option value="low">Low stock</option><option value="out">Out of stock</option></select></label>
          <div className="flex gap-2 pt-2"><button onClick={() => setFilters(initialFilters)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Reset</button><button onClick={handleExport} disabled={loading} className="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"><Download size={16} />{loading ? 'Exporting...' : 'Export Products'}</button></div>
        </div>
        <div><h3 className="mb-3 font-semibold text-gray-800">Fields to Include</h3>{Object.entries(optionLabels).map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-2 py-2 text-sm text-gray-600"><input type="checkbox" checked={options[key]} onChange={e => setOptions(prev => ({ ...prev, [key]: e.target.checked }))} className="accent-primary-600" />{label}</label>)}</div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5"><h3 className="mb-3 font-semibold text-blue-800">Export CSV</h3><p className="text-sm leading-6 text-blue-700">Filters apply to the downloaded file. Choose the fields you need, then open the CSV in Excel or Google Sheets.</p><p className="mt-3 text-xs text-blue-600">Product Code is included in Basic Information.</p></div>
      </div>
      <div className="border-b border-gray-100 px-6 py-4"><h3 className="font-semibold">Recent Exports</h3></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-gray-50 text-gray-500"><th className="px-6 py-3 text-left">#</th><th className="px-4 py-3 text-left">File Name</th><th className="px-4 py-3 text-left">Format</th><th className="px-4 py-3 text-left">Total Products</th><th className="px-4 py-3 text-left">File Size</th><th className="px-4 py-3 text-left">Generated On</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Action</th></tr></thead><tbody>{history.map((h, i) => <tr key={h._id} className="border-b border-gray-50"><td className="px-6 py-3">{i + 1}</td><td className="px-4 py-3 font-medium">{h.fileName}</td><td className="px-4 py-3"><span className="flex items-center gap-1"><FileSpreadsheet size={14} className="text-green-600" />{h.format}</span></td><td className="px-4 py-3">{h.totalProducts}</td><td className="px-4 py-3">{h.fileSize}</td><td className="px-4 py-3 text-gray-500">{h.generatedOn}</td><td className="px-4 py-3"><span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">{h.status}</span></td><td className="px-4 py-3"><button title="Download current product export" onClick={() => downloadFile(`/product-items/export?${new URLSearchParams(h.query || {}).toString()}`, h.fileName)} className="rounded p-1.5 text-primary-600 hover:bg-primary-50"><Download size={14} /></button></td></tr>)}</tbody></table></div>
    </PageCard>
  </div>;
}
