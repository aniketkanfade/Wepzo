import { useEffect, useMemo, useState } from 'react';
import { Download, Edit, LoaderCircle, Package, Plus, Trash2, Zap } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { downloadFile } from '../../api/download';
import AdminListLayout from './components/AdminListLayout';
import { useListPagination } from '../../hooks/useListPagination';
import { STATUS_STYLES } from '../Marketing/promotionModules';
import { LIST_TEAL, listBtnNavy, listBtnOutline, listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass } from '../../constants/listTheme';

function activeModules(list) {
  return (Array.isArray(list) ? list : []).filter(item =>
    item.status !== false && String(item.status).toLowerCase() !== 'false' && String(item.status).toLowerCase() !== 'inactive'
  );
}
function displayDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function getProducts(sale) {
  return Array.isArray(sale.productItems) ? sale.productItems : [];
}

export default function FlashSalesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [modules, setModules] = useState([]);
  const moduleId = searchParams.get('moduleId') || '';
  const [items, setItems] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState('');

  const moduleName = modules.find(module => module._id === moduleId)?.name || 'Main Modules';

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
    setLoading(true);
    setError('');
    api.get('/flash-sales', { params: moduleId ? { systemModuleId: moduleId } : {} })
      .then(({ data }) => setItems(Array.isArray(data) ? data : []))
      .catch(loadError => {
        setItems([]);
        setError(loadError.response?.data?.message || 'Flash sales could not be loaded.');
      })
      .finally(() => setLoading(false));
  }, [moduleId]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return items.filter(sale => {
      if (!query) return true;
      const productText = getProducts(sale).map(product =>
        [product.name, product.sku, product.productCode].filter(Boolean).join(' ')
      ).join(' ');
      return [sale.title, sale.store, sale.moduleName, productText].filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }, [items, search]);

  const { page, setPage, perPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [search, moduleId] });

  const changeModule = (id) => {
    setSearchParams({ moduleId: id });
    setSearch('');
    setSearchInput('');
  };

  const exportSales = async () => {
    try {
      await downloadFile(
        '/flash-sales/export',
        'flash_sales_' + new Date().toISOString().slice(0, 10) + '.xlsx',
        { params: moduleId ? { systemModuleId: moduleId } : {} }
      );
    } catch (exportError) {
      alert(exportError.response?.data?.message || 'Excel export failed.');
    }
  };

  const deleteSale = async sale => {
    if (!window.confirm('Delete "' + sale.title + '"?')) return;
    setActionId(sale._id);
    try {
      await api.delete('/flash-sales/' + sale._id);
      setItems(current => current.filter(item => item._id !== sale._id));
    } catch (deleteError) {
      alert(deleteError.response?.data?.message || 'Flash sale could not be deleted.');
    } finally {
      setActionId('');
    }
  };

  const toggleStatus = async sale => {
    const nextStatus = sale.status === 'Active' ? 'Ended' : 'Active';
    setActionId(sale._id);
    try {
      const { data } = await api.put('/flash-sales/' + sale._id, { status: nextStatus });
      setItems(current => current.map(item => item._id === data._id ? data : item));
    } catch (statusError) {
      alert(statusError.response?.data?.message || 'Status could not be updated.');
    } finally {
      setActionId('');
    }
  };

  const headerActions = (
    <>
      <select value={moduleId} onChange={event => changeModule(event.target.value)}
        aria-label="Main module" className="rounded-lg border border-[#d4e0e8] bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-400">
        <option value="">All Main Modules</option>
        {modules.map(module => <option key={module._id} value={module._id}>{module.name}</option>)}
      </select>
      <button type="button" onClick={exportSales} disabled={loading}
        className={'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-semibold ' + listBtnOutline}>
        <Download size={16} /> Export Excel
      </button>
      <Link to={'/quick-commerce/flash-sales/new?moduleId=' + encodeURIComponent(moduleId)}
        className={'inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold ' + listBtnNavy}>
        <Plus size={16} /> Add Flash Sale
      </Link>
    </>
  );

  return (
    <>
      <AdminListLayout
        breadcrumb={<>Dashboard &gt; Order Management &gt; <span className="text-gray-600">Flash Sales</span></>}
        title={'Flash Sales · ' + moduleName}
        icon={Zap}
        count={filtered.length}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => setSearch(searchInput.trim())}
        searchPlaceholder="Search title, store, product, or SKU..."
        headerActions={headerActions}
        page={page}
        totalPages={totalPages}
        total={total}
        perPage={perPage}
        onPageChange={setPage}
        isEmpty={!loading && !error && paginated.length === 0}
        emptyColSpan={8}
        emptyMessage="No flash sales match this search."
      >
        {error && <div role="alert" className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</div>}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" /> Loading flash sales...</div>
        ) : (
          <table className="w-full min-w-[920px] text-sm">
            <thead className="sticky top-0 z-10">
              <tr className={listTheadClass} style={listTheadStyle}>
                <th className={listThClass + ' w-14'}>#</th>
                <th className={listThClass}>Sale</th>
                <th className={listThClass}>Store</th>
                <th className={listThClass}>Products</th>
                <th className={listThClass}>Discount</th>
                <th className={listThClass}>Schedule</th>
                <th className={listThClass}>Status</th>
                <th className={listThClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((sale, index) => {
                const products = getProducts(sale);
                const productNames = products.slice(0, 3).map(product => product.name).filter(Boolean);
                return (
                  <tr key={sale._id} className={listRowClass} style={listRowStyle}>
                    <td className={listTdClass + ' text-gray-500 tabular-nums'}>{(page - 1) * perPage + index + 1}</td>
                    <td className={listTdClass}>
                      <p className="font-semibold text-slate-900">{sale.title || 'Untitled sale'}</p>
                      <p className="mt-1 text-xs text-slate-400">{sale.moduleName || moduleName}</p>
                    </td>
                    <td className={listTdClass}><span className="font-medium" style={{ color: LIST_TEAL }}>{sale.store || 'All Stores'}</span></td>
                    <td className={listTdClass}>
                      <div className="flex items-center gap-1.5 font-medium text-slate-700"><Package size={15} /> {products.length || Number(sale.products) || 0}</div>
                      <p className="mt-1 max-w-64 truncate text-xs text-slate-400" title={products.map(product => product.name).join(', ')}>
                        {productNames.join(', ')}{products.length > 3 ? ' +' + (products.length - 3) + ' more' : ''}
                      </p>
                    </td>
                    <td className={listTdClass + ' font-bold text-[#1a3a8a]'}>{Number(sale.discount || 0)}%</td>
                    <td className={listTdClass + ' text-xs text-slate-500'}>
                      <p>Start: {displayDate(sale.startDate)}</p>
                      <p className="mt-1">End: {displayDate(sale.endDate)}</p>
                    </td>
                    <td className={listTdClass}>
                      <button type="button" disabled={actionId === sale._id} onClick={() => toggleStatus(sale)}
                        className={'rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ' + (STATUS_STYLES[sale.status] || 'bg-gray-100 text-gray-600')}>
                        {actionId === sale._id ? 'Saving...' : sale.status || 'Scheduled'}
                      </button>
                    </td>
                    <td className={listTdClass}>
                      <div className="flex gap-1.5">
                        <Link to={'/quick-commerce/flash-sales/' + sale._id + '/edit?moduleId=' + encodeURIComponent(moduleId)}
                          aria-label={'Edit ' + sale.title} className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50">
                          <Edit size={15} />
                        </Link>
                        <button type="button" disabled={actionId === sale._id} onClick={() => deleteSale(sale)}
                          aria-label={'Delete ' + sale.title} className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50 disabled:opacity-50">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </AdminListLayout>
    </>
  );
}