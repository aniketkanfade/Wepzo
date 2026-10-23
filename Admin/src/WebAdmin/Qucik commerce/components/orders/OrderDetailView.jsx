import { useState, useEffect } from 'react';
import {
  User, Store, Phone, MapPin, Bike, Printer, Mail, ShoppingBag,
  Pencil, ChevronDown, Settings, CreditCard, Package, Calendar, AlertCircle, ArrowRightLeft, Navigation, Star, Plus, Image as ImageIcon, Loader2, X,
} from 'lucide-react';
import { ORDER_STATUS_STYLE, ORDER_STATUS_OPTIONS, STATUSES_REQUIRING_RIDER, STATUSES_ALLOWING_ASSIGN } from '../../../../constants/orderStatus';
import api from '../../../../api/axios';
import { printOrderInvoice } from './orderPrint';
import AssignDeliveryManModal from './AssignDeliveryManModal';
import OrderItemsEditor from './OrderItemsEditor';
import OrderTrackingMap from './OrderTrackingMap';
import TransferStoreModal from './TransferStoreModal';
import ConfirmModal from '../ConfirmModal';

function fmt(n) {
  return `₹ ${(n || 0).toLocaleString('en-IN')}`;
}

function hasAssignedRider(rider) {
  return !!(rider?.name && rider?.phone);
}

