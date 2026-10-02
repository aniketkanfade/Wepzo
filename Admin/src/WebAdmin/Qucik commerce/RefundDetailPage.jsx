import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import api from '../../api/axios';
import RefundDetailView from './components/orders/RefundDetailView';

export default function RefundDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [refundList, setRefundList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/orders/detail/${orderId}`),
      api.get('/orders/refunds', { params: { type: 'requests' } }).catch(() => ({ data: [] })),
    ])
      .then(([detailRes, listRes]) => {
        setOrder(detailRes.data);
        setRefundList(Array.isArray(listRes.data) ? listRes.data : []);
      })
      .catch(() => {
        setOrder(null);
        setError('Refund request nahi mili.');
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => { loadData(); }, [loadData]);

  const currentIndex = order ? refundList.findIndex(o => o._id === order._id) : -1;
  const isRefunded = order?.refundStatus === 'refunded';

  const handleAction = async (id, action) => {
    const payloads = {
      accept: { refundStatus: 'refunded', status: 'Returns/Refunds', refundAdmin: 'Admin' },
      reject: { refundStatus: 'rejected', refundAdmin: 'Admin' },
      cancel: { refundStatus: 'cancelled', refundAdmin: 'Admin' },
    };
    try {
      const { data } = await api.put(`/orders/${id}`, payloads[action]);
      setOrder(data);
      if (action === 'accept') {
        navigate('/orders/refunds/refunded');
      } else {
        navigate('/orders/refunds/requests');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const goToRefund = (idx) => {
    if (idx >= 0 && idx < refundList.length) navigate(`/orders/refunds/view/${refundList[idx]._id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
        <Loader2 size={28} className="animate-spin text-primary-500" />
        <p className="text-sm">Refund load ho raha hai...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-red-500 font-medium mb-4">{error || 'Not found'}</p>
        <Link to="/orders/refunds/requests" className="text-sm text-primary-600 hover:underline font-medium">← Back to Refund Requests</Link>
      </div>
    );
  }

  const backPath = isRefunded ? '/orders/refunds/refunded' : '/orders/refunds/requests';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <button type="button" onClick={() => navigate(backPath)}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 font-medium transition mb-1">
            <ArrowLeft size={15} /> Back to Refunds
          </button>
          <p className="text-xs text-gray-400">Dashboard &rsaquo; Order Refunds &rsaquo; Refund Details</p>
        </div>
        {!isRefunded && refundList.length > 1 && (
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            <button type="button" disabled={currentIndex <= 0} onClick={() => goToRefund(currentIndex - 1)}
              className="p-2 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition">
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <span className="text-xs text-gray-400 font-medium px-2 min-w-[50px] text-center">
              {currentIndex + 1} / {refundList.length}
            </span>
            <button type="button" disabled={currentIndex < 0 || currentIndex >= refundList.length - 1}
              onClick={() => goToRefund(currentIndex + 1)}
              className="p-2 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition">
              <ChevronRight size={16} className="text-gray-600" />
            </button>
          </div>
        )}
      </div>

      <RefundDetailView order={order} onAction={handleAction} readOnly={isRefunded} />
    </div>
  );
}
