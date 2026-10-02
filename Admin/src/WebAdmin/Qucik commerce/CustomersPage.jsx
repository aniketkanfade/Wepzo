import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CircleUserRound, CreditCard, Mail, MapPin, MessageSquareText, Package, Pencil, RefreshCw, Search, ShieldCheck, Star, UserRoundCheck, UserRoundX } from 'lucide-react';
import api from '../../api/axios';
import { listBtnNavy, listBtnOutline, listThClass, listTheadClass, listTheadStyle, listRowClass, listRowStyle, listTdClass } from '../../constants/listTheme';

const SECTION_LABELS = {
  all: 'All Customers',
  active: 'Active Customers',
  blocked: 'Blocked Customers',
  details: 'Customer Details',
  orders: 'Customer Orders',
  wallet: 'Customer Wallet',
  addresses: 'Customer Addresses',
  reviews: 'Customer Reviews',
  support: 'Customer Support',
};

const CUSTOMER_SECTIONS = ['details', 'orders', 'wallet', 'addresses', 'reviews', 'support'];
const money = value => `₹${(Number(value) || 0).toLocaleString('en-IN')}`;
const displayDate = value => value ? new Date(value).toLocaleDateString('en-IN') : '—';

function EmptyState({ children }) {
  return <div className="px-6 py-14 text-center text-sm text-slate-500">{children}</div>;
}

function RecordsTable({ type, rows }) {
  if (!rows.length) {
    const emptyText = {
      orders: 'No orders for this customer.',
      wallet: 'No wallet transactions recorded.',
      addresses: 'No saved or order addresses recorded.',
      reviews: 'No customer reviews recorded.',
      support: 'No customer support tickets recorded.',
    }[type];
    return <EmptyState>{emptyText}</EmptyState>;
  }

  if (type === 'orders') return (
    <div className="overflow-x-auto"><table className="w-full text-sm">
      <thead><tr className={listTheadClass} style={listTheadStyle}><th className={listThClass}>Order</th><th className={listThClass}>Date</th><th className={listThClass}>Store</th><th className={listThClass}>Status</th><th className={listThClass}>Amount</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row._id || index} className={listRowClass} style={listRowStyle}>
        <td className={`${listTdClass} font-medium`}>{row.orderNo || row.orderId || row._id}</td><td className={listTdClass}>{row.orderDate || row.date || displayDate(row.createdAt)}</td><td className={listTdClass}>{row.store || '—'}</td><td className={listTdClass}>{row.status || '—'}</td><td className={listTdClass}>{money(row.amount)}</td>
      </tr>)}</tbody>
    </table></div>
  );

  if (type === 'wallet') return (
    <div className="overflow-x-auto"><table className="w-full text-sm">
      <thead><tr className={listTheadClass} style={listTheadStyle}><th className={listThClass}>Date</th><th className={listThClass}>Description</th><th className={listThClass}>Type</th><th className={listThClass}>Amount</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row._id || index} className={listRowClass} style={listRowStyle}>
        <td className={listTdClass}>{displayDate(row.createdAt || row.date)}</td><td className={listTdClass}>{row.description || row.note || '—'}</td><td className={listTdClass}>{row.type || row.transactionType || '—'}</td><td className={listTdClass}>{money(row.amount)}</td>
      </tr>)}</tbody>
    </table></div>
  );

  if (type === 'addresses') return (
    <div className="divide-y divide-slate-100">{rows.map((row, index) => <div key={row._id || index} className="flex items-start gap-3 px-5 py-4">
      <MapPin size={17} className="mt-0.5 text-slate-400" /><div><p className="font-medium text-slate-800">{row.label || row.type || 'Address'}</p><p className="mt-1 text-sm text-slate-600">{row.address || row.fullAddress || row.line}</p></div>
    </div>)}</div>
  );

  if (type === 'reviews') return (
    <div className="divide-y divide-slate-100">{rows.map((row, index) => <div key={row._id || index} className="px-5 py-4">
      <div className="flex items-center justify-between gap-3"><p className="font-medium text-slate-800">{row.productName || row.product || 'Product review'}</p><span className="inline-flex items-center gap-1 text-sm text-amber-600"><Star size={14} fill="currentColor" />{row.rating ?? '—'}</span></div>
      <p className="mt-2 text-sm text-slate-600">{row.review || row.comment || row.description || 'No written review.'}</p><p className="mt-1 text-xs text-slate-400">{displayDate(row.createdAt || row.date)}</p>
    </div>)}</div>
  );

  return <div className="divide-y divide-slate-100">{rows.map((row, index) => <div key={row._id || index} className="px-5 py-4">
    <div className="flex items-center justify-between gap-3"><p className="font-medium text-slate-800">{row.subject || row.title || 'Support request'}</p><span className="text-xs text-slate-500">{row.status || '—'}</span></div>
    <p className="mt-1 text-sm text-slate-600">{row.message || row.description || '—'}</p><p className="mt-1 text-xs text-slate-400">{displayDate(row.createdAt || row.date)}</p>
  </div>)};</div>;
}

