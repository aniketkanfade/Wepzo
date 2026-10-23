import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock3, PackageCheck, RefreshCw, Truck, XCircle } from 'lucide-react';
import api from '../../api/axios';
import LiveOrdersMap from './components/orders/LiveOrdersMap';

const ACTIVE = new Set(['Pending', 'Accepted', 'Processing', 'Handover', 'Out for Delivery']);

function dateKey(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : '';
}

function isDelayed(order, now = Date.now()) {
  if (!ACTIVE.has(order.status)) return false;
  const eta = Number(order.scheduledEtaMin || order.etaMinutes);
  const started = Date.parse(order.etaStartedAt || order.createdAt || '');
  return Number.isFinite(eta) && eta > 0 && Number.isFinite(started) && now > started + (eta + 10) * 60000;
}

function Metric({ icon: Icon, label, value, tone }) {
  return <article className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon size={18} /></span>
    <div><p className="text-xs text-slate-500">{label}</p><p className="mt-0.5 text-xl font-extrabold text-slate-900">{value}</p></div>
  </article>;
}

export default function LiveOrdersTrackingPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [store, setStore] = useState('');
  const [rider, setRider] = useState('');
  const [date, setDate] = useState('');
  const [websiteId, setWebsiteId] = useState('');
  const isMainAdmin = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}')?.role === 'main_admin'; } catch { return false; }
  })();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [ordersResult, websitesResult] = await Promise.all([
        api.get('/orders', { params: { sort: 'recent', ...(isMainAdmin && websiteId ? { websiteId } : {}) } }),
        isMainAdmin && websites.length === 0 ? api.get('/websites').catch(() => ({ data: [] })) : Promise.resolve({ data: websites }),
      ]);
      setOrders(Array.isArray(ordersResult.data) ? ordersResult.data : []);
      if (isMainAdmin && Array.isArray(websitesResult.data)) setWebsites(websitesResult.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Live orders could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isMainAdmin, websiteId, websites]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => load(true), 10000);
    return () => window.clearInterval(timer);
  }, [load]);

  const websiteNames = useMemo(() => new Map(websites.map(item => [String(item._id), item.name || item.domain || item._id])), [websites]);
  const baseRows = useMemo(() => orders.filter(order => ACTIVE.has(order.status) || ['Delivered', 'Cancelled'].includes(order.status)), [orders]);
  const dateRows = useMemo(() => baseRows.filter(order => !date || dateKey(order.createdAt || order.etaStartedAt || order.orderDate) === date), [baseRows, date]);
  const stores = useMemo(() => [...new Set(dateRows.map(order => order.store).filter(Boolean))].sort(), [dateRows]);
  const riders = useMemo(() => [...new Set(dateRows.map(order => order.rider?.name).filter(Boolean))].sort(), [dateRows]);
  const filtered = useMemo(() => dateRows.filter(order =>
    (!status || order.status === status)
    && (!store || order.store === store)
    && (!rider || order.rider?.name === rider)
  ), [dateRows, status, store, rider]);
  const counts = useMemo(() => ({
    active: dateRows.filter(order => ACTIVE.has(order.status)).length,
    completed: dateRows.filter(order => order.status === 'Delivered').length,
    delayed: dateRows.filter(order => isDelayed(order)).length,
    cancelled: dateRows.filter(order => order.status === 'Cancelled').length,
  }), [dateRows]);

  return <main className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary-600">Quick Commerce · Operations</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">Live orders & delivery tracking</h1><p className="mt-1 text-sm text-slate-500">Rider GPS and order progress for orders in your authorized website scope.</p></div>
      <button type="button" onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />Refresh</button>
    </header>

    {error && <p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle size={16} />{error}</p>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Truck} label="Active deliveries" value={counts.active} tone="bg-orange-50 text-orange-700" />
      <Metric icon={PackageCheck} label="Completed" value={counts.completed} tone="bg-emerald-50 text-emerald-700" />
      <Metric icon={Clock3} label="Delayed" value={counts.delayed} tone="bg-amber-50 text-amber-700" />
      <Metric icon={XCircle} label="Cancelled" value={counts.cancelled} tone="bg-slate-100 text-slate-600" />
    </section>

    <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
      {isMainAdmin && <label className="text-xs font-semibold text-slate-600">Tenant website<select value={websiteId} onChange={event => setWebsiteId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">All authorized websites</option>{websites.map(item => <option key={item._id} value={item._id}>{item.name || item.domain || item._id}</option>)}</select></label>}
      <label className="text-xs font-semibold text-slate-600">Store<select value={store} onChange={event => setStore(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">All stores</option>{stores.map(name => <option key={name}>{name}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Rider<select value={rider} onChange={event => setRider(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">All riders</option>{riders.map(name => <option key={name}>{name}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Order status<select value={status} onChange={event => setStatus(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">All active & recent</option>{['Pending', 'Accepted', 'Processing', 'Handover', 'Out for Delivery', 'Delivered', 'Cancelled'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Order date<input type="date" value={date} onChange={event => setDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm" /></label>
    </section>

    {loading ? <div className="grid h-72 place-items-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500"><RefreshCw className="animate-spin" size={18} />Loading orders…</div> : <>
      <LiveOrdersMap orders={filtered.filter(order => ACTIVE.has(order.status))} onSelectOrder={order => navigate(`/orders/view/${encodeURIComponent(order._id)}`)} />
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="font-bold text-slate-900">Orders in this view</h2><span className="text-xs text-slate-500">{filtered.length} orders</span></div>
        <div className="divide-y divide-slate-100">
          {filtered.map(order => <button type="button" key={order._id} onClick={() => navigate(`/orders/view/${encodeURIComponent(order._id)}`)} className="grid w-full grid-cols-[1fr_auto] gap-3 px-4 py-3 text-left hover:bg-slate-50 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
            <span><b className="block text-sm text-slate-900">#{order.orderNo || order.orderId}</b><small className="text-xs text-slate-500">{order.store || 'Store unavailable'}{isMainAdmin && order.websiteId ? ` · ${websiteNames.get(String(order.websiteId)) || 'Tenant website'}` : ''}</small></span>
            <span className="hidden text-xs text-slate-600 sm:block">{order.customer || 'Customer'}</span>
            <span className="hidden text-xs text-slate-600 sm:block">{order.rider?.name || 'Rider unassigned'}</span>
            <span className="hidden text-xs text-slate-600 sm:block">{order.status}</span>
            <span className={`self-center rounded-full px-2.5 py-1 text-[10px] font-bold ${order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-800' : order.status === 'Cancelled' ? 'bg-slate-100 text-slate-600' : isDelayed(order) ? 'bg-amber-50 text-amber-800' : 'bg-orange-50 text-orange-800'}`}>{order.status}</span>
          </button>)}
          {!filtered.length && <p className="p-8 text-center text-sm text-slate-500">No orders match these filters.</p>}
        </div>
      </section>
    </>}
  </main>;
}
