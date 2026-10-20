import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Download, Eye, Filter, Printer, RefreshCw, Search, Truck, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../../../api/axios';
import { useListPagination } from '../../../../hooks/useListPagination';
import { ORDER_STATUS_STYLE } from '../../../../constants/orderStatus';
import { printOrderInvoice } from './orderPrint';

const ORDER_VIEWS = {
  scheduled: { label: 'Scheduled Orders', statuses: ['Scheduled'] },
  pending: { label: 'Pending Orders', statuses: ['Pending'] },
  accepted: { label: 'Accepted Orders', statuses: ['Accepted'] },
  processing: { label: 'Processing Orders', statuses: ['Processing'] },
  handover: { label: 'Handover Orders', statuses: ['Handover'] },
  'out-for-delivery': { label: 'Out for Delivery', statuses: ['Out for Delivery'] },
  delivered: { label: 'Delivered Orders', statuses: ['Delivered'] },
  cancelled: { label: 'Cancelled Orders', statuses: ['Cancelled'] },
  'returns-refunds': { label: 'Returns / Refunds', statuses: ['Returns/Refunds'] },
  failed: { label: 'Failed Orders', statuses: ['Failed'] },
};
const ALL_ORDERS_VIEW = { label: 'All Orders', statuses: [] };

const DATE_FILTERS = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
];

const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const orderTime = order => Date.parse(order.createdAt || order.orderDate || order.date) || 0;
const orderDateLabel = order => {
  const rawDate = order.orderDate || order.date || order.createdAt;
  const timestamp = rawDate ? Date.parse(rawDate) : NaN;
  if (!Number.isFinite(timestamp)) return rawDate || 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
};
const orderTypeLabel = order => {
  if (order.status === 'Scheduled' || order.scheduledOn || order.scheduledAt || order.deliveryTime || order.preferredDeliveryTime || order.preferredTime || order.slot) {
    return 'Scheduled';
  }
  const orderType = String(order.orderType || order.deliveryType || order.deliveryMode || '').trim().toLowerCase();
  if (['takeaway', 'take away', 'pickup', 'pick up'].includes(orderType)) return 'Takeaway';
  if (['home delivery', 'delivery'].includes(orderType)) return 'Home Delivery';
  return 'Home Delivery';
};
const isInDateRange = (order, range) => {
  if (range === 'all') return true;
  const timestamp = orderTime(order);
  if (!timestamp) return false;
  const now = new Date();
  if (range === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return timestamp >= startOfToday;
  }
  const days = range === '7days' ? 7 : 30;
  return timestamp >= Date.now() - days * 24 * 60 * 60 * 1000;
};
const csvCell = value => {
  const text = String(value ?? '');
  const safeText = typeof value === 'string' && /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};
