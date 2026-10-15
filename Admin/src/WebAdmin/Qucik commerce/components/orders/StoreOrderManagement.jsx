import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ClipboardList, Eye, Printer, RefreshCw, Search, Truck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../api/axios';
import { useListPagination } from '../../../../hooks/useListPagination';
import { ORDER_STATUS_STYLE } from '../../../../constants/orderStatus';
import { printOrderInvoice } from './orderPrint';

const FILTERS = [
  { label: 'All', statuses: [] },
  { label: 'New orders', statuses: ['Pending'] },
  { label: 'Accepted', statuses: ['Accepted'] },
  { label: 'Processing', statuses: ['Processing', 'Handover'] },
  { label: 'On the way', statuses: ['Out for Delivery'] },
  { label: 'Delivered', statuses: ['Delivered'] },
  { label: 'Cancelled', statuses: ['Cancelled'] },
  { label: 'Refunds', statuses: ['Returns/Refunds'] },
];

const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const orderTime = order => Date.parse(order.createdAt || order.orderDate || order.date) || 0;
const orderProducts = order => Array.isArray(order.products) && order.products.length
  ? order.products
  : Array.isArray(order.details)
    ? order.details.map(item => ({
      ...item,
      unitPrice: Number(item.price) || 0,
      total: (Number(item.price) || 0) * (Number(item.qty) || 0),
    }))
    : [];

