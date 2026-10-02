import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ChevronDown, ChevronLeft, ChevronRight, Eye, Printer, Download,
  ShoppingBag, CalendarClock, Clock, PackageCheck, PackageX,
} from 'lucide-react';
import { useListPagination } from '../../../../hooks/useListPagination';
import { printOrderInvoice } from '../orders/orderPrint';
import { ORDER_STATUS_STYLE } from '../../../../constants/orderStatus';
import {
  LIST_NAVY as NAVY, LIST_TEAL as TEAL, LIST_CARD_BORDER as CARD_BORDER, LIST_PER_PAGE as perPage,
  listBtnNavy, listBtnOutline, listTheadClass, listTheadStyle, listThClass,
  listRowClass, listRowStyle, listTdClass,
} from '../../../../constants/listTheme';

const STAT_FILTERS = [
  { key: 'all', label: 'All', color: '#1a3a8a', icon: ShoppingBag },
  { key: 'Scheduled', label: 'Scheduled', color: '#f59e0b', icon: CalendarClock },
  { key: 'Pending', label: 'Pending', color: '#6b7280', icon: Clock },
  { key: 'Delivered', label: 'Delivered', color: '#16a34a', icon: PackageCheck },
  { key: 'Cancelled', label: 'Canceled', color: '#ef4444', icon: PackageX },
];

function splitOrderDate(raw) {
  const text = raw || '';
  const match = text.match(/^(.+?\d{4})\s+(.+)$/);
  if (match) return { date: match[1].trim(), time: match[2].trim() };
  const parts = text.split(' ');
  if (parts.length >= 4) {
    return { date: parts.slice(0, 3).join(' '), time: parts.slice(3).join(' ') };
  }
  return { date: text, time: '' };
}

function formatPhone(phone) {
  if (!phone) return '';
  const p = String(phone);
  if (p.startsWith('+')) return p;
  if (p.length === 10) return `+91${p}`;
  return p;
}

