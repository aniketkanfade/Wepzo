import { useEffect, useState } from 'react';
import { Activity, Bike, CircleDollarSign, ClipboardList, Download, RefreshCw, Search, Store, UserRound, Users, Wallet } from 'lucide-react';
import { useAuthStore } from '../store/useStore';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import PaginationControls from '../WebAdmin/Qucik commerce/components/PaginationControls';

const money = value => `₹${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const displayDate = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function MetricCard({ label, value, note, icon: Icon }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{value}</p>{note && <p className="mt-1 text-[11px] leading-4 text-slate-500">{note}</p>}</div>
      <span className="rounded-lg bg-blue-50 p-2 text-blue-800"><Icon size={18}/></span>
    </div>
  </article>;
}

function ReportTable({ columns, rows, empty, filename }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const filterColumns = columns.filter(column => column.filterable);
  const filterKey = filterColumns.map(column => `${column.key}:${filters[column.key] || ''}`).join('|');
  const filteredRows = rows.filter(row => {
    const matchesSearch = !search.trim() || columns.some(column =>
      String(column.exportValue ? column.exportValue(row) : row[column.key] ?? '').toLowerCase().includes(search.trim().toLowerCase())
    );
    return matchesSearch && filterColumns.every(column =>
      !filters[column.key] || String(row[column.key] ?? '') === filters[column.key]
    );
  });
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startRow = filteredRows.length ? (currentPage - 1) * pageSize + 1 : 0;
  const endRow = Math.min(currentPage * pageSize, filteredRows.length);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [page, currentPage]);

  const exportExcel = () => {
    const quote = value => {
      let text = String(value ?? '');
      if (/^[\t\r=+@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = [
      columns.map(column => quote(column.label)).join(','),
      ...filteredRows.map(row => columns.map(column => quote(
        column.exportValue ? column.exportValue(row) : row[column.key] ?? ''
      )).join(',')),
    ].join('\r\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${filename || 'transactions-report'}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const updateFilter = (key, value) => {
    setFilters(current => ({ ...current, [key]: value }));
    setPage(1);
  };

  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
      <label className="relative min-w-[180px] flex-1">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Filter this list..." aria-label="Filter this list"
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/>
      </label>
      {filterColumns.map(column => {
        const options = [...new Set(rows.map(row => String(row[column.key] ?? '')).filter(Boolean))].sort((a, b) => a.localeCompare(b));
        return options.length > 1 && <select key={column.key} value={filters[column.key] || ''} onChange={event => updateFilter(column.key, event.target.value)} aria-label={`Filter by ${column.label}`}
          className="h-9 max-w-48 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-blue-400">
          <option value="">All {column.label}</option>
          {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>;
      })}
      <button type="button" onClick={exportExcel} disabled={!filteredRows.length} title="Export the filtered list as an Excel-compatible CSV"
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1a3a8a] px-3 text-sm font-semibold text-white hover:bg-[#15306f] disabled:cursor-not-allowed disabled:opacity-50">
        <Download size={15}/>Export Excel CSV
      </button>
      {(search || Object.values(filters).some(Boolean)) && <button type="button" onClick={() => { setSearch(''); setFilters({}); setPage(1); }}
        className="h-9 rounded-lg px-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Clear filters</button>}
    </div>
    <div className="max-h-[60vh] overflow-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr>{columns.map(column => <th key={column.key} className="whitespace-nowrap px-4 py-3">{column.label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{pageRows.length ? pageRows.map((row, index) => <tr key={row.id || row.orderNo || index} className="text-slate-700 hover:bg-slate-50/70">{columns.map(column => <td key={column.key} className="whitespace-nowrap px-4 py-3">{column.render ? column.render(row) : row[column.key] ?? '—'}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">{search || filterKey ? 'No rows match these filters.' : empty || 'No records found.'}</td></tr>}</tbody>
      </table>
    </div>
    <PaginationControls page={currentPage} totalPages={totalPages} total={filteredRows.length} perPage={pageSize}
      onPageChange={setPage} onPerPageChange={size => { setPageSize(size); setPage(1); }} label="rows"/>
  </section>;
}

export default function TransactionsReportsPage() {
  const { user } = useAuthStore();
  const isMainAdmin = user?.role === 'main_admin';
  const location = useLocation();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const sectionPath = location.pathname.replace(/^\/transactions-reports\/?/, '');
  const currentSection = sectionPath === 'transactions' ? 'orders'
    : sectionPath === 'website-owners' ? 'websiteOwners'
      : sectionPath || 'overview';

  useEffect(() => {
    const validSections = ['overview', 'orders', 'stores', 'riders', 'customers', 'websiteOwners'];
    if (!validSections.includes(currentSection) || (currentSection === 'websiteOwners' && !isMainAdmin)) {
      navigate('/transactions-reports', { replace: true });
    }
  }, [currentSection, isMainAdmin, navigate]);

  const loadReport = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/transactions-reports');
      setReport(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Transactions report could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadReport(); }, []);

  const customers = report?.customers || [];
  const storeRows = report?.stores || [];
  const riderRows = report?.riders || [];
  const ownerRows = isMainAdmin ? report?.websiteOwners || [] : [];
  const orderRows = report?.orders || [];

  return <div className="mx-auto max-w-[1600px] space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold text-slate-900">Transactions &amp; Reports</h1><p className="mt-1 text-sm text-slate-500">Financial totals and activity for {report?.scope?.module || 'the selected module'}.</p></div>
      <button type="button" onClick={() => loadReport(true)} disabled={loading || refreshing} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/>Refresh</button>
    </header>

    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    <div className="min-w-0 space-y-4">
    {loading ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading transactions and reports…</div> : report && <>
      {currentSection === 'overview' && <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Orders / transactions" value={(report.summary?.orderCount || 0).toLocaleString('en-IN')} note="Cancelled, failed and payment-pending orders excluded" icon={ClipboardList}/>
          <MetricCard label="Order sales" value={money(report.summary?.sales)} note="Value of non-cancelled orders" icon={CircleDollarSign}/>
          <MetricCard label="Delivered sales" value={money(report.summary?.deliveredSales)} note="Orders marked delivered" icon={Activity}/>
          <MetricCard label="Store withdrawals" value={money(report.summary?.storeWithdrawn)} note="Totals currently recorded on stores" icon={Wallet}/>
          <MetricCard label="Store amount remaining" value={money(report.summary?.storeRemaining)} note="Store sales less recorded withdrawals" icon={Store}/>
          <MetricCard label="Customer wallet balance" value={money(report.summary?.customerWalletBalance)} note="Balances recorded in customer wallets" icon={Users}/>
          {isMainAdmin && <MetricCard label="Website-owner payments" value={money(report.summary?.websiteOwnerPayments)} note="Paid website subscription / purchase payments" icon={UserRound}/>}
        </section>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">Store withdrawals are aggregate system totals, not individual payout rows. Rider and customer withdrawals are shown only when transaction records exist; this system does not currently keep a rider payout ledger.</p>
        <h2 className="text-base font-semibold text-slate-900">Recent transactions</h2>
        <ReportTable columns={[
          { key: 'orderNo', label: 'Order ID' },
          { key: 'date', label: 'Date', render: row => displayDate(row.date), exportValue: row => displayDate(row.date) },
          { key: 'customer', label: 'Customer' },
          { key: 'store', label: 'Store' },
          { key: 'rider', label: 'Rider' },
          { key: 'amount', label: 'Amount', render: row => money(row.amount) },
          { key: 'status', label: 'Status', filterable: true },
        ]} rows={orderRows.slice(0, 10)} filename="recent-transactions" empty="No transactions recorded."/>
      </>}

      {currentSection === 'orders' && <ReportTable columns={[
        { key: 'orderNo', label: 'Order ID' },
        { key: 'date', label: 'Date', render: row => displayDate(row.date), exportValue: row => displayDate(row.date) },
        { key: 'customer', label: 'Customer' },
        { key: 'store', label: 'Store' },
        { key: 'rider', label: 'Rider' },
        { key: 'payment', label: 'Payment', filterable: true },
        { key: 'amount', label: 'Amount', render: row => money(row.amount) },
        { key: 'status', label: 'Status', filterable: true },
      ]} rows={orderRows} filename="transactions" empty="No transactions recorded."/>}

      {currentSection === 'stores' && <ReportTable columns={[
        { key: 'name', label: 'Store' }, { key: 'owner', label: 'Owner' },
        { key: 'orderCount', label: 'Orders' }, { key: 'sales', label: 'Sales', render: row => money(row.sales) },
        { key: 'withdrawn', label: 'Withdrawn', render: row => money(row.withdrawn) },
        { key: 'remaining', label: 'Remaining', render: row => money(row.remaining) },
      ]} rows={storeRows} filename="store-financial-report" empty="No store financial records found."/>}

      {currentSection === 'riders' && <><p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">Delivered order value is not the same as rider earnings. This system currently has no rider payout ledger; withdrawal and balance show “Not recorded” unless the rider has explicit wallet values.</p><ReportTable columns={[
        { key: 'name', label: 'Rider' }, { key: 'phone', label: 'Phone' },
        { key: 'orderCount', label: 'Assigned orders' }, { key: 'deliveredCount', label: 'Delivered' },
        { key: 'deliveredOrderValue', label: 'Delivered order value', render: row => money(row.deliveredOrderValue) },
        { key: 'withdrawn', label: 'Withdrawn', render: row => row.withdrawn == null ? 'Not recorded' : money(row.withdrawn) },
        { key: 'remaining', label: 'Remaining balance', render: row => row.remaining == null ? 'Not recorded' : money(row.remaining) },
      ]} rows={riderRows} filename="rider-financial-report" empty="No delivery riders found."/></>}

      {currentSection === 'customers' && <ReportTable columns={[
        { key: 'name', label: 'Customer' }, { key: 'phone', label: 'Phone' },
        { key: 'orderCount', label: 'Orders' }, { key: 'spent', label: 'Order value', render: row => money(row.spent) },
        { key: 'walletWithdrawn', label: 'Wallet withdrawals', render: row => row.walletWithdrawn == null ? 'Not recorded' : money(row.walletWithdrawn) },
        { key: 'walletBalance', label: 'Wallet remaining', render: row => money(row.walletBalance) },
        { key: 'walletTransactions', label: 'Wallet transactions' },
      ]} rows={customers} filename="customer-financial-report" empty="No customer financial records found."/>}

      {currentSection === 'websiteOwners' && isMainAdmin && <><p className="text-sm text-slate-500">Main Admin only. This section is not part of tenant Website Access settings.</p><ReportTable columns={[
        { key: 'name', label: 'Website owner' }, { key: 'email', label: 'Email' },
        { key: 'website', label: 'Website' }, { key: 'module', label: 'Module' },
        { key: 'status', label: 'Purchase status', filterable: true }, { key: 'paymentCount', label: 'Paid transactions' },
        { key: 'paidAmount', label: 'Paid amount', render: row => money(row.paidAmount) },
        { key: 'balanceDue', label: 'Balance due', render: row => money(row.balanceDue) },
      ]} rows={ownerRows} filename="website-owner-payments" empty="No website-owner payment records found."/></>}
    </>}
    </div>
  </div>;
}