export default function StoreOrderManagement() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setOrders([]);
      setError(requestError?.response?.data?.message || 'Orders load nahi ho paaye. Backend connection check karein.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const sortedOrders = useMemo(() => [...orders].sort((a, b) => orderTime(b) - orderTime(a)), [orders]);
  const filterInfo = FILTERS.find(item => item.label === filter) || FILTERS[0];
  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sortedOrders.filter(order => {
      const matchesStatus = !filterInfo.statuses.length || filterInfo.statuses.includes(order.status);
      const matchesSearch = !query || [order.orderNo, order.orderId, order.customer, order.phone, order.store, ...orderProducts(order).map(item => item.name)]
        .some(value => String(value || '').toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [filterInfo.statuses, search, sortedOrders]);
  const { page, setPage, totalPages, perPage, paginated } = useListPagination(visibleOrders, {
    resetDeps: [search, filter],
  });

  const updateStatus = async (order, status) => {
    setUpdatingId(order._id);
    setError('');
    try {
      await api.put(`/orders/${order._id}`, { status });
      await loadOrders();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Order update nahi ho paya.');
    } finally {
      setUpdatingId('');
    }
  };

  const countFor = statuses => statuses.length ? sortedOrders.filter(order => statuses.includes(order.status)).length : sortedOrders.length;

  return <section className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-blue-50 p-2.5 text-blue-800"><ClipboardList size={20}/></span>
        <div><h1 className="text-xl font-bold text-slate-900">Store Orders</h1><p className="mt-1 text-sm text-slate-500">Review storefront orders and move them through fulfillment.</p></div>
      </div>
      <button type="button" onClick={loadOrders} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
        <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh
      </button>
    </header>

    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <label className="relative min-w-56 flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search orders, customers, stores..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"/>
      </label>
      <span className="text-xs font-medium text-slate-500">{visibleOrders.length} orders</span>
    </div>

    <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter orders">
      {FILTERS.map(item => <button key={item.label} type="button" onClick={() => setFilter(item.label)} className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium ${filter === item.label ? 'border-blue-800 bg-blue-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
        {item.label} <span className={filter === item.label ? 'ml-1 text-blue-100' : 'ml-1 text-slate-400'}>{countFor(item.statuses)}</span>
      </button>)}
    </nav>

    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
    {loading ? <div className="rounded-xl border border-slate-200 bg-white px-5 py-16 text-center text-sm text-slate-500">Orders load ho rahe hain...</div>
      : !visibleOrders.length ? <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center"><ClipboardList size={28} className="mx-auto text-slate-300"/><h2 className="mt-3 font-semibold text-slate-700">No orders found</h2><p className="mt-1 text-sm text-slate-500">Try another filter or search term.</p></div>
        : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1260px] text-sm">
            <thead>
              <tr className="whitespace-nowrap bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="w-12 px-3 py-3">SI</th>
                <th className="w-32 px-3 py-3">Order ID</th>
                <th className="w-36 px-3 py-3">Order Date</th>
                <th className="w-[270px] px-3 py-3">Customer Information</th>
                <th className="w-32 px-3 py-3">Store</th>
                <th className="w-20 px-3 py-3 text-center">Qty</th>
                <th className="w-32 px-3 py-3 text-right">Total Amount</th>
                <th className="w-40 px-3 py-3">Order Status</th>
                <th className="w-44 px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((order, index) => {
          const items = orderProducts(order);
          const busy = updatingId === order._id;
          const quantity = items.reduce((total, item) => total + (Number(item.qty) || 1), 0)
            || Number(order.items) || 0;
          const orderStatus = order.status || 'Pending';
          const primaryAction = {
            Pending: { label: 'Accept', status: 'Accepted' },
            Accepted: { label: 'Process', status: 'Processing' },
            'Out for Delivery': { label: 'Delivered', status: 'Delivered' },
          }[orderStatus];
          return <tr key={order._id}
            onClick={() => navigate(`/orders/view/${order._id}`)}
            className="cursor-pointer whitespace-nowrap border-t border-slate-100 text-slate-700 transition hover:bg-blue-50/40">
            <td className="px-3 py-3 text-slate-400 tabular-nums">{(page - 1) * perPage + index + 1}</td>
            <td className="px-3 py-3 font-semibold text-blue-800">#{order.orderNo || order.orderId || order._id}</td>
            <td className="px-3 py-3 text-xs text-slate-600">
              <div className="max-w-36 truncate" title={order.orderDate || order.date || order.createdAt || 'Date unavailable'}>{order.orderDate || order.date || order.createdAt || 'Date unavailable'}</div>
            </td>
            <td className="px-3 py-3">
              <div className="max-w-[270px] truncate" title={[order.customer || 'Customer', order.phone || 'Phone not provided', order.deliveryAddress || order.address || order.area || 'Address unavailable'].join(' · ')}>
                <span className="font-medium text-slate-900">{order.customer || 'Customer'}</span>
                <span className="text-xs text-slate-500"> · {order.phone || 'Phone not provided'}</span>
                <span className="text-[11px] text-slate-400"> · {order.deliveryAddress || order.address || order.area || 'Address unavailable'}</span>
              </div>
            </td>
            <td className="px-3 py-3 text-slate-600">
              <div className="max-w-32 truncate" title={order.store || (order.source === 'e_commerce' ? 'My Website' : '—')}>{order.store || (order.source === 'e_commerce' ? 'My Website' : '—')}</div>
            </td>
            <td className="px-3 py-3 text-center tabular-nums">{quantity}</td>
            <td className="px-3 py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="font-semibold text-slate-900">{money(order.amount ?? order.total ?? order.billing?.total ?? order.bill?.total)}</span>
                <span className={`text-xs ${order.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-rose-500'}`}>{order.paymentStatus || 'Unpaid'}</span>
              </div>
            </td>
            <td className="px-3 py-3">
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_STYLE[orderStatus] || 'border border-slate-200 bg-slate-50 text-slate-700'}`}>{orderStatus}</span>
                <span className="text-xs text-slate-500">{order.payment || order.paymentMethod || 'Payment not specified'}</span>
              </div>
            </td>
            <td className="px-3 py-3" onClick={event => event.stopPropagation()}>
              <div className="flex min-w-max flex-nowrap items-center gap-1.5">
                <button type="button" title="View order" aria-label="View order" onClick={() => navigate(`/orders/view/${order._id}`)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-orange-200 text-orange-600 hover:bg-orange-50"><Eye size={15}/></button>
                {primaryAction && <button type="button" disabled={busy} title={`${primaryAction.label} order`} aria-label={`${primaryAction.label} order`} onClick={() => updateStatus(order, primaryAction.status)} className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-800 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50"><Check size={13}/><span className="sr-only">{primaryAction.label}</span></button>}
                {['Processing', 'Handover'].includes(orderStatus) && <button type="button" title="Assign rider / delivery" onClick={() => navigate(`/orders/view/${order._id}`)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"><Truck size={15}/></button>}
                {!['Delivered', 'Cancelled', 'Returns/Refunds', 'Failed'].includes(orderStatus) && <button type="button" disabled={busy} title="Cancel order" aria-label="Cancel order" onClick={() => updateStatus(order, 'Cancelled')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><X size={15}/></button>}
                {busy && <span className="text-xs text-slate-400">Updating...</span>}
                <button type="button" title="Print invoice" aria-label="Print invoice" onClick={() => printOrderInvoice(order)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"><Printer size={15}/></button>
              </div>
            </td>
          </tr>;
              })}
            </tbody>
          </table>
          </div>
          {visibleOrders.length > perPage && <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, visibleOrders.length)} of {visibleOrders.length}</p>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1} aria-label="Previous page" className="rounded-md border border-slate-200 p-2 text-slate-600 disabled:opacity-40"><ChevronLeft size={15}/></button>
              <span className="px-2 text-xs font-medium text-slate-600">Page {page} of {totalPages}</span>
              <button type="button" onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={page === totalPages} aria-label="Next page" className="rounded-md border border-slate-200 p-2 text-slate-600 disabled:opacity-40"><ChevronRight size={15}/></button>
            </div>
          </footer>}
        </div>}
  </section>;
}