const exportOrdersToCsv = orders => {
  const columns = [
    ['Order ID', order => order.orderNo || order.orderId || order._id],
    ['Order Date', orderDateLabel],
    ['Customer', order => order.customer || 'Customer'],
    ['Phone', order => order.phone || ''],
    ['Store', order => order.store || (order.source === 'e_commerce' ? 'My Website' : '')],
    ['Item Quantity', order => orderProducts(order).reduce((total, item) => total + (Number(item.qty) || 1), 0) || Number(order.items) || 0],
    ['Products', order => orderProducts(order).map(item => `${item.name || item.productName || 'Item'} x${Number(item.qty) || 1}`).join('; ')],
    ['Total Amount', order => Number(order.amount ?? order.total ?? order.billing?.total ?? order.bill?.total) || 0],
    ['Payment Status', order => order.paymentStatus || 'Unpaid'],
    ['Payment Method', order => order.payment || order.paymentMethod || ''],
    ['Order Status', order => order.effectiveStatus || order.status || 'Pending'],
    ['Delivery Address', order => order.deliveryAddress || order.address || order.area || ''],
  ];
  const csv = [
    columns.map(([label]) => csvCell(label)).join(','),
    ...orders.map(order => columns.map(([, value]) => csvCell(value(order))).join(',')),
  ].join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
const getOrderScheduledTime = order => {
  const rawValue = order?.scheduledOn || order?.scheduledAt || order?.deliveryTime || order?.preferredDeliveryTime || order?.preferredTime || order?.slot;
  if (!rawValue) return null;
  const parsed = new Date(rawValue).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};
const getEffectiveOrderStatus = order => {
  const rawStatus = String(order?.status || 'Pending').trim();
  if (rawStatus !== 'Scheduled') return rawStatus || 'Pending';
  const scheduledTime = getOrderScheduledTime(order);
  if (scheduledTime && scheduledTime <= Date.now()) {
    const acceptedLike = ['Accepted', 'accepted', 'paid', 'success'];
    const paymentStatus = String(order?.paymentStatus || '').toLowerCase();
    const orderState = String(order?.orderState || '').toLowerCase();
    if (acceptedLike.includes(paymentStatus) || acceptedLike.includes(orderState) || String(order?.status || '').toLowerCase() === 'accepted') {
      return 'Accepted';
    }
    return 'Pending';
  }
  return 'Scheduled';
};
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
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const routeStatus = String(location.pathname.split('/').filter(Boolean).at(-1) || '').toLowerCase();
  const orderView = ORDER_VIEWS[routeStatus] || ALL_ORDERS_VIEW;
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
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
  const normalizedOrders = useMemo(() => sortedOrders.map(order => ({
    ...order,
    effectiveStatus: getEffectiveOrderStatus(order),
  })), [sortedOrders]);
  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return normalizedOrders.filter(order => {
      const matchesStatus = !orderView.statuses.length || orderView.statuses.includes(order.effectiveStatus);
      const matchesSearch = !query || [order.orderNo, order.orderId, order.customer, order.phone, order.store, ...orderProducts(order).map(item => item.name)]
        .some(value => String(value || '').toLowerCase().includes(query));
      const normalizedPaymentStatus = String(order.paymentStatus || 'Unpaid').trim().toLowerCase();
      const matchesPayment = paymentFilter === 'all'
        || (paymentFilter === 'paid' ? normalizedPaymentStatus === 'paid' : normalizedPaymentStatus !== 'paid');
      return matchesStatus && matchesSearch && matchesPayment && isInDateRange(order, dateFilter);
    });
  }, [dateFilter, normalizedOrders, orderView.statuses, paymentFilter, search]);
  const { page, setPage, totalPages, perPage, paginated } = useListPagination(visibleOrders, {
    resetDeps: [dateFilter, orderView.label, paymentFilter, search],
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

  return <section className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <ClipboardList size={22} className="shrink-0 text-slate-600"/>
        <h1 className="truncate text-xl font-semibold text-slate-800">{orderView.label}</h1>
        <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">{visibleOrders.length}</span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <form onSubmit={event => event.preventDefault()} className="relative flex min-w-48">
          <label htmlFor="order-search" className="sr-only">Search orders</label>
          <input
            id="order-search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Ex: 10010"
            className="w-full rounded-l-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500"
          />
          <button type="submit" aria-label="Search orders" className="rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-3 text-slate-600">
            <Search size={16}/>
          </button>
        </form>
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <Download size={15}/> Export <ChevronDown size={14} className="text-slate-400"/>
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            <button type="button" onClick={event => { exportOrdersToCsv(visibleOrders); event.currentTarget.closest('details')?.removeAttribute('open'); }} className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              Export Excel-compatible CSV
            </button>
            <button type="button" onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); window.print(); }} className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              Print order list
            </button>
          </div>
        </details>
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <Filter size={15}/> Filter <ChevronDown size={14} className="text-slate-400"/>
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-56 space-y-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
            <label className="block text-xs font-medium text-slate-600">
              Payment status
              <select value={paymentFilter} onChange={event => setPaymentFilter(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700">
                <option value="all">All payments</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Order date
              <select value={dateFilter} onChange={event => setDateFilter(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700">
                {DATE_FILTERS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => { setPaymentFilter('all'); setDateFilter('all'); }} className="text-xs font-semibold text-blue-700 hover:text-blue-900">
              Clear filters
            </button>
          </div>
        </details>
        <button type="button" onClick={loadOrders} disabled={loading} aria-label="Refresh orders" title="Refresh orders" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>
        </button>
      </div>
    </header>

    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
    {loading ? <div className="rounded-xl border border-slate-200 bg-white px-5 py-16 text-center text-sm text-slate-500">Orders load ho rahe hain...</div>
      : !visibleOrders.length ? <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center"><ClipboardList size={28} className="mx-auto text-slate-300"/><h2 className="mt-3 font-semibold text-slate-700">No orders found</h2><p className="mt-1 text-sm text-slate-500">Try another filter or search term.</p></div>
        : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead>
              <tr className="whitespace-nowrap bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="w-12 px-3 py-3">SI</th>
                <th className="w-32 px-3 py-3">Order ID</th>
                <th className="w-40 px-3 py-3">Order Date</th>
                <th className="w-[210px] px-3 py-3">Customer</th>
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
          const orderStatus = order.effectiveStatus || order.status || 'Pending';
          const primaryAction = {
            Pending: { label: 'Accept', status: 'Accepted' },
            Accepted: { label: 'Process', status: 'Processing' },
            'Out for Delivery': { label: 'Delivered', status: 'Delivered' },
          }[orderStatus];
          return <tr key={order._id}
            className="whitespace-nowrap border-t border-slate-100 text-slate-700 transition hover:bg-blue-50/40">
            <td className="px-3 py-3 text-slate-400 tabular-nums">{(page - 1) * perPage + index + 1}</td>
            <td className="px-3 py-3 font-semibold text-blue-800">#{order.orderNo || order.orderId || order._id}</td>
            <td className="px-3 py-3 text-xs text-slate-600">
              <div className="max-w-40 whitespace-normal" title={order.orderDate || order.date || order.createdAt || 'Date unavailable'}>{orderDateLabel(order)}</div>
            </td>
            <td className="px-3 py-3">
              <div className="max-w-[210px] truncate">
                {order.customerId
                  ? <button type="button" onClick={() => navigate(`/customers/details/${encodeURIComponent(order.customerId)}`)} className="block max-w-full truncate text-left font-medium text-slate-900 hover:text-blue-700 hover:underline">{order.customer || 'Customer'}</button>
                  : <span className="block truncate font-medium text-slate-900">{order.customer || 'Customer'}</span>}
                <span className="block truncate text-xs text-slate-500">{order.phone || 'Phone not provided'}</span>
              </div>
            </td>
            <td className="px-3 py-3 text-slate-600">
              {order.storeId
                ? <button type="button" onClick={() => navigate(`/stores/view/${encodeURIComponent(order.storeId)}`)} className="block max-w-32 truncate text-left text-slate-600 hover:text-blue-700 hover:underline" title={order.store || ''}>{order.store || 'Store'}</button>
                : <div className="max-w-32 truncate" title={order.store || (order.source === 'e_commerce' ? 'My Website' : '—')}>{order.store || (order.source === 'e_commerce' ? 'My Website' : '—')}</div>}
            </td>
            <td className="px-3 py-3 text-center tabular-nums">{quantity}</td>
            <td className="px-3 py-3 text-right">
              <div className="flex flex-col items-end">
                <span className="font-semibold text-slate-900">{money(order.amount ?? order.total ?? order.billing?.total ?? order.bill?.total)}</span>
                <span className={`mt-0.5 text-xs ${String(order.paymentStatus || 'Unpaid').toLowerCase() === 'paid' ? 'text-emerald-600' : 'text-rose-500'}`}>{order.paymentStatus || 'Unpaid'}</span>
              </div>
            </td>
            <td className="px-3 py-3">
              <div className="flex flex-col items-start gap-1">
                <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_STYLE[orderStatus] || 'border border-slate-200 bg-slate-50 text-slate-700'}`}>{orderStatus}</span>
                <span className="text-xs text-slate-500">{orderTypeLabel(order)}</span>
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
