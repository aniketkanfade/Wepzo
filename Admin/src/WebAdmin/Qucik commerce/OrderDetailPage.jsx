import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import api from '../../api/axios';
import OrderDetailView from './components/orders/OrderDetailView';

function fmtMoney(value) {
  return `₹ ${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function orderItemsErrorMessage(err) {
  const serverMessage = err.response?.data?.message;
  if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
  if (!err.response) {
    return err.code === 'ECONNABORTED'
      ? 'Server response timed out. Check the connection and try again.'
      : 'Could not connect to the server. The order was not confirmed as saved.';
  }
  if (err.response.status === 404) {
    return 'The server does not have the order update API yet. Deploy the latest backend and try again.';
  }
  return `Order items could not be updated (HTTP ${err.response.status}).`;
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [itemsNotice, setItemsNotice] = useState('');

  const loadOrder = useCallback(() => {
    setLoading(true);
    setError('');
    setItemsNotice('');
    Promise.all([
      api.get(`/orders/detail/${orderId}`),
      api.get('/orders').catch(() => ({ data: [] })),
    ])
      .then(([detailRes, listRes]) => {
        setOrder(detailRes.data);
        setAllOrders(Array.isArray(listRes.data) ? listRes.data : []);
      })
      .catch(() => {
        setOrder(null);
        setError('Order nahi mila.');
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  useEffect(() => {
    if (!order || ['Delivered', 'Cancelled'].includes(order.status)) return undefined;
    let live = true;
    const timer = window.setInterval(() => {
      api.get(`/orders/detail/${encodeURIComponent(orderId)}`).then(({ data }) => {
        if (!live) return;
        setOrder(data);
        setAllOrders(previous => previous.map(item => item._id === data._id ? data : item));
      }).catch(() => {});
    }, 8000);
    return () => { live = false; window.clearInterval(timer); };
  }, [orderId, order?.status]);

  const currentIndex = order ? allOrders.findIndex(o => o._id === order._id) : -1;

  const updateStatus = async (id, newStatus) => {
    try {
      const { data } = await api.put(`/orders/${id}`, { status: newStatus });
      setOrder(data);
      setAllOrders(prev => prev.map(o => o._id === data._id ? data : o));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Status update failed' };
    }
  };

  const assignRider = async (id, riderId) => {
    const { data } = await api.put(`/orders/${id}/assign-rider`, { riderId });
    setOrder(data);
    setAllOrders(prev => prev.map(o => o._id === data._id ? data : o));
  };

  const assignPartner = async (id, partnerDetails) => {
    const { data } = await api.put(`/orders/${id}/assign-partner`, partnerDetails);
    setOrder(data);
    setAllOrders(prev => prev.map(o => o._id === data._id ? data : o));
  };

  const transferStore = async (id, storeId) => {
    const { data } = await api.put(`/orders/${id}/transfer-store`, { storeId });
    setOrder(data);
    setAllOrders(prev => prev.map(o => o._id === data._id ? data : o));
  };

  const updateItems = async (id, payload) => {
    try {
      const { data } = await api.put(`/orders/${encodeURIComponent(id)}/items`, payload);
      setOrder(data);
      setAllOrders(prev => prev.map(o => o._id === data._id ? data : o));
      const latestRefund = [...(data.itemAdjustments || [])].reverse().find(item => item.type === 'refund' && item.requestId === payload.requestId);
      const due = Number(data.amountDueOnDelivery) || 0;
      setItemsNotice(latestRefund
        ? latestRefund.status === 'completed'
          ? `Bill updated. ${fmtMoney(latestRefund.amount)} was refunded to the original ${latestRefund.gateway} payment method.`
          : `${fmtMoney(latestRefund.amount)} refund is ${latestRefund.status} with the original ${latestRefund.gateway} payment method.`
        : due > 0
          ? `Bill updated. ${fmtMoney(due)} ${String(data.paymentStatus || '').toLowerCase() === 'paid' ? 'extra COD' : 'COD'} will be collected at delivery.`
          : 'Products and bill updated.');
      return { ok: true };
    } catch (err) {
      return { ok: false, message: orderItemsErrorMessage(err) };
    }
  };

  const goToOrder = (idx) => {
    if (idx >= 0 && idx < allOrders.length) navigate(`/orders/view/${allOrders[idx]._id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
        <Loader2 size={28} className="animate-spin text-primary-500" />
        <p className="text-sm">Order load ho raha hai...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-red-500 font-medium mb-4">{error || 'Order not found'}</p>
        <Link to="/orders" className="text-sm text-primary-600 hover:underline font-medium">← Back to Orders</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <button type="button" onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 font-medium transition mb-1">
            <ArrowLeft size={15} /> Back to Orders
          </button>
          <p className="text-xs text-gray-400">
            Dashboard &rsaquo; Order Management &rsaquo; Order Details
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          <button type="button" disabled={currentIndex <= 0} onClick={() => goToOrder(currentIndex - 1)}
            className="p-2 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <span className="text-xs text-gray-400 font-medium px-2 min-w-[60px] text-center">
            {currentIndex + 1} / {allOrders.length}
          </span>
          <button type="button" disabled={currentIndex < 0 || currentIndex >= allOrders.length - 1}
            onClick={() => goToOrder(currentIndex + 1)}
            className="p-2 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      <OrderDetailView order={order} onStatusChange={updateStatus} onAssignRider={assignRider} onAssignPartner={assignPartner} onTransferStore={transferStore} onUpdateItems={updateItems} itemsNotice={itemsNotice} />
    </div>
  );
}
