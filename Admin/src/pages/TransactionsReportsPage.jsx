import { useEffect, useMemo, useState } from 'react';
import { Activity, Bike, CircleDollarSign, ClipboardList, RefreshCw, Store, UserRound, Users, Wallet } from 'lucide-react';
import { useAuthStore } from '../store/useStore';
import api from '../api/axios';

const sections = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'orders', label: 'Transactions', icon: ClipboardList },
  { id: 'stores', label: 'Stores', icon: Store },
  { id: 'riders', label: 'Riders', icon: Bike },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'websiteOwners', label: 'Website Owners', icon: UserRound, mainAdminOnly: true },
];

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

function ReportTable({ columns, rows, empty }) {
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr>{columns.map(column => <th key={column.key} className="px-4 py-3">{column.label}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{rows.length ? rows.map((row, index) => <tr key={row.id || row.orderNo || index} className="text-slate-700 hover:bg-slate-50/70">{columns.map(column => <td key={column.key} className="px-4 py-3">{column.render ? column.render(row) : row[column.key] ?? '—'}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">{empty || 'No records found.'}</td></tr>}</tbody>
    </table></div>
  </div>;
}

export default function TransactionsReportsPage() {
  const { user } = useAuthStore();
  const isMainAdmin = user?.role === 'main_admin';
  const [report, setReport] = useState(null);
  const [section, setSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const visibleSections = useMemo(() => sections.filter(item => !item.mainAdminOnly || isMainAdmin), [isMainAdmin]);

  const loadReport = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/transactions-reports');
      setReport(data);
      if (data?.websiteOwners === undefined && section === 'websiteOwners') setSection('overview');
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
  const currentSection = visibleSections.some(item => item.id === section) ? section : 'overview';

  return <div className="mx-auto max-w-[1600px] space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold text-slate-900">Transactions &amp; Reports</h1><p className="mt-1 text-sm text-slate-500">Financial totals and activity for {report?.scope?.module || 'the selected module'}.</p></div>
      <button type="button" onClick={() => loadReport(true)} disabled={loading || refreshing} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/>Refresh</button>
    </header>

    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    <div className="grid items-start gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
    <nav aria-label="Transactions report sections" className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible">
      {visibleSections.map(item => {
        const Icon = item.icon;
        return <button key={item.id} type="button" onClick={() => setSection(item.id)} aria-current={currentSection === item.id ? 'page' : undefined} className={`inline-flex h-10 shrink-0 items-center justify-start gap-2 rounded-lg border px-3 text-sm font-medium transition lg:w-full ${currentSection === item.id ? 'border-blue-800 bg-blue-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-800'}`}><Icon size={16}/>{item.label}</button>;
      })}
    </nav>

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
          { key: 'date', label: 'Date', render: row => displayDate(row.date) },
          { key: 'customer', label: 'Customer' },
          { key: 'store', label: 'Store' },
          { key: 'rider', label: 'Rider' },
          { key: 'amount', label: 'Amount', render: row => money(row.amount) },
          { key: 'status', label: 'Status' },
        ]} rows={orderRows.slice(0, 10)} empty="No transactions recorded."/>
      </>}

      {currentSection === 'orders' && <ReportTable columns={[
        { key: 'orderNo', label: 'Order ID' },
        { key: 'date', label: 'Date', render: row => displayDate(row.date) },
        { key: 'customer', label: 'Customer' },
        { key: 'store', label: 'Store' },
        { key: 'rider', label: 'Rider' },
        { key: 'payment', label: 'Payment' },
        { key: 'amount', label: 'Amount', render: row => money(row.amount) },
        { key: 'status', label: 'Status' },
      ]} rows={orderRows} empty="No transactions recorded."/>}

      {currentSection === 'stores' && <ReportTable columns={[
        { key: 'name', label: 'Store' }, { key: 'owner', label: 'Owner' },
        { key: 'orderCount', label: 'Orders' }, { key: 'sales', label: 'Sales', render: row => money(row.sales) },
        { key: 'withdrawn', label: 'Withdrawn', render: row => money(row.withdrawn) },
        { key: 'remaining', label: 'Remaining', render: row => money(row.remaining) },
      ]} rows={storeRows} empty="No store financial records found."/>}

      {currentSection === 'riders' && <><p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">Delivered order value is not the same as rider earnings. This system currently has no rider payout ledger; withdrawal and balance show “Not recorded” unless the rider has explicit wallet values.</p><ReportTable columns={[
        { key: 'name', label: 'Rider' }, { key: 'phone', label: 'Phone' },
        { key: 'orderCount', label: 'Assigned orders' }, { key: 'deliveredCount', label: 'Delivered' },
        { key: 'deliveredOrderValue', label: 'Delivered order value', render: row => money(row.deliveredOrderValue) },
        { key: 'withdrawn', label: 'Withdrawn', render: row => row.withdrawn == null ? 'Not recorded' : money(row.withdrawn) },
        { key: 'remaining', label: 'Remaining balance', render: row => row.remaining == null ? 'Not recorded' : money(row.remaining) },
      ]} rows={riderRows} empty="No delivery riders found."/></>}

      {currentSection === 'customers' && <ReportTable columns={[
        { key: 'name', label: 'Customer' }, { key: 'phone', label: 'Phone' },
        { key: 'orderCount', label: 'Orders' }, { key: 'spent', label: 'Order value', render: row => money(row.spent) },
        { key: 'walletWithdrawn', label: 'Wallet withdrawals', render: row => row.walletWithdrawn == null ? 'Not recorded' : money(row.walletWithdrawn) },
        { key: 'walletBalance', label: 'Wallet remaining', render: row => money(row.walletBalance) },
        { key: 'walletTransactions', label: 'Wallet transactions' },
      ]} rows={customers} empty="No customer financial records found."/>}

      {currentSection === 'websiteOwners' && isMainAdmin && <><p className="text-sm text-slate-500">Main Admin only. This section is not part of tenant Website Access settings.</p><ReportTable columns={[
        { key: 'name', label: 'Website owner' }, { key: 'email', label: 'Email' },
        { key: 'website', label: 'Website' }, { key: 'module', label: 'Module' },
        { key: 'status', label: 'Purchase status' }, { key: 'paymentCount', label: 'Paid transactions' },
        { key: 'paidAmount', label: 'Paid amount', render: row => money(row.paidAmount) },
        { key: 'balanceDue', label: 'Balance due', render: row => money(row.balanceDue) },
      ]} rows={ownerRows} empty="No website-owner payment records found."/></>}
    </>}
    </div>
    </div>
  </div>;
}
