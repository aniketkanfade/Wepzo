import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Eye, Printer, Download, ChevronDown, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import AdminListLayout from '../components/AdminListLayout';
import { useListPagination } from '../hooks/useListPagination';
import { printOrderInvoice } from '../utils/orderPrint';
import { ORDER_STATUS_SLUGS, ORDER_STATUS_STYLE } from '../constants/orderStatus';
import { LIST_TEAL, listBtnOutline, listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass } from '../constants/listTheme';

const TITLES = {
  scheduled: 'Scheduled Orders',
  pending: 'Pending Orders',
  accepted: 'Accepted Orders',
  processing: 'Processing Orders',
  'out-for-delivery': 'Out for Delivery',
  delivered: 'Delivered Orders',
  cancelled: 'Cancelled Orders',
  'returns-refunds': 'Returns / Refunds',
  failed: 'Failed Orders',
};

export default function OrdersPage() {
  const { status } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRecent = searchParams.get('sort') === 'recent';
  const [allOrders, setAllOrders] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const stopRow = (e) => e.stopPropagation();

  const title = status ? (TITLES[status] || 'Orders') : (isRecent ? 'Recent Orders' : 'All Orders');
  const routeStatus = status && ORDER_STATUS_SLUGS[status] ? ORDER_STATUS_SLUGS[status] : null;

  const loadOrders = useCallback(() => {
    setLoading(true);
    setLoadError('');
    api.get('/orders', { params: isRecent ? { sort: 'recent' } : {} })
      .then(r => setAllOrders(Array.isArray(r.data) ? r.data : []))
      .catch(() => {
        setAllOrders([]);
        setLoadError('Orders load nahi ho paaye. Backend restart karein (port 5000) aur phir retry karein.');
      })
      .finally(() => setLoading(false));
  }, [isRecent]);

  useEffect(() => { loadOrders(); }, [loadOrders, location.pathname, isRecent]);

  const filtered = useMemo(() => {
    let list = [...allOrders];
    if (routeStatus) list = list.filter(o => o.status === routeStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        String(o.orderNo || o.orderId || '').toLowerCase().includes(q) ||
        String(o.customer || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [allOrders, routeStatus, search]);

  const { page, setPage, perPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [search, status] });

  const openOrder = (order) => navigate(`/orders/view/${order._id}`);

  return (
    <AdminListLayout
      breadcrumb={<>Dashboard &gt; Orders &gt; <span className="text-gray-600">{title}</span></>}
      filterBar={isRecent && !status ? (
        <div className="mx-1 mb-3 px-4 py-2.5 bg-[#f0f4ff] border rounded-xl text-xs font-medium text-[#1a3a8a] flex items-center justify-between gap-2" style={{ borderColor: '#e0e4ec' }}>
          <span>Showing recent orders — newest first (Dashboard filter)</span>
          <button type="button" onClick={() => navigate('/orders')} className="text-primary-600 hover:underline shrink-0">Clear filter</button>
        </div>
      ) : null}
      title={title}
      icon={ClipboardList}
      count={filtered.length}
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      onSearchSubmit={() => setSearch(searchInput.trim())}
      searchPlaceholder="Ex : search order id or customer"
      page={page}
      totalPages={totalPages}
      total={total}
      perPage={perPage}
      onPageChange={setPage}
      showPagination={!loading && !loadError}
      isEmpty={!loading && !loadError && paginated.length === 0}
      emptyMessage="Koi order nahi mila"
      headerActions={(
        <>
          <button type="button" onClick={loadOrders} disabled={loading}
            className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50 ${listBtnOutline}`}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button type="button" className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${listBtnOutline}`}>
            <Download size={14} /> Export <ChevronDown size={12} />
          </button>
        </>
      )}
    >
      {loading ? (
        <div className="px-5 py-20 text-center text-gray-400">Orders load ho rahe hain...</div>
      ) : loadError ? (
        <div className="px-5 py-20 text-center">
          <p className="text-red-500 mb-3">{loadError}</p>
          <button type="button" onClick={loadOrders} className="px-4 py-2 bg-[#1a3a8a] text-white rounded-lg text-sm">Retry</button>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className={listTheadClass} style={listTheadStyle}>
              <th className={`${listThClass} w-14`}>SI</th>
              <th className={listThClass}>Order Id</th>
              <th className={listThClass}>Order Date</th>
              <th className={listThClass}>Customer Information</th>
              <th className={listThClass}>Store</th>
              <th className={`${listThClass} text-center`}>Item Quantity</th>
              <th className={listThClass}>Total Amount</th>
              <th className={listThClass}>Order Status</th>
              <th className={`${listThClass} w-24`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((order, i) => (
              <tr key={order._id} onClick={() => openOrder(order)} className={listRowClass} style={listRowStyle}>
                <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
                <td className={listTdClass}>
                  <span className="font-semibold" style={{ color: LIST_TEAL }}>{order.orderNo || order.orderId}</span>
                </td>
                <td className={`${listTdClass} text-gray-600 text-xs whitespace-nowrap`}>{order.orderDate || order.date}</td>
                <td className={listTdClass}>
                  <p className="font-medium text-gray-800">{order.customer}</p>
                  {order.invalidCustomer && (
                    <span className="inline-block mt-0.5 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Invalid Customer Data</span>
                  )}
                </td>
                <td className={`${listTdClass} text-gray-700`}>{order.store}</td>
                <td className={`${listTdClass} text-center tabular-nums`}>{order.items}</td>
                <td className={listTdClass}>
                  <p className="font-semibold text-gray-900">₹ {order.amount?.toLocaleString('en-IN')}</p>
                  <p className={`text-[11px] font-medium ${order.paymentStatus === 'Paid' ? 'text-green-600' : 'text-red-500'}`}>
                    {order.paymentStatus || 'Unpaid'}
                  </p>
                </td>
                <td className={listTdClass}>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${ORDER_STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status}
                  </span>
                  <p className="text-[11px] text-gray-400 mt-1">{order.deliveryType || 'Home Delivery'}</p>
                </td>
                <td className={listTdClass} onClick={stopRow}>
                  <div className="flex items-center gap-2">
                    <button type="button" title="View" onClick={() => openOrder(order)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border text-orange-500 hover:bg-orange-50" style={{ borderColor: '#fdba74' }}>
                      <Eye size={15} />
                    </button>
                    <button type="button" title="Print" onClick={() => printOrderInvoice(order)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border text-[#1a3a8a] hover:bg-[#f0f4ff]" style={{ borderColor: '#b8c9e8' }}>
                      <Printer size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminListLayout>
  );
}