function InfoCard({ title, icon: Icon, iconBg, children, action }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60">
        <p className="font-semibold text-gray-800 text-sm flex items-center gap-2.5">
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg || 'bg-primary-50'}`}>
            {Icon && <Icon size={15} className="text-primary-600" />}
          </span>
          {title}
        </p>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MetaTile({ label, value, valueClass = 'text-gray-800' }) {
  return (
    <div className="bg-gray-50/80 rounded-md px-2.5 py-1.5 border border-gray-100 min-w-0">
      <p className="text-[9px] uppercase tracking-wide text-gray-400 font-medium leading-none mb-0.5 truncate">{label}</p>
      <p className={`text-xs font-semibold truncate ${valueClass}`}>{value}</p>
    </div>
  );
}

export default function OrderDetailView({ order, onStatusChange, onAssignRider, onAssignPartner, onTransferStore, onUpdateItems, itemsNotice }) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignModalMode, setAssignModalMode] = useState('assign');
  const [showTransferStoreModal, setShowTransferStoreModal] = useState(false);
  const [showItemsEditor, setShowItemsEditor] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [selectStatus, setSelectStatus] = useState('Pending');

  useEffect(() => {
    setSelectStatus(ORDER_STATUS_OPTIONS.includes(order?.status) ? order.status : 'Pending');
  }, [order?.status]);

  if (!order) return null;

  const shopBill = order.bill || {};
  const billing = order.billing || (order.bill ? {
    itemsPrice: shopBill.itemsTotal ?? order.itemsTotal ?? order.amount,
    subtotal: shopBill.itemsTotal ?? order.itemsTotal ?? order.amount,
    discount: 0,
    couponDiscount: shopBill.couponDiscount || 0,
    deliveryFee: shopBill.deliveryCharge || 0,
    searchCharge: shopBill.searchCharge || 0,
    platformFee: shopBill.platformFee || 0,
    taxAmount: shopBill.taxAmount || 0,
    taxName: shopBill.taxName || 'GST',
    taxPercent: shopBill.taxPercent || 0,
    taxIncluded: shopBill.taxIncluded === true,
    deliveryTips: 0,
    handlingFee: 0,
    total: shopBill.total ?? order.total ?? order.amount,
  } : {
    itemsPrice: order.amount, subtotal: order.amount, discount: 0,
    couponDiscount: 0, deliveryFee: 0, deliveryTips: 0, handlingFee: 0, total: order.amount,
  });

  const products = order.products?.length
    ? order.products
    : order.details?.length
      ? order.details.map(item => ({
        ...item,
        id: item.id || item.productId || item._id,
        name: item.name,
        variant: item.variant || item.unit,
        qty: item.qty,
        unitPrice: Number(item.price) || 0,
        total: (Number(item.price) || 0) * (Number(item.qty) || 0),
        image: item.image || null,
      }))
      : [{ name: 'Order Item', qty: order.items || 1, unitPrice: order.amount, total: order.amount, image: null }];

  const rider = hasAssignedRider(order.rider) ? order.rider : null;
  const partnerDelivery = order.partnerDelivery?.bookingReference ? order.partnerDelivery : null;
  const isEcommerceOrder = ['e_commerce', 'e-commerce', 'ecommerce'].includes(String(order.source || '').toLowerCase());
  const storeInfo = order.storeInfo || {};
  const phoneDisplay = order.phone
    ? String(order.phone).startsWith('+') ? order.phone : `+91${order.phone}`
    : '—';
  const orderStoreName = order.source === 'e_commerce' ? 'My Website' : (order.store || '—');
  const paymentStatus = order.paymentStatus || 'Unpaid';
  const itemRefunds = (order.itemAdjustments || []).filter(adjustment => adjustment.type === 'refund' && adjustment.status !== 'failed');
  const itemRefundTotal = itemRefunds.reduce((total, adjustment) => total + (Number(adjustment.amount) || 0), 0);
  const unresolvedItemRefund = itemRefunds.some(item => ['submitting', 'unknown'].includes(item.status));

  const canAssign = onAssignRider && !rider && !partnerDelivery && STATUSES_ALLOWING_ASSIGN.includes(order.status);
  const canTransferRider = onAssignRider && rider && !['Delivered', 'Cancelled'].includes(order.status);
  const canTransferStore = onTransferStore && !['Delivered', 'Cancelled'].includes(order.status);
  const canEditItems = !!onUpdateItems && ['Scheduled', 'Pending', 'Accepted', 'Processing'].includes(order.status)
    && String(paymentStatus).toLowerCase() !== 'pending' && !unresolvedItemRefund;
  const showRiderDetails = !!rider;

  const openProductDetails = async (product) => {
    setDetailError('');
    setDetailProduct(product);
    const productId = product.id || product._id;
    if (!productId) return;
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/product-items/${encodeURIComponent(productId)}`);
      setDetailProduct({ ...product, ...data, orderPrice: product.price ?? product.unitPrice });
    } catch {
      setDetailError('Full product details are unavailable. Showing the saved order details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const openAssignModal = (mode = 'assign') => {
    setAssignModalMode(mode);
    setShowAssignModal(true);
  };

  const handleStatusSelect = (newStatus) => {
    if (newStatus === order.status) return;
    setStatusError('');
    if (!isEcommerceOrder && newStatus !== 'Cancelled' && STATUSES_REQUIRING_RIDER.includes(newStatus) && !rider && !partnerDelivery) {
      setStatusError('Pehle delivery man assign karein — bina rider ke Out for Delivery nahi ho sakta.');
      return;
    }
    if (newStatus === 'Delivered' && order.status !== 'Out for Delivery') {
      setStatusError('Pehle Out for Delivery karein, tab Delivered ho sakta hai.');
      return;
    }
    const orderNo = order.orderNo || order.orderId;
    setStatusConfirm({
      status: newStatus,
      title: `Change to ${newStatus}?`,
      message: `Kya aap Order #${orderNo} ka status "${newStatus}" karna chahte hain?`,
      confirmLabel: newStatus === 'Cancelled' ? 'Yes, Cancel' : 'Yes, Confirm',
      danger: newStatus === 'Cancelled',
    });
  };

  const confirmStatusChange = async () => {
    const newStatus = statusConfirm.status;
    setStatusConfirm(null);
    const result = await onStatusChange?.(order._id, newStatus);
    if (result?.ok) {
      setSelectStatus(newStatus);
    } else if (result?.message) {
      setStatusError(result.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header card — compact */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <p className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider">Order Details</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ORDER_STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-700'}`}>
                  {order.status}
                </span>
                {order.scheduledOn && (
                  <span className="text-[10px] text-cyan-700 bg-cyan-50 border border-cyan-100 px-1.5 py-0.5 rounded font-medium">
                    Scheduled: {order.scheduledOn}
                  </span>
                )}
              </div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                Order <span className="text-primary-600">#{order.orderNo || order.orderId}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Calendar size={11} /> {order.orderDate || order.date}</span>
                <span className="text-gray-300 hidden sm:inline">|</span>
                <span className="flex items-center gap-1 truncate"><Store size={11} /> {orderStoreName}</span>
              </div>
            </div>
            <button type="button" onClick={() => printOrderInvoice(order)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg shadow-sm transition shrink-0">
              <Printer size={13} /> Print Invoice
            </button>
          </div>
        </div>

        {order.status === 'Cancelled' && order.cancelReason && (
          <div className="mx-4 mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 flex gap-1.5">
            <span className="font-semibold shrink-0">Cancelled</span>
            <span className="text-red-400">·</span>
            <span>{order.cancelledBy || 'Customer'} — {order.cancelReason}</span>
          </div>
        )}

        <div className="px-4 pb-3 pt-0 border-t border-gray-100/80">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5">
            <MetaTile label="Payment Method" value={order.paymentMethod || order.payment} />
            <MetaTile label="Payment Status" value={paymentStatus}
              valueClass={String(paymentStatus).toLowerCase() === 'paid' ? 'text-green-600' : 'text-red-500'} />
            <MetaTile label="Order Type" value={order.orderType || order.deliveryType} />
            <MetaTile label="Reference Code" value={order.referenceCode || '—'} valueClass="text-primary-600" />
          </div>
        </div>
      </div>

      {itemsNotice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{itemsNotice}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="order-last space-y-4 xl:order-none xl:col-span-2">
          <OrderTrackingMap order={order} className="w-full" />

          {/* Items + Bill side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden h-full">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
                <Package size={16} className="text-primary-600" />
                <h2 className="font-semibold text-gray-800 text-sm">Order Items</h2>
                <span className="ml-auto text-xs text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                  {products.length} item{products.length !== 1 ? 's' : ''}
                </span>
                {canEditItems && <button type="button" onClick={() => setShowItemsEditor(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary-700"><Plus size={14} /> Edit items</button>}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-[11px] uppercase tracking-wide border-b border-gray-100">
                    <th className="px-4 py-3 text-left font-semibold w-10">#</th>
                    <th className="px-4 py-3 text-left font-semibold">Item Details</th>
                    <th className="px-4 py-3 text-right font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5 text-gray-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {p.image ? (
                            <button type="button" onClick={() => setImagePreview(p.image)} aria-label={`Open ${p.name} image`} className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                              <img src={p.image} alt={p.name || ''} className="w-12 h-12 rounded-lg object-cover border border-gray-100" />
                            </button>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-100 flex items-center justify-center">
                              <ShoppingBag size={18} className="text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <button type="button" onClick={() => openProductDetails(p)} className="text-left font-semibold text-gray-800 text-sm leading-tight hover:text-primary-600 hover:underline">{p.name} · View details</button>
                            <p className="text-[11px] text-gray-400 mt-0.5">{p.qty} x {fmt(p.unitPrice)}</p>{p.variant && <p className="text-[11px] text-gray-500 mt-0.5">{p.variant}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-gray-900 align-top text-sm">{fmt(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden h-full">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
                <CreditCard size={16} className="text-primary-600" />
                <h2 className="font-semibold text-gray-800 text-sm">Bill Summary</h2>
              </div>
              <div className="px-5 py-5 space-y-2 text-sm">
                {[
                  ['Items price', fmt(billing.itemsPrice), ''],
                  ['Subtotal', fmt(billing.subtotal), ''],
                  ...(billing.storeDiscount > 0 ? [[`Store discount${billing.storeDiscountTitle ? ` (${billing.storeDiscountTitle})` : ''}`, `- ${fmt(billing.storeDiscount)}`, 'text-red-500']] : []),
                  ...(billing.discount > 0 && !billing.storeDiscount ? [['Discount', `- ${fmt(billing.discount)}`, 'text-red-500']] : []),
                  ['Coupon discount', `- ${fmt(billing.couponDiscount)}`, 'text-red-500'],
                  ['Delivery fee', `+ ${fmt(billing.deliveryFee)}`, 'text-emerald-600'],
                  ...(billing.searchCharge > 0 ? [['Search charge', `+ ${fmt(billing.searchCharge)}`, 'text-emerald-600']] : []),
                  ...(billing.platformFee > 0 ? [['Platform fee', `+ ${fmt(billing.platformFee)}`, 'text-emerald-600']] : []),
                  ...(billing.taxAmount > 0 ? [[`${billing.taxName || 'GST'} (${billing.taxPercent || 0}%)${billing.taxIncluded ? ' included' : ''}`, `${billing.taxIncluded ? '' : '+ '}${fmt(billing.taxAmount)}`, billing.taxIncluded ? 'text-gray-500' : 'text-emerald-600']] : []),
                  ['Delivery man tips', `+ ${fmt(billing.deliveryTips)}`, 'text-emerald-600'],
                  ['Handling fee', `+ ${fmt(billing.handlingFee)}`, 'text-emerald-600'],
                ].map(([label, val, cls]) => (
                  <div key={label} className="flex justify-between text-gray-600">
                    <span>{label}</span>
                    <span className={`font-medium ${cls}`}>{val}</span>
                  </div>
                ))}
                {billing.distance && (
                  <p className="text-[11px] text-gray-400 text-right pt-1">Distance: {billing.distance}</p>
                )}
                <div className="flex justify-between items-center pt-4 mt-2 border-t-2 border-gray-200">
                  <span className="font-bold text-gray-900 text-base">Total</span>
                  <span className="font-bold text-primary-600 text-2xl">{fmt(billing.total)}</span>
                </div>
                {Number(order.amountDueOnDelivery) > 0 && (
                  <div className="flex justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <span>{String(paymentStatus).toLowerCase() === 'paid' ? 'Additional COD at delivery' : 'COD to collect at delivery'}</span>
                    <span className="shrink-0 font-bold">{fmt(order.amountDueOnDelivery)}</span>
                  </div>
                )}
                {itemRefundTotal > 0 && (
                  <div className="flex justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    <span>Refund to original payment method · {unresolvedItemRefund ? 'Check gateway status' : itemRefunds.some(item => item.status === 'processing') ? 'Processing' : itemRefunds.some(item => item.status === 'completed') ? 'Refunded' : 'Initiated'}</span>
                    <span className="shrink-0 font-bold">{fmt(itemRefundTotal)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="order-first space-y-4 xl:order-none">
          {onStatusChange && (
            <div className="bg-white rounded-xl border border-primary-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 flex items-center gap-2">
                <Settings size={15} className="text-white" />
                <p className="font-semibold text-white text-sm">Order Setup</p>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                    Order Status
                  </label>
                  <div className="relative">
                    <select
                      value={selectStatus}
                      onChange={e => handleStatusSelect(e.target.value)}
                      className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-4 pr-10 py-3 text-sm font-semibold text-gray-800 hover:border-primary-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:bg-white outline-none cursor-pointer transition"
                    >
                      {ORDER_STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {statusError && (
                    <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-start gap-1.5">
                      <AlertCircle size={13} className="shrink-0 mt-0.5" /> {statusError}
                    </p>
                  )}
                </div>
                {!isEcommerceOrder && !rider && !partnerDelivery && onAssignRider && !['Delivered', 'Cancelled', 'Out for Delivery'].includes(order.status) && (
                  <button type="button" onClick={() => (canAssign ? openAssignModal('assign') : setStatusError('Pehle order Accept karein — Pending par rider assign nahi ho sakta'))}
                    className={`w-full py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                      canAssign
                        ? 'bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white shadow-md shadow-primary-600/20'
                        : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                    }`}>
                    <Bike size={16} />
                    Assign Delivery Man
                  </button>
                )}
                {!isEcommerceOrder && rider && (
                  <p className="text-xs text-center text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2 font-medium">
                    Rider assigned · {rider.name}
                  </p>
                )}
                {!isEcommerceOrder && partnerDelivery && (
                  <p className="text-xs text-center text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 font-medium">
                    {partnerDelivery.providerName} booking saved: {partnerDelivery.bookingReference}
                  </p>
                )}
                {!isEcommerceOrder && !rider && !partnerDelivery && order.status === 'Pending' && (
                  <p className="text-xs text-center text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 font-medium">
                    Pehle order Accept karein — Pending par rider assign nahi ho sakta
                  </p>
                )}
                {!isEcommerceOrder && !rider && !partnerDelivery && order.status !== 'Cancelled' && order.status !== 'Pending' && !canAssign && (
                  <p className="text-xs text-center text-gray-400 font-medium py-1">
                    Cancel direct ho sakta hai · Out for Delivery ke liye rider zaroori hai
                  </p>
                )}
              </div>
            </div>
          )}

          <InfoCard title="Customer Information" icon={User} iconBg="bg-violet-50">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-100 to-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                <User size={18} className="text-violet-500" />
              </div>
              <div className="space-y-1.5 text-sm min-w-0">
                <p className="font-bold text-gray-900">{order.customer}</p>
                <p className="text-xs text-gray-400 font-medium">{order.customerOrderCount || 1} Orders placed</p>
                <div className="pt-1 space-y-1">
                  <p className="flex items-center gap-2 text-gray-600"><Phone size={13} className="text-gray-400 shrink-0" /> {phoneDisplay}</p>
                  {order.customerEmail && (
                    <p className="flex items-center gap-2 text-gray-600 break-all"><Mail size={13} className="text-gray-400 shrink-0" /> {order.customerEmail}</p>
                  )}
                </div>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Delivery Info" icon={MapPin} iconBg="bg-emerald-50"
            action={<button type="button" className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"><Pencil size={14} /></button>}
          >
            <div className="space-y-2.5 text-sm">
              <p className="font-bold text-gray-900">{order.customer}</p>
              <p className="flex items-center gap-2 text-gray-600">
                <Phone size={13} className="text-gray-400" /> {order.deliveryContact ? `+91${order.deliveryContact}` : phoneDisplay}
              </p>
              {order.area && (
                <span className="inline-block text-xs text-primary-700 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-md font-semibold">
                  {order.area}
                </span>
              )}
              {(order.deliveryAddress || order.address) && (
                <p className="flex items-start gap-2 text-gray-600 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                  <MapPin size={13} className="shrink-0 mt-0.5 text-emerald-500" />
                  <span className="text-xs leading-relaxed">{[order.deliveryAddress || order.address, order.pincode, order.deliveryState].filter(Boolean).join(', ')}</span>
                </p>
              )}
            </div>
          </InfoCard>

          {!isEcommerceOrder && <InfoCard title={partnerDelivery ? 'Delivery Partner' : 'Rider Information'} icon={Bike} iconBg="bg-orange-50"
            action={canTransferRider ? (
              <button type="button" onClick={() => openAssignModal('transfer')}
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-orange-50 transition border border-orange-200 bg-orange-50/50">
                <ArrowRightLeft size={12} /> Transfer Rider
              </button>
            ) : null}
          >
            {partnerDelivery ? (
              <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-sm">
                <p className="font-bold text-gray-900">{partnerDelivery.providerName}</p>
                <p className="text-xs text-gray-600">Booking reference: <span className="font-semibold">{partnerDelivery.bookingReference}</span></p>
                {partnerDelivery.courierName && <p className="text-xs text-gray-600">Courier: {partnerDelivery.courierName}</p>}
                {partnerDelivery.courierPhone && <p className="flex items-center gap-2 text-xs text-gray-600"><Phone size={12} /> {partnerDelivery.courierPhone}</p>}
                {partnerDelivery.trackingUrl && <a href={partnerDelivery.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"><Navigation size={12} /> Track partner delivery</a>}
                <span className="inline-block rounded-full border border-blue-100 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">Manually booked</span>
              </div>
            ) : showRiderDetails ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                    {rider.photo ? <img src={rider.photo} alt="" className="h-full w-full rounded-full object-cover" /> : <Bike size={16} className="text-orange-500" />}
                  </div>
                  <div className="space-y-1 text-sm min-w-0">
                    <p className="font-bold text-gray-900">{rider.name}</p>
                    <p className="flex items-center gap-1 text-xs text-gray-600"><Star size={12} className="fill-amber-400 text-amber-400" />{rider.rating == null ? 'Not rated yet' : `${Number(rider.rating).toFixed(1)} / 5`} <span className="text-gray-300">·</span> {Number(rider.completedDeliveries) || 0} completed deliveries</p>
                    <p className="flex items-center gap-2 text-gray-600"><Phone size={13} className="text-gray-400 shrink-0" /> +91{rider.phone}</p>
                    {rider.vehicle && <p className="text-xs text-gray-500">{rider.vehicle}</p>}
                    {rider.vehicleNumber && <p className="text-xs text-gray-500">Registration: {rider.vehicleNumber}</p>}
                    <span className="inline-block text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full uppercase tracking-wide">Assigned</span>
                  </div>
                </div>
                {(rider.location || rider.area || rider.lat != null || rider.lng != null || rider.locationUpdatedAt) && (
                  <div className="rounded-lg border border-orange-100 bg-orange-50/40 p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-orange-700 uppercase tracking-wide">Track Rider</p>
                      {rider.lat != null && rider.lng != null
                        ? <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> GPS received</span>
                        : <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">Location unavailable</span>}
                    </div>
                    {rider.area && (
                      <span className="inline-block text-[10px] font-bold text-orange-700 bg-white border border-orange-100 px-2 py-0.5 rounded-md">
                        {rider.area}
                      </span>
                    )}
                    {rider.location && rider.lat == null && rider.lng == null && <p className="text-xs text-gray-500">{rider.location}</p>}
                    {rider.lat != null && rider.lng != null && (
                      <a href={`https://www.google.com/maps?q=${rider.lat},${rider.lng}`} target="_blank" rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-orange-200 rounded-lg text-xs font-bold text-orange-700 hover:bg-orange-50 transition">
                        <Navigation size={14} />
                        Google Maps par track karein
                      </a>
                    )}
                    <p className="text-[10px] text-gray-400 text-center">{rider.locationUpdatedAt ? `Last GPS update: ${rider.locationUpdatedAt}` : 'Waiting for rider GPS permission and first update.'}</p>
                  </div>
                )}
                {order.transferredFromRider && (
                  <p className="text-[10px] text-orange-600 bg-orange-50 border border-orange-100 rounded px-2 py-1">
                    Transferred from {order.transferredFromRider}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-3">
                <Bike size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Rider abhi assign nahi hua</p>
              </div>
            )}
          </InfoCard>}

          <InfoCard title="Store Information" icon={Store} iconBg="bg-sky-50">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                {storeInfo.image ? (
                  <img src={storeInfo.image} alt="" className="w-12 h-12 rounded-xl object-cover border border-gray-100 shadow-sm shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                    <Store size={18} className="text-sky-500" />
                  </div>
                )}
                <div className="space-y-1 text-sm min-w-0">
                  <p className="font-bold text-gray-900">{order.store}</p>
                  {order.transferredFrom && (
                    <p className="text-[10px] text-sky-600 bg-sky-50 border border-sky-100 rounded px-2 py-0.5 inline-block">
                      Transferred from {order.transferredFrom}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">{storeInfo.orderCount || '—'} Orders</p>
                  {storeInfo.phone && <p className="flex items-center gap-2 text-gray-600"><Phone size={13} className="text-gray-400" /> +91{storeInfo.phone}</p>}
                  {storeInfo.address && (
                    <p className="flex items-start gap-2 text-gray-600 text-xs leading-relaxed mt-1">
                      <MapPin size={12} className="shrink-0 mt-0.5 text-sky-500" />
                      <span>{storeInfo.address}</span>
                    </p>
                  )}
                </div>
              </div>
              {canTransferStore && (
                <button type="button" onClick={() => setShowTransferStoreModal(true)}
                  className="w-full py-2.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                  <ArrowRightLeft size={15} />
                  Transfer to Another Store
                </button>
              )}
            </div>
          </InfoCard>
        </div>
      </div>

      {showItemsEditor && (
        <OrderItemsEditor
          order={order}
          onClose={() => setShowItemsEditor(false)}
          onSave={onUpdateItems}
          onPreviewImage={setImagePreview}
        />
      )}

      {imagePreview && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-label="Product image preview" onClick={() => setImagePreview('')}>
          <button type="button" onClick={() => setImagePreview('')} aria-label="Close image" className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"><X size={20} /></button>
          <img src={imagePreview} alt="Product" className="max-h-[90vh] max-w-[min(92vw,1000px)] rounded-xl object-contain shadow-2xl" onClick={event => event.stopPropagation()} />
        </div>
      )}

      {detailProduct && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="order-product-detail-title" onClick={() => setDetailProduct(null)}>
          <section className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
            <button type="button" onClick={() => setDetailProduct(null)} aria-label="Close product details" className="absolute right-3 top-3 z-10 rounded-lg bg-white/90 p-2 text-slate-500 shadow-sm hover:bg-slate-100"><X size={17} /></button>
            {detailProduct.image ? <button type="button" onClick={() => setImagePreview(detailProduct.image)} className="block w-full bg-slate-50"><img src={detailProduct.image} alt={detailProduct.name || 'Product'} className="h-64 w-full object-contain p-4 sm:h-80" /></button>
              : <div className="grid h-40 place-items-center bg-slate-50 text-slate-300"><ImageIcon size={32} /></div>}
            <div className="space-y-4 p-5">
              <div><h2 id="order-product-detail-title" className="text-lg font-bold text-slate-900">{detailProduct.name || 'Product details'}</h2><p className="mt-1 text-sm text-slate-500">{detailProduct.shortDesc || detailProduct.description || detailProduct.variant || detailProduct.unit || 'Saved order product'}</p></div>
              {detailLoading && <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> Loading full product details...</p>}
              {detailError && <p className="text-xs text-amber-700">{detailError}</p>}
              {Array.isArray(detailProduct.images) && detailProduct.images.length > 1 && <div className="flex gap-2 overflow-x-auto">{detailProduct.images.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setImagePreview(image)} className="shrink-0"><img src={image} alt={`${detailProduct.name} ${index + 1}`} className="h-14 w-14 rounded-lg border border-slate-200 object-cover" /></button>)}</div>}
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-3">
                <div><p className="text-slate-400">Price in order</p><p className="mt-1 font-bold text-slate-800">{fmt(detailProduct.orderPrice ?? detailProduct.price ?? detailProduct.unitPrice)}</p></div>
                <div><p className="text-slate-400">Quantity</p><p className="mt-1 font-bold text-slate-800">{detailProduct.qty || 1}</p></div>
                <div><p className="text-slate-400">Unit / option</p><p className="mt-1 font-bold text-slate-800">{detailProduct.variant || detailProduct.unit || 'Standard'}</p></div>
                {detailProduct.sku && <div><p className="text-slate-400">SKU</p><p className="mt-1 font-bold text-slate-800">{detailProduct.sku}</p></div>}
                {detailProduct.mainCategory && <div><p className="text-slate-400">Category</p><p className="mt-1 font-bold text-slate-800">{detailProduct.mainCategory}</p></div>}
                {detailProduct.stock != null && <div><p className="text-slate-400">Stock</p><p className="mt-1 font-bold text-slate-800">{detailProduct.stock}</p></div>}
              </div>
              {detailProduct.description && detailProduct.description !== detailProduct.shortDesc && <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{detailProduct.description}</p>}
              {detailProduct.specifications && typeof detailProduct.specifications === 'object' && <div className="grid gap-2 sm:grid-cols-2">{Object.entries(detailProduct.specifications).map(([label, value]) => <div key={label} className="rounded-lg border border-slate-100 px-3 py-2 text-xs"><p className="text-slate-400">{label}</p><p className="mt-1 font-semibold text-slate-700">{String(value)}</p></div>)}</div>}
              {Array.isArray(detailProduct.tags) && detailProduct.tags.length > 0 && <div className="flex flex-wrap gap-1.5">{detailProduct.tags.map(tag => <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">{tag}</span>)}</div>}
              {(detailProduct.brand || detailProduct.store) && <p className="text-xs text-slate-500">{[detailProduct.brand, detailProduct.store].filter(Boolean).join(' · ')}</p>}
              {detailProduct._id && <a href={`/products/setup/view/${encodeURIComponent(detailProduct._id)}`} target="_blank" rel="noreferrer" className="inline-flex rounded-lg border border-primary-200 px-3 py-2 text-xs font-bold text-primary-700 hover:bg-primary-50">Open full product page</a>}
            </div>
          </section>
        </div>
      )}

      {!isEcommerceOrder && showAssignModal && (
        <AssignDeliveryManModal
          order={order}
          mode={assignModalMode}
          excludeRiderId={rider?._id}
          onClose={() => setShowAssignModal(false)}
          onAssign={riderId => onAssignRider?.(order._id, riderId)}
          onAssignPartner={(id, details) => onAssignPartner?.(id, details)}
        />
      )}

      {showTransferStoreModal && (
        <TransferStoreModal
          order={order}
          onClose={() => setShowTransferStoreModal(false)}
          onTransfer={storeId => onTransferStore?.(order._id, storeId)}
        />
      )}

      {statusConfirm && (
        <ConfirmModal
          title={statusConfirm.title}
          message={statusConfirm.message}
          confirmLabel={statusConfirm.confirmLabel}
          cancelLabel="No"
          danger={statusConfirm.danger}
          onClose={() => setStatusConfirm(null)}
          onConfirm={confirmStatusChange}
        />
      )}

    </div>
  );
}
