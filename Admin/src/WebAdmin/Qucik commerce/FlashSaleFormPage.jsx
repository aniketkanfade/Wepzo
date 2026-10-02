import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, LoaderCircle, Package, Percent, Search, Zap } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { PageCard } from './components/PageCard';
import { listBtnNavy, listBtnOutline } from '../../constants/listTheme';

function activeModules(list) {
  return (Array.isArray(list) ? list : []).filter(item =>
    item.status !== false && String(item.status).toLowerCase() !== 'false' && String(item.status).toLowerCase() !== 'inactive'
  );
}
function toDateTimeInput(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 16);
  parsed.setMinutes(parsed.getMinutes() - parsed.getTimezoneOffset());
  return parsed.toISOString().slice(0, 16);
}

function productKey(product) {
  return String(product._id || product.productId || product.id || product.name);
}

function priceAfterDiscount(price, discount) {
  const numericPrice = Number(price) || 0;
  const percent = Math.max(0, Math.min(100, Number(discount) || 0));
  return Math.max(0, numericPrice * (1 - percent / 100));
}

export default function FlashSaleFormPage() {
  const { saleId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [modules, setModules] = useState([]);
  const moduleId = searchParams.get('moduleId') || '';
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedProducts, setSelectedProducts] = useState({});
  const [productSearch, setProductSearch] = useState('');
  const [form, setForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
    status: 'Scheduled',
  });
  const [loading, setLoading] = useState(!!saleId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedModule = modules.find(module => module._id === moduleId);
  const editing = !!saleId;

  const visibleProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return products.filter(product => {
      const name = String(product.name || product.nameEn || '').toLowerCase();
      const sku = String(product.sku || '').toLowerCase();
      const code = String(product.productCode || '').toLowerCase();
      return !query || name.includes(query) || sku.includes(query) || code.includes(query);
    });
  }, [products, productSearch]);
  const selectedList = Object.values(selectedProducts);

  useEffect(() => {
    api.get('/system-modules')
      .then(({ data }) => {
        const enabledModules = activeModules(data);
        setModules(enabledModules);
        if (!searchParams.get('moduleId') && enabledModules.length) {
          setSearchParams({ moduleId: enabledModules[0]._id }, { replace: true });
        }
      })
      .catch(() => setModules([]));
  }, []);

  useEffect(() => {
    let alive = true;
    setProductsLoading(true);
    setProducts([]);
    Promise.all([
      api.get('/stores', { params: { filter: 'list' } }),
      moduleId ? api.get('/product-items', {
        params: {
          systemModuleId: moduleId,
          ...(selectedStoreId ? { storeId: selectedStoreId } : {}),
        },
      }) : Promise.resolve({ data: [] }),
    ]).then(([storeResponse, productResponse]) => {
      if (!alive) return;
      setStores(Array.isArray(storeResponse.data) ? storeResponse.data : []);
      setProducts(Array.isArray(productResponse.data) ? productResponse.data.filter(item => item.status !== false) : []);
    }).catch(() => {
      if (!alive) return;
      setStores([]);
      setProducts([]);
    }).finally(() => {
      if (alive) setProductsLoading(false);
    });
    return () => { alive = false; };
  }, [moduleId, selectedStoreId]);

  useEffect(() => {
    if (!saleId) return;
    let alive = true;
    setLoading(true);
    api.get('/flash-sales/' + saleId)
      .then(({ data }) => {
        if (!alive) return;
        const saleModuleId = data.systemModuleId || searchParams.get('moduleId') || '';
        if (saleModuleId && saleModuleId !== moduleId) setSearchParams({ moduleId: saleModuleId }, { replace: true });
        setForm({
          title: data.title || '',
          startDate: toDateTimeInput(data.startDate),
          endDate: toDateTimeInput(data.endDate),
          status: data.status || 'Scheduled',
        });
        setSelectedStoreId(data.storeId ? String(data.storeId) : '');
        const existingProducts = Array.isArray(data.productItems) ? data.productItems : [];
        const selected = {};
        existingProducts.forEach(product => {
          const key = String(product.productId || product._id || product.id || product.name);
          selected[key] = {
            ...product,
            productId: product.productId || product._id || product.id,
            discountPercent: Number(product.discountPercent ?? product.discount ?? data.discount ?? 10),
          };
        });
        setSelectedProducts(selected);
      })
      .catch(error => setError(error.response?.data?.message || 'Flash sale could not be loaded.'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [saleId]);

  useEffect(() => {
    const storeStillExists = !selectedStoreId || stores.some(store =>
      String(store.storeId) === selectedStoreId || String(store._id) === selectedStoreId
    );
    if (selectedStoreId && stores.length && !storeStillExists) setSelectedStoreId('');
  }, [stores, selectedStoreId]);

  const updateModule = (nextModuleId) => {
    setSearchParams({ moduleId: nextModuleId });
    setSelectedStoreId('');
    setSelectedProducts({});
    setProductSearch('');
    setError('');
  };

  const toggleProduct = (product) => {
    const key = productKey(product);
    setSelectedProducts(current => {
      if (current[key]) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return {
        ...current,
        [key]: {
          productId: product._id || product.productId || product.id,
          name: product.name || product.nameEn || 'Product',
          sku: product.sku || '',
          productCode: product.productCode || '',
          storeId: product.storeId || '',
          store: product.store || '',
          price: Number(product.price) || 0,
          discountPercent: 10,
          salePrice: priceAfterDiscount(product.price, 10),
        },
      };
    });
  };

  const updateProductDiscount = (key, value) => {
    const discountPercent = Math.max(0, Math.min(100, Number(value) || 0));
    setSelectedProducts(current => ({
      ...current,
      [key]: {
        ...current[key],
        discountPercent,
        salePrice: priceAfterDiscount(current[key].price, discountPercent),
      },
    }));
  };

  const saveSale = async () => {
    if (!moduleId) {
      setError('Select a Main Module.');
      return;
    }
    if (!form.title.trim()) {
      setError('Sale title is required.');
      return;
    }
    if (!selectedList.length) {
      setError('Select at least one product for this sale.');
      return;
    }
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      setError('End date and time must be after the start date and time.');
      return;
    }
    const selectedStore = stores.find(store =>
      String(store.storeId) === selectedStoreId || String(store._id) === selectedStoreId
    );
    const productItems = selectedList.map(product => ({
      ...product,
      price: Number(product.price) || 0,
      discountPercent: Number(product.discountPercent) || 0,
      salePrice: priceAfterDiscount(product.price, product.discountPercent),
    }));
    const averageDiscount = productItems.reduce((sum, product) => sum + product.discountPercent, 0) / productItems.length;
    const payload = {
      title: form.title.trim(),
      systemModuleId: moduleId,
      systemModuleName: selectedModule?.name || '',
      systemModuleSlug: selectedModule?.slug || '',
      moduleName: selectedModule?.name || '',
      storeId: selectedStore ? (selectedStore.storeId || selectedStore._id) : '',
      store: selectedStore?.name || 'All Stores',
      productItems,
      products: productItems.length,
      discount: Math.round(averageDiscount * 10) / 10,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : '',
      endDate: form.endDate ? new Date(form.endDate).toISOString() : '',
      status: form.status,
    };
    setSaving(true);
    setError('');
    try {
      if (editing) await api.put('/flash-sales/' + saleId, payload);
      else await api.post('/flash-sales', payload);
      navigate('/quick-commerce/flash-sales?moduleId=' + encodeURIComponent(moduleId));
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Flash sale could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Loading flash sale...</div>;
  }

  return (
    <div className="space-y-4 -m-1 p-1 min-h-full bg-[#edf3f7]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">Dashboard / Order Management / Flash Sales</p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold text-[#1a3a8a]">
            <Zap size={21} /> {editing ? 'Edit Flash Sale' : 'Create Flash Sale'}
          </h1>
        </div>
        <button type="button" onClick={() => navigate('/quick-commerce/flash-sales?moduleId=' + encodeURIComponent(moduleId))}
          className={'inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold ' + listBtnOutline}>
          <ArrowLeft size={16} /> Back to Flash Sales
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <PageCard>
        <div className="grid gap-5 border-b border-slate-100 p-5 md:grid-cols-2 xl:grid-cols-4">
          <label className="block text-sm font-medium text-slate-700">
            Flash Sale Name <span className="text-red-500">*</span>
            <input value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
              placeholder="Example: Weekend Flash Sale" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-400" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Main Module
            <select value={moduleId} onChange={event => updateModule(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-400">
              <option value="">Select Main Module</option>
              {modules.map(module => <option key={module._id} value={module._id}>{module.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Store
            <select value={selectedStoreId} onChange={event => { setSelectedStoreId(event.target.value); setSelectedProducts({}); }}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-400">
              <option value="">All stores in {selectedModule?.name || 'this module'}</option>
              {stores.map(store => <option key={store._id || store.storeId} value={store.storeId || store._id}>{store.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Status
            <select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-400">
              <option>Scheduled</option><option>Active</option><option>Ended</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Starts at
            <input type="datetime-local" value={form.startDate} onChange={event => setForm(current => ({ ...current, startDate: event.target.value }))}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-400" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Ends at
            <input type="datetime-local" value={form.endDate} onChange={event => setForm(current => ({ ...current, endDate: event.target.value }))}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-400" />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-slate-800"><Package size={18} /> Choose products</h2>
            <p className="mt-1 text-xs text-slate-500">Showing products from {selectedModule?.name || 'the selected Main Module'}{selectedStoreId ? ' and the selected store' : ''}.</p>
          </div>
          <label className="flex min-w-64 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500">
            <Search size={16} />
            <input value={productSearch} onChange={event => setProductSearch(event.target.value)} placeholder="Search name, SKU, or code" className="w-full bg-transparent text-slate-700 outline-none" />
          </label>
        </div>

        <div className="max-h-[360px] overflow-auto">
          {productsLoading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-slate-400"><LoaderCircle size={17} className="animate-spin" /> Loading products...</div>
          ) : visibleProducts.length ? (
            <div className="divide-y divide-slate-100">
              {visibleProducts.map(product => {
                const key = productKey(product);
                const selected = !!selectedProducts[key];
                return (
                  <label key={key} className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <input type="checkbox" checked={selected} onChange={() => toggleProduct(product)} className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{product.name || product.nameEn || 'Product'}</p>
                      <p className="text-xs text-slate-500">{product.sku || product.productCode || 'No SKU'}{product.store ? ' · ' + product.store : ''}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">₹{Number(product.price || 0).toFixed(2)}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-sm text-slate-400">No products found for this module and store.</div>
          )}
        </div>

        <div className="border-t border-slate-100 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-slate-800"><Percent size={18} /> Products in this flash sale</h2>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{selectedList.length} selected</span>
          </div>
          {selectedList.length ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Sale price</th><th className="px-4 py-3">Remove</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedList.map(product => {
                    const key = String(product.productId || product._id || product.id || product.name);
                    return (
                      <tr key={key}>
                        <td className="px-4 py-3 font-medium text-slate-800">{product.name}</td>
                        <td className="px-4 py-3 text-slate-500">{product.sku || '—'}</td>
                        <td className="px-4 py-3">₹{Number(product.price || 0).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex w-24 items-center rounded-md border border-slate-200 px-2">
                            <input type="number" min="0" max="100" value={product.discountPercent}
                              onChange={event => updateProductDiscount(key, event.target.value)} className="w-full py-1.5 outline-none" />
                            <span className="text-slate-400">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#1a3a8a]">₹{priceAfterDiscount(product.price, product.discountPercent).toFixed(2)}</td>
                        <td className="px-4 py-3"><button type="button" onClick={() => setSelectedProducts(current => { const next = { ...current }; delete next[key]; return next; })} className="text-xs font-semibold text-red-600 hover:underline">Remove</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">Select products above to add them to the sale.</div>
          )}
        </div>
      </PageCard>

      <div className="flex justify-end gap-3 pb-5">
        <button type="button" onClick={() => navigate('/quick-commerce/flash-sales?moduleId=' + encodeURIComponent(moduleId))}
          className={'rounded-lg border px-4 py-2.5 text-sm font-semibold ' + listBtnOutline}>Cancel</button>
        <button type="button" onClick={saveSale} disabled={saving}
          className={'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60 ' + listBtnNavy}>
          {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
          {saving ? 'Saving...' : editing ? 'Update Flash Sale' : 'Save Flash Sale'}
        </button>
      </div>

    </div>
  );
}