function exportOrders(orders, storeName) {
  const rows = [['SI', 'Order ID', 'Date', 'Customer', 'Phone', 'Payment Status', 'Total', 'Order Status']];
  orders.forEach((o, i) => {
    rows.push([
      i + 1,
      o.orderNo || o.orderId,
      o.orderDate || o.date || '',
      o.customer || '',
      o.phone || '',
      o.paymentStatus || 'Unpaid',
      o.amount ?? 0,
      o.status || '',
    ]);
  });
  const blob = new Blob([rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(storeName || 'store').replace(/\s+/g, '_')}_orders.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function StoreOrdersTab({ store, orders, loading }) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const stopRow = (e) => e.stopPropagation();

  const stats = useMemo(() => ({
    all: orders.length,
    Scheduled: orders.filter(o => o.status === 'Scheduled').length,
    Pending: orders.filter(o => o.status === 'Pending').length,
    Delivered: orders.filter(o => o.status === 'Delivered').length,
    Cancelled: orders.filter(o => o.status === 'Cancelled').length,
  }), [orders]);

  const filtered = useMemo(() => {
    let list = [...orders];
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(o =>
        String(o.orderNo || o.orderId || '').toLowerCase().includes(q) ||
        String(o.customer || '').toLowerCase().includes(q) ||
        String(o.phone || '').includes(q)
      );
    }
    return list;
  }, [orders, statusFilter, search]);

  const { page, setPage, totalPages, paginated } = useListPagination(filtered, { resetDeps: [search, statusFilter] });

  const runSearch = () => { setSearch(searchInput.trim()); setPage(1); };

  const btnNavy = listBtnNavy;
  const btnOutline = listBtnOutline;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
        <span className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        Orders load ho rahe hain...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: CARD_BORDER }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
          {STAT_FILTERS.map(({ key, label, color, icon: Icon }) => {
            const count = key === 'all' ? stats.all : stats[key] ?? 0;
            const active = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => { setStatusFilter(key); setPage(1); }}
                className={`flex items-center gap-3 px-5 py-4 text-left transition hover:bg-gray-50/80 ${active ? 'bg-[#f8faff]' : ''}`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}18` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <p className="text-xl font-bold tabular-nums" style={{ color }}>{count}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col rounded-xl border shadow-sm overflow-hidden bg-white" style={{ borderColor: CARD_BORDER }}>
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={18} style={{ color: NAVY }} strokeWidth={2.25} />
            <h2 className="text-base font-bold tracking-tight" style={{ color: NAVY }}>Orders</h2>
            <span className="text-sm font-medium px-2.5 py-0.5 rounded-full min-w-[1.75rem] text-center tabular-nums"
              style={{ backgroundColor: '#eef2f8', color: NAVY }}>
              {filtered.length}
            </span>
          </div>

          <div className="flex flex-1 max-w-md mx-auto min-w-[200px]">
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              placeholder="Ex : order id"
              className="flex-1 pl-4 pr-2 py-2.5 border rounded-l-lg text-sm outline-none bg-white text-gray-700"
              style={{ borderColor: '#e0e4ec' }}
            />
            <button type="button" onClick={runSearch} className={`px-4 rounded-r-lg transition ${btnNavy}`}>
              <Search size={16} />
            </button>
          </div>

          <button type="button" onClick={() => exportOrders(filtered, store.name)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition ${btnOutline}`}>
            <Download size={14} /> Export <ChevronDown size={12} className="text-gray-400" />
          </button>
        </div>

        <div className="overflow-x-auto dropdown-scroll">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className={listTheadClass} style={listTheadStyle}>
                <th className={`${listThClass} w-14`}>SI</th>
                <th className={listThClass}>Order</th>
                <th className={listThClass}>Date</th>
                <th className={`${listThClass} min-w-[160px]`}>Customer</th>
                <th className={listThClass}>Payment Status</th>
                <th className={listThClass}>Total</th>
                <th className={listThClass}>Order Status</th>
                <th className={`${listThClass} w-24`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-gray-400">
                    {orders.length === 0 ? 'Is store ke liye koi order nahi' : 'Filter / search mein koi order nahi mila'}
                  </td>
                </tr>
              ) : paginated.map((order, i) => {
                const { date, time } = splitOrderDate(order.orderDate || order.date);
                const paid = order.paymentStatus === 'Paid';
                return (
                  <tr
                    key={order._id}
                    onClick={() => navigate(`/orders/view/${order._id}`)}
                    className={listRowClass}
                    style={listRowStyle}
                  >
                    <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
                    <td className={listTdClass}>
                      <span className="font-semibold" style={{ color: TEAL }}>{order.orderNo || order.orderId}</span>
                    </td>
                    <td className={`${listTdClass} text-gray-600 whitespace-nowrap`}>
                      <p className="text-xs font-medium">{date}</p>
                      {time && <p className="text-[11px] text-gray-400 mt-0.5">{time}</p>}
                    </td>
                    <td className={listTdClass}>
                      <p className="font-medium text-gray-800">{order.customer}</p>
                      {order.phone && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{formatPhone(order.phone)}</p>
                      )}
                    </td>
                    <td className={listTdClass}>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        paid ? 'bg-green-50 text-green-600' : 'bg-pink-50 text-pink-600'
                      }`}>
                        {order.paymentStatus || 'Unpaid'}
                      </span>
                    </td>
                    <td className={`${listTdClass} font-semibold text-gray-900 tabular-nums whitespace-nowrap`}>
                      ₹ {Number(order.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className={listTdClass}>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                        ORDER_STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-700'
                      }`}>
                        {order.status === 'Cancelled' ? 'Canceled' : order.status}
                      </span>
                    </td>
                    <td className={listTdClass} onClick={stopRow}>
                      <div className="flex items-center gap-2">
                        <button type="button" title="View"
                          onClick={() => navigate(`/orders/view/${order._id}`)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg border text-orange-500 hover:bg-orange-50 transition"
                          style={{ borderColor: '#fdba74' }}>
                          <Eye size={15} />
                        </button>
                        <button type="button" title="Print"
                          onClick={() => printOrderInvoice(order)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg border text-[#1a3a8a] hover:bg-[#f0f4ff] transition"
                          style={{ borderColor: '#b8c9e8' }}>
                          <Printer size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > perPage && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t bg-white" style={{ borderColor: CARD_BORDER }}>
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className={`p-2 rounded-lg disabled:opacity-40 transition ${btnOutline}`}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => typeof p === 'string' ? (
                  <span key={`gap-${i}`} className="w-8 text-center text-gray-400 text-sm">…</span>
                ) : (
                  <button key={p} type="button" onClick={() => setPage(p)}
                    className={`min-w-9 h-9 px-1 rounded-lg text-sm font-medium transition ${page === p ? btnNavy : btnOutline}`}>
                    {p}
                  </button>
                ))}
              <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className={`p-2 rounded-lg disabled:opacity-40 transition ${btnOutline}`}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
