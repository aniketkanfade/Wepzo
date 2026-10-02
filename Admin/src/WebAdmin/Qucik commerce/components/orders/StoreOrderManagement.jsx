import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ClipboardList, Printer, RefreshCw, Search, Truck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../api/axios';
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
const orderProducts = order => Array.isArray(order.products) ? order.products : [];

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
        : <div className="space-y-3">{visibleOrders.map(order => {
          const items = orderProducts(order);
          const busy = updatingId === order._id;
          return <article key={order._id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div><p className="text-xs font-bold uppercase tracking-wide text-blue-800">Order #{order.orderNo || order.orderId || order._id}</p><p className="mt-1 text-xs text-slate-500">{order.orderDate || order.date || 'Date unavailable'}{order.store ? ` · ${order.store}` : ''}</p></div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{order.status || 'Pending'}</span>
            </header>
            <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)_auto] sm:px-5">
              <div className="min-w-0"><p className="font-semibold text-slate-900">{order.customer || 'Customer'}</p><p className="mt-1 text-sm text-slate-500">{order.phone || 'Phone not provided'}</p><p className="mt-2 text-xs leading-5 text-slate-500">{order.deliveryAddress || order.area || 'Delivery address unavailable'}</p></div>
              <div className="space-y-1.5">{items.length ? items.map((item, index) => <div key={`${item.productId || item.name}-${index}`} className="flex justify-between gap-3 text-sm"><span className="min-w-0 truncate text-slate-600">{item.name || 'Product'} <span className="text-slate-400">× {item.qty || 1}</span></span><span className="shrink-0 font-medium text-slate-800">{money(item.total ?? Number(item.unitPrice || 0) * Number(item.qty || 1))}</span></div>) : <p className="text-sm text-slate-500">{order.items || 0} item(s)</p>}
                <div className="flex justify-between border-t border-slate-100 pt-2 text-sm"><span className="font-semibold text-slate-700">Total</span><span className="font-bold text-slate-900">{money(order.amount ?? order.billing?.total)}</span></div>
                <p className="text-xs text-slate-500">{order.payment || order.paymentMethod || 'Payment not specified'} · {order.paymentStatus || 'Unpaid'}</p>
              </div>
              <div className="flex flex-wrap items-start gap-2 sm:flex-col sm:items-stretch">
                <button type="button" onClick={() => printOrderInvoice(order)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Printer size={14}/> Print invoice</button>
                {order.status === 'Pending' && <button type="button" disabled={busy} onClick={() => updateStatus(order, 'Accepted')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-800 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50"><Check size={14}/> Accept order</button>}
                {order.status === 'Accepted' && <button type="button" disabled={busy} onClick={() => updateStatus(order, 'Processing')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-800 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50"><Check size={14}/> Start processing</button>}
                {['Processing', 'Handover'].includes(order.status) && <button type="button" onClick={() => navigate(`/orders/view/${order._id}`)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-800 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900"><Truck size={14}/> Assign rider / delivery</button>}
                {order.status === 'Out for Delivery' && <button type="button" disabled={busy} onClick={() => updateStatus(order, 'Delivered')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Check size={14}/> Mark delivered</button>}
                {!['Delivered', 'Cancelled', 'Returns/Refunds', 'Failed'].includes(order.status) && <button type="button" disabled={busy} onClick={() => updateStatus(order, 'Cancelled')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><X size={14}/> Cancel</button>}
                {busy && <span className="text-center text-xs text-slate-400">Updating...</span>}
              </div>
            </div>
          </article>;
        })}</div>}
  </section>;
}