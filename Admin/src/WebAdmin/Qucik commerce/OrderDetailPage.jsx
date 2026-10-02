import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import api from '../../api/axios';
import OrderDetailView from './components/orders/OrderDetailView';

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrder = useCallback(() => {
    setLoading(true);
    setError('');
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

  const transferStore = async (id, storeId) => {
    const { data } = await api.put(`/orders/${id}/transfer-store`, { storeId });
    setOrder(data);
    setAllOrders(prev => prev.map(o => o._id === data._id ? data : o));
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

      <OrderDetailView order={order} onStatusChange={updateStatus} onAssignRider={assignRider} onTransferStore={transferStore} />
    </div>
  );
}
