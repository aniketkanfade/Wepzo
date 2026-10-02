import { useState } from 'react';
import {
  RotateCcw, Check, X, Ban, User, MapPin, Store, Phone, Mail, Bike,
  ImageIcon, Navigation, Package, ShoppingBag, Calendar,
} from 'lucide-react';
import ConfirmModal from '../ConfirmModal';

const REFUND_METHODS = { wallet: 'Wallet', cod: 'COD', upi: 'UPI', card: 'Card' };

function InfoCard({ title, icon: Icon, iconBg, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
        <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg || 'bg-gray-50'}`}>
            {Icon && <Icon size={14} className="text-gray-600" />}
          </span>
          {title}
        </p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function RowField({ label, value, valueClass = 'text-gray-800 font-medium' }) {
  return (
    <div className="flex items-start gap-2 text-sm py-1">
      <span className="text-gray-500 shrink-0">{label} :</span>
      <span className={`flex-1 ${valueClass}`}>{value || '—'}</span>
    </div>
  );
}

function hasAssignedRider(rider) {
  return !!(rider?.name && rider?.phone);
}

export default function RefundDetailView({ order, onAction, readOnly }) {
  const [confirm, setConfirm] = useState(null);

  if (!order) return null;

  const images = order.refundImages?.length
    ? order.refundImages
    : (order.products || []).map(p => p.image).filter(Boolean);

  const amount = order.refundAmount ?? order.amount;
  const method = REFUND_METHODS[order.refundMethod] || order.refundMethod || order.payment || 'Wallet';
  const phoneDisplay = order.phone ? `+91${order.phone}` : '—';
  const contactDisplay = order.deliveryContact ? `+91${order.deliveryContact}` : phoneDisplay;
  const storeInfo = order.storeInfo || {};
  const rider = hasAssignedRider(order.rider) ? order.rider : null;
  const deliveryProof = order.deliveryProof || images[0];

  const statusLabel = {
    request: 'Pending',
    refunded: 'Refunded',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  }[order.refundStatus] || (order.refundStatus === 'refunded' ? 'Refunded' : 'Pending');

  const statusStyle = {
    Pending: 'bg-teal-100 text-teal-700',
    Refunded: 'bg-green-100 text-green-700',
    Rejected: 'bg-red-100 text-red-700',
    Cancelled: 'bg-gray-100 text-gray-600',
  }[statusLabel] || 'bg-teal-100 text-teal-700';

  const isPending = order.refundStatus === 'request' || (!order.refundStatus && order.status === 'Returns/Refunds');
  const showActions = !readOnly && isPending && onAction;

  const products = order.products?.length
    ? order.products
    : [{ name: 'Order Item', qty: order.items || 1, unitPrice: order.amount, image: null }];

  const runAction = async (action) => {
    setConfirm(null);
    await onAction?.(order._id, action);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">Refund Request</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyle}`}>{statusLabel}</span>
              </div>
              <h1 className="text-lg font-bold text-gray-900">
                Order <span className="text-primary-600">#{order.orderNo || order.orderId}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-x-2.5 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Calendar size={11} /> {order.refundRequestedAt || order.orderDate || order.date}</span>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-1"><Store size={11} /> {order.store}</span>
              </div>
            </div>
            {showActions && (
              <div className="flex flex-wrap gap-2 shrink-0">
                <button type="button" onClick={() => setConfirm({ action: 'accept', title: 'Accept Refund?', message: `Order #${order.orderNo} ka refund approve karna hai? Amount: ₹${Number(amount).toLocaleString('en-IN')}`, confirmLabel: 'Yes, Accept', danger: false })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition">
                  <Check size={13} /> Accept
                </button>
                <button type="button" onClick={() => setConfirm({ action: 'reject', title: 'Reject Refund?', message: `Order #${order.orderNo} ki refund request reject karni hai?`, confirmLabel: 'Yes, Reject', danger: true })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition">
                  <Ban size={13} /> Reject
                </button>
                <button type="button" onClick={() => setConfirm({ action: 'cancel', title: 'Cancel Request?', message: `Order #${order.orderNo} ki refund request cancel karni hai?`, confirmLabel: 'Yes, Cancel', danger: true })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 text-xs font-bold rounded-lg transition">
                  <X size={13} /> Cancel
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="px-4 pb-3 border-t border-gray-100/80">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5">
            {[
              { label: 'Reason', value: order.refundReason || 'Wrong item received' },
              { label: 'Amount', value: `₹ ${Number(amount).toLocaleString('en-IN')}`, cls: 'text-primary-600' },
              { label: 'Method', value: method },
              { label: 'Admin', value: order.refundAdmin || '—' },
            ].map(f => (
              <div key={f.label} className="bg-gray-50/80 rounded-md px-2.5 py-1.5 border border-gray-100">
                <p className="text-[9px] uppercase text-gray-400 font-medium">{f.label}</p>
                <p className={`text-xs font-semibold truncate ${f.cls || 'text-gray-800'}`}>{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left — refund images + items */}
        <div className="xl:col-span-2 space-y-4">
          <InfoCard title="Refund Images" icon={ImageIcon} iconBg="bg-orange-50">
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((img, i) => (
                  <img key={i} src={img} alt="" className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">Koi image nahi</p>
            )}
          </InfoCard>

          <InfoCard title="Delivery Proof" icon={ImageIcon} iconBg="bg-gray-50">
            <p className="text-sm text-gray-500 mb-2">Image :</p>
            {deliveryProof ? (
              <img src={deliveryProof} alt="Delivery proof" className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
            ) : (
              <p className="text-xs text-gray-400">No delivery proof</p>
            )}
          </InfoCard>

          <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <Package size={14} className="text-primary-600" />
              <h2 className="font-semibold text-gray-800 text-sm">Order Items</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-[11px] uppercase border-b border-gray-100">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2.5 text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {p.image ? (
                          <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <ShoppingBag size={14} className="text-gray-400" />
                          </div>
                        )}
                        <span className="font-medium text-gray-800">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{p.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <InfoCard title="Customer Information" icon={User} iconBg="bg-violet-50">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-violet-50 border border-violet-100 overflow-hidden flex items-center justify-center shrink-0">
                {order.customerAvatar ? (
                  <img src={order.customerAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={18} className="text-violet-400" />
                )}
              </div>
              <div className="space-y-1 text-sm min-w-0">
                <p className="font-bold text-gray-900">{order.customer}</p>
                <p className="text-xs text-gray-400">{order.customerOrderCount || 1} Orders</p>
                <p className="flex items-center gap-2 text-gray-600"><Phone size={12} className="text-gray-400" /> {phoneDisplay}</p>
                {order.customerEmail && (
                  <p className="flex items-center gap-2 text-gray-600 break-all"><Mail size={12} className="text-gray-400" /> {order.customerEmail}</p>
                )}
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Delivery Info" icon={MapPin} iconBg="bg-emerald-50">
            <div className="space-y-2">
              <RowField label="Name" value={order.customer} />
              <RowField label="Contact" value={contactDisplay} />
              {order.area && (
                <span className="inline-block text-[10px] font-bold text-primary-700 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-md">
                  {order.area}
                </span>
              )}
              {order.deliveryAddress && (
                <p className="flex items-start gap-2 text-sm text-teal-700 font-medium leading-relaxed pt-1">
                  <MapPin size={14} className="shrink-0 mt-0.5 text-teal-600" />
                  <span>{order.deliveryAddress}</span>
                </p>
              )}
            </div>
          </InfoCard>

          <InfoCard title="Rider Information" icon={Bike} iconBg="bg-orange-50">
            {rider ? (
              <div className="space-y-2 text-sm">
                <p className="font-bold text-gray-900">{rider.name}</p>
                <p className="flex items-center gap-2 text-gray-600"><Phone size={12} className="text-gray-400" /> +91{rider.phone}</p>
                {rider.vehicle && <p className="text-xs text-gray-500">{rider.vehicle}</p>}
                {rider.area && (
                  <span className="inline-block text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md">
                    {rider.area}
                  </span>
                )}
                {rider.location && (
                  <p className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                    <MapPin size={12} className="text-orange-500 shrink-0 mt-0.5" />
                    <span>{rider.location}</span>
                  </p>
                )}
                {rider.lat && rider.lng && (
                  <a href={`https://www.google.com/maps?q=${rider.lat},${rider.lng}`} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs font-bold text-orange-700 hover:bg-orange-100 transition mt-1">
                    <Navigation size={13} /> Track on Map
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-2">Rider assign nahi hua</p>
            )}
          </InfoCard>

          <InfoCard title="Store Information" icon={Store} iconBg="bg-sky-50">
            <div className="flex items-start gap-3">
              {storeInfo.image ? (
                <img src={storeInfo.image} alt="" className="w-11 h-11 rounded-lg object-cover border border-gray-100 shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                  <Store size={16} className="text-sky-500" />
                </div>
              )}
              <div className="space-y-1 text-sm min-w-0">
                <p className="font-bold text-gray-900">{order.store}</p>
                <p className="text-xs text-gray-400">{storeInfo.orderCount || '—'} Orders</p>
                {storeInfo.phone && (
                  <p className="flex items-center gap-2 text-gray-600"><Phone size={12} className="text-gray-400" /> +91{storeInfo.phone}</p>
                )}
                {storeInfo.address && (
                  <p className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                    <MapPin size={12} className="shrink-0 mt-0.5 text-sky-500" />
                    <span>{storeInfo.address}</span>
                  </p>
                )}
              </div>
            </div>
          </InfoCard>
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onClose={() => setConfirm(null)}
          onConfirm={() => runAction(confirm.action)}
        />
      )}
    </div>
  );
}
