import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { RotateCcw, Eye } from 'lucide-react';
import api from '../api/axios';
import AdminListLayout from '../components/AdminListLayout';
import { useListPagination } from '../hooks/useListPagination';
import { LIST_NAVY, LIST_TEAL, listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass } from '../constants/listTheme';

export default function RefundsPage() {
  const { type } = useParams();
  const navigate = useNavigate();
  const isRefunded = type === 'refunded';
  const [items, setItems] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const stopRow = (e) => e.stopPropagation();

  useEffect(() => {
    api.get('/orders/refunds', { params: { type: isRefunded ? 'refunded' : 'requests' } })
      .then(r => setItems(r.data)).catch(() => {});
  }, [isRefunded]);

  const filtered = items.filter(o =>
    String(o.orderNo).toLowerCase().includes(search.toLowerCase()) ||
    o.customer.toLowerCase().includes(search.toLowerCase())
  );

  const { page, setPage, perPage, totalPages, paginated, total } = useListPagination(filtered, { resetDeps: [search, isRefunded] });
  const title = isRefunded ? 'Refunded Orders' : 'Refund Requests';

  return (
    <AdminListLayout
      breadcrumb={<>Dashboard &gt; Order Management &gt; Order Refunds &gt; <span className="text-gray-600">{title}</span></>}
      title={title}
      icon={RotateCcw}
      count={filtered.length}
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      onSearchSubmit={() => setSearch(searchInput.trim())}
      searchPlaceholder="Search order or customer..."
      page={page}
      totalPages={totalPages}
      total={total}
      perPage={perPage}
      onPageChange={setPage}
      isEmpty={paginated.length === 0}
      emptyMessage="Koi record nahi mila"
      beforeCard={(
        <div className="flex gap-1 px-1">
          <Link to="/orders/refunds/requests"
            className={`px-3 py-1.5 text-xs rounded-lg border transition ${!isRefunded ? 'font-medium' : 'text-gray-500 hover:bg-white'}`}
            style={!isRefunded ? { backgroundColor: '#eef2f8', borderColor: '#c5d0e8', color: LIST_NAVY } : { borderColor: '#e0e4ec' }}>
            Refund Requests
          </Link>
          <Link to="/orders/refunds/refunded"
            className={`px-3 py-1.5 text-xs rounded-lg border transition ${isRefunded ? 'font-medium' : 'text-gray-500 hover:bg-white'}`}
            style={isRefunded ? { backgroundColor: '#eef2f8', borderColor: '#c5d0e8', color: LIST_NAVY } : { borderColor: '#e0e4ec' }}>
            Refunded Orders
          </Link>
        </div>
      )}
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className={listTheadClass} style={listTheadStyle}>
            <th className={`${listThClass} w-14`}>#</th>
            <th className={listThClass}>Order No</th>
            <th className={listThClass}>Customer</th>
            <th className={listThClass}>Store</th>
            <th className={listThClass}>Amount</th>
            <th className={listThClass}>Reason</th>
            <th className={listThClass}>Date</th>
            <th className={listThClass}>Status</th>
            <th className={listThClass}>Action</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((order, i) => (
            <tr
              key={order._id}
              className={listRowClass}
              style={listRowStyle}
              onClick={() => navigate(`/orders/refunds/view/${order._id}`)}
            >
              <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
              <td className={`${listTdClass} font-medium`} style={{ color: LIST_NAVY }}>{order.orderNo}</td>
              <td className={listTdClass}>{order.customer}</td>
              <td className={listTdClass}>
                <span className="font-medium text-sm" style={{ color: LIST_TEAL }}>{order.store}</span>
              </td>
              <td className={`${listTdClass} font-semibold tabular-nums`}>₹ {(order.refundAmount || order.amount)?.toLocaleString('en-IN')}</td>
              <td className={`${listTdClass} text-gray-600 text-xs max-w-[120px] truncate`}>{order.refundReason || '—'}</td>
              <td className={`${listTdClass} text-gray-500`}>{order.refundRequestedAt || order.date}</td>
              <td className={listTdClass}>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${isRefunded ? 'bg-green-100 text-green-700' : 'bg-teal-100 text-teal-700'}`}>
                  {isRefunded ? 'Refunded' : 'Pending'}
                </span>
              </td>
              <td className={listTdClass} onClick={stopRow}>
                <button type="button" onClick={() => navigate(`/orders/refunds/view/${order._id}`)}
                  className="p-1.5 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 hover:text-[#1a3a8a]">
                  <Eye size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminListLayout>
  );
}