export default function CustomersPage() {
  const { view = 'all', customerId } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [records, setRecords] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [filterOptions, setFilterOptions] = useState({ modules: [], stores: [], zones: [] });
  const [filters, setFilters] = useState({ commerceType: '', module: '', storeId: '', zoneId: '' });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const isDetailSection = CUSTOMER_SECTIONS.includes(view);
  const title = SECTION_LABELS[view] || SECTION_LABELS.all;

  const loadCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const status = view === 'active' || view === 'blocked' ? view : 'all';
      const response = await api.get('/customers', { params: { status, search, ...filters } });
      setCustomers(Array.isArray(response.data) ? response.data : []);
    } catch {
      setCustomers([]);
      setError('Customer records load nahi ho paaye. Backend connection check karein.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId && isDetailSection) {
      let live = true;
      setLoading(true);
      setError('');
      Promise.all([
        api.get(`/customers/${customerId}`),
        view === 'details' ? Promise.resolve({ data: null }) : api.get(`/customers/${customerId}/${view}`),
      ]).then(([customerResponse, recordsResponse]) => {
        if (!live) return;
        setCustomer(customerResponse.data);
        const responseData = recordsResponse.data;
        setRecords(view === 'wallet' ? (responseData?.transactions || []) : (Array.isArray(responseData) ? responseData : []));
        setWalletBalance(Number(responseData?.balance) || 0);
        setBlockReason(customerResponse.data.blockReason || '');
        setEditForm({ name: customerResponse.data.name || '', email: customerResponse.data.email || '', phone: customerResponse.data.phone || '' });
      }).catch(() => {
        if (live) { setCustomer(null); setRecords([]); setError('Customer details load nahi ho paaye.'); }
      }).finally(() => { if (live) setLoading(false); });
      return () => { live = false; };
    }
    setCustomer(null);
    loadCustomers();
  }, [view, customerId, search, filters]);

  useEffect(() => {
    if (customerId || isDetailSection) return undefined;
    Promise.all([
      api.get('/system-modules').catch(() => ({ data: [] })),
      api.get('/stores', { params: { filter: 'all' } }).catch(() => ({ data: [] })),
      api.get('/zones').catch(() => ({ data: [] })),
    ]).then(([moduleResponse, storeResponse, zoneResponse]) => {
      setFilterOptions({
        modules: Array.isArray(moduleResponse.data) ? moduleResponse.data : [],
        stores: Array.isArray(storeResponse.data) ? storeResponse.data : [],
        zones: Array.isArray(zoneResponse.data) ? zoneResponse.data : [],
      });
    });
  }, [customerId, isDetailSection]);

  const toggleBlock = async item => {
    const isBlocked = !item.isBlocked;
    const reason = isBlocked ? (item._id === customer?._id ? blockReason : '') : '';
    setBusyId(item._id);
    try {
      const response = await api.patch(`/customers/${item._id}/block`, { blocked: isBlocked, reason });
      if (customer?._id === item._id) setCustomer(current => ({ ...current, ...response.data }));
      setCustomers(current => current.map(row => row._id === item._id ? { ...row, ...response.data } : row));
    } catch {
      setError('Customer status update nahi ho paya.');
    } finally {
      setBusyId('');
    }
  };

  const saveCustomer = async event => {
    event.preventDefault();
    setBusyId(customer._id);
    setError('');
    try {
      const response = await api.patch(`/customers/${customer._id}`, editForm);
      setCustomer(current => ({ ...current, ...response.data }));
      setEditingCustomer(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Customer details update nahi ho paaye.');
    } finally {
      setBusyId('');
    }
  };

  const customerLinkForView = id => `/customers/${view === 'all' || view === 'active' || view === 'blocked' ? 'details' : view}/${id}`;
  const listMode = !customerId;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold text-slate-900">{title}</h1><p className="mt-1 text-sm text-slate-500">Customer records and activity from the database.</p></div>
        {listMode && <button type="button" onClick={loadCustomers} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${listBtnOutline}`}><RefreshCw size={15} /> Refresh</button>}
      </div>

      {listMode ? (
        <section className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: '#dbe5ec' }}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: '#dbe5ec' }}>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><CircleUserRound size={18} className="text-slate-500" />{view === 'details' || view === 'orders' || view === 'wallet' || view === 'addresses' || view === 'reviews' || view === 'support' ? 'Select a customer' : title}<span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs tabular-nums">{customers.length}</span></div>
            <div className="flex flex-wrap justify-end gap-2">
              <select value={filters.commerceType} onChange={event => setFilters(current => ({ ...current, commerceType: event.target.value }))} className="rounded-lg border px-2.5 py-2 text-sm" style={{ borderColor: '#d4e0e8' }}>
                <option value="">All Business</option><option value="quick_commerce">Quick Commerce</option><option value="ecommerce">Website / E-Commerce</option>
              </select>
              <select value={filters.module} onChange={event => setFilters(current => ({ ...current, module: event.target.value }))} className="rounded-lg border px-2.5 py-2 text-sm" style={{ borderColor: '#d4e0e8' }}><option value="">All Modules</option>{filterOptions.modules.map(item => <option key={item._id || item.slug} value={item.slug}>{item.name}</option>)}</select>
              <select value={filters.storeId} onChange={event => setFilters(current => ({ ...current, storeId: event.target.value }))} className="rounded-lg border px-2.5 py-2 text-sm" style={{ borderColor: '#d4e0e8' }}><option value="">All Stores</option>{filterOptions.stores.map(item => <option key={item._id || item.storeId} value={item.storeId || item._id}>{item.name}</option>)}</select>
              <select value={filters.zoneId} onChange={event => setFilters(current => ({ ...current, zoneId: event.target.value }))} className="rounded-lg border px-2.5 py-2 text-sm" style={{ borderColor: '#d4e0e8' }}><option value="">All Zones</option>{filterOptions.zones.map(item => <option key={item._id} value={item._id}>{item.name} #{item.zoneId}</option>)}</select>
              <form className="flex" onSubmit={event => { event.preventDefault(); setSearch(query.trim()); }}><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email, phone" className="w-56 rounded-l-lg border px-3 py-2 text-sm outline-none" style={{ borderColor: '#d4e0e8' }} /><button className={`rounded-r-lg px-3 ${listBtnNavy}`} aria-label="Search customers"><Search size={15} /></button></form>
            </div>
          </div>
          {error && <p className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700">{error}</p>}
          {loading ? <EmptyState>Loading customers...</EmptyState> : customers.length === 0 ? <EmptyState>No customer records found.</EmptyState> : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className={listTheadClass} style={listTheadStyle}><th className={listThClass}>Customer</th><th className={listThClass}>Contact</th><th className={listThClass}>Last Login</th><th className={listThClass}>Orders</th><th className={listThClass}>Total Spend</th><th className={listThClass}>Status</th><th className={listThClass}>Actions</th></tr></thead>
              <tbody>{customers.map(row => <tr key={row._id} className={listRowClass} style={listRowStyle}>
                <td className={listTdClass}><button type="button" onClick={() => navigate(customerLinkForView(row._id))} className="text-left font-semibold text-slate-800 hover:text-blue-700">{row.name || 'Unnamed customer'}</button><p className="mt-0.5 text-xs text-slate-400">Joined {displayDate(row.createdAt)}</p></td>
                <td className={listTdClass}><p>{row.email || '—'}</p><p className="mt-0.5 text-xs text-slate-500">{row.phone || '—'}</p></td>
                <td className={listTdClass}><p>{row.lastLoginAt ? displayDate(row.lastLoginAt) : 'Never'}</p><p className="mt-0.5 text-xs text-slate-500">{row.loginCount || 0} login(s)</p></td>
                <td className={listTdClass}>{row.orderCount || 0}</td><td className={listTdClass}>{money(row.totalSpent)}</td>
                <td className={listTdClass}><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.isBlocked ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{row.isBlocked ? 'Blocked' : 'Active'}</span></td>
                <td className={listTdClass}><div className="flex items-center gap-2"><button type="button" onClick={() => navigate(`/customers/details/${row._id}`)} className={`rounded-lg px-3 py-1.5 text-xs ${listBtnOutline}`}>Details</button><button type="button" disabled={busyId === row._id} onClick={() => toggleBlock(row)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${row.isBlocked ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-rose-200 text-rose-700 hover:bg-rose-50'}`}>{row.isBlocked ? 'Unblock' : 'Block'}</button></div></td>
              </tr>)}</tbody>
            </table></div>
          )}
        </section>
      ) : (
        <section className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: '#dbe5ec' }}>
          {loading ? <EmptyState>Loading customer record...</EmptyState> : !customer ? <EmptyState>{error || 'Customer not found.'}</EmptyState> : <>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5" style={{ borderColor: '#dbe5ec' }}>
              <div className="flex items-start gap-3"><button type="button" onClick={() => navigate('/customers')} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Back to customers"><ArrowLeft size={18} /></button><div><h2 className="text-lg font-bold text-slate-900">{customer.name || 'Unnamed customer'}</h2><p className="mt-1 text-sm text-slate-500">{customer.email || '—'} · {customer.phone || '—'}</p><p className="mt-1 text-xs text-slate-400">{customer.orderCount || 0} orders · {money(customer.totalSpent)} total spend</p></div></div>
              <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditingCustomer(current => !current)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${listBtnOutline}`}><Pencil size={15} />{editingCustomer ? 'Cancel Edit' : 'Edit Customer'}</button><button type="button" disabled={busyId === customer._id} onClick={() => toggleBlock(customer)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50 ${customer.isBlocked ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-rose-200 text-rose-700 hover:bg-rose-50'}`}>{customer.isBlocked ? <UserRoundCheck size={16} /> : <Ban size={16} />}{customer.isBlocked ? 'Unblock customer' : 'Block customer'}</button></div>
            </div>
            <div className="flex gap-1 overflow-x-auto border-b px-4 py-2" style={{ borderColor: '#dbe5ec' }}>{CUSTOMER_SECTIONS.map(section => <Link key={section} to={`/customers/${section}/${customer._id}`} className={`shrink-0 rounded-lg px-3 py-2 text-sm ${view === section ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}>{SECTION_LABELS[section]}</Link>)}</div>
            {error && <p className="bg-rose-50 px-5 py-3 text-sm text-rose-700">{error}</p>}
            {view === 'details' ? <div className="space-y-5 p-5">
              {editingCustomer && <form onSubmit={saveCustomer} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3"><label className="text-xs font-semibold text-slate-600">Name<input required value={editForm.name} onChange={event => setEditForm(form => ({ ...form, name: event.target.value }))} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Email<input value={editForm.email} onChange={event => setEditForm(form => ({ ...form, email: event.target.value }))} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Mobile<input value={editForm.phone} onChange={event => setEditForm(form => ({ ...form, phone: event.target.value }))} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm" /></label><div className="sm:col-span-3"><button disabled={busyId === customer._id} className={`rounded-lg px-4 py-2 text-sm ${listBtnNavy}`}>Save Customer</button></div></form>}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoTile icon={Mail} label="Email" value={customer.email || '—'} /><InfoTile icon={CircleUserRound} label="Phone" value={customer.phone || '—'} /><InfoTile icon={ShieldCheck} label="Account status" value={customer.isBlocked ? `Blocked${customer.blockReason ? ` · ${customer.blockReason}` : ''}` : 'Active'} /><InfoTile icon={Package} label="Orders" value={customer.orderCount || 0} /><InfoTile icon={CreditCard} label="Total spend" value={money(customer.totalSpent)} /><InfoTile icon={CircleUserRound} label="Joined" value={displayDate(customer.createdAt)} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2"><Breakdown title="Orders by Store" rows={customer.stores || []} /><Breakdown title="Orders by Zone" rows={customer.zones || []} /></div>
              {!customer.isBlocked && <div className="sm:col-span-2 lg:col-span-3"><label className="mb-1.5 block text-sm font-medium text-slate-700">Block reason (optional)</label><input value={blockReason} onChange={event => setBlockReason(event.target.value)} placeholder="Enter a reason before blocking" className="w-full max-w-xl rounded-lg border px-3 py-2 text-sm outline-none" style={{ borderColor: '#d4e0e8' }} /></div>}
            </div> : view === 'wallet' ? <div><div className="border-b px-5 py-4"><p className="text-xs font-medium uppercase text-slate-500">Wallet balance</p><p className="mt-1 text-2xl font-bold text-slate-900">{money(walletBalance)}</p></div><RecordsTable type={view} rows={records} /></div> : <RecordsTable type={view} rows={records} />}
          </>}
        </section>
      )}
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500"><Icon size={14} />{label}</div><p className="mt-2 break-words text-sm font-semibold text-slate-800">{value}</p></div>;
}

function Breakdown({ title, rows }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold text-slate-800">{title}</h3>{rows.length ? <div className="mt-3 space-y-2">{rows.map(row => <div key={String(row.id)} className="flex items-center justify-between text-sm"><span className="text-slate-600">{row.name}</span><span className="font-semibold text-slate-900">{row.orders} order(s)</span></div>)}</div> : <p className="mt-3 text-sm text-slate-400">No order data</p>}</div>;
}
