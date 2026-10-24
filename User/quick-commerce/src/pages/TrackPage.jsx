import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bike, ChevronRight, MapPin, PackageCheck, Phone, RefreshCw,
  ShieldCheck, Star, Store,
} from 'lucide-react';
import { shop } from '../api';
import TrackMap from '../components/TrackMap';
import { formatEta } from '../utils/eta';
import { formatMoney, useSiteSettings } from '../store/siteSettings';

function productId(item) {
  return item?.productId || item?.product?._id || item?.id || item?._id || '';
}

function riderRating(rider) {
  const value = Number(rider?.rating);
  return rider?.rating !== null && rider?.rating !== undefined && Number.isFinite(value) && value > 0
    ? value.toFixed(1)
    : 'Not rated yet';
}

export default function TrackPage() {
  const { orderNo } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [query, setQuery] = useState(orderNo || '');
  const [loading, setLoading] = useState(Boolean(orderNo));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const business = useSiteSettings(s => s.business);

  useEffect(() => {
    setQuery(orderNo || '');
    if (!orderNo) {
      setOrder(null);
      setLoading(false);
      return undefined;
    }
    let live = true;
    const load = async (initial = false) => {
      if (initial) setLoading(true);
      else setRefreshing(true);
      try {
        const data = await shop.order(orderNo);
        if (!live) return;
        setOrder(data);
        setError('');
        setLastUpdated(new Date());
      } catch (requestError) {
        if (!live) return;
        setError(requestError.response?.status === 401
          ? 'Sign in to view orders from your account.'
          : requestError.response?.status === 404
            ? 'This order could not be found in your account.'
            : 'Live tracking is temporarily unavailable. We will keep trying.');
      } finally {
        if (live) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    load(true);
    const timer = window.setInterval(() => load(false), 8000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [orderNo]);

  const submit = event => {
    event.preventDefault();
    if (query.trim()) navigate(`/track/${encodeURIComponent(query.trim())}`);
  };

  const submitDeliveryReview = async event => {
    event.preventDefault();
    if (!order || !rider) return;
    setReviewSubmitting(true);
    setReviewError('');
    try {
      const review = await shop.reviewDelivery(order._id || order.orderNo || order.orderId, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setOrder(current => current ? { ...current, deliveryReview: review } : current);
      setReviewComment('');
    } catch (requestError) {
      setReviewError(requestError.response?.data?.message || 'Your delivery review could not be submitted. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const bill = order?.bill || null;
  const details = Array.isArray(order?.details) ? order.details : [];
  const itemRefunds = (order?.itemAdjustments || []).filter(adjustment => adjustment.type === 'refund' && adjustment.status !== 'failed');
  const itemRefundTotal = itemRefunds.reduce((total, adjustment) => total + (Number(adjustment.amount) || 0), 0);
  const itemsTotal = Number(order?.itemsTotal ?? bill?.itemsTotal) || 0;
  const itemsPrice = details.reduce((total, item) => {
    const price = Number(item.price) || 0;
    const mrp = Number(item.mrp) || price;
    return total + Math.max(mrp, price) * (Number(item.qty) || 1);
  }, 0) || itemsTotal;
  const productDiscount = Math.max(0, itemsPrice - itemsTotal);
  const couponDiscount = Number(bill?.couponDiscount) || 0;
  const deliveryCharge = Number(order?.deliveryCharge ?? bill?.deliveryCharge) || 0;
  const freeDelivery = order?.freeDelivery || deliveryCharge === 0;
  const eta = formatEta(order?.etaMinutes);
  const terminal = ['Delivered', 'Cancelled'].includes(order?.status);
  const store = order?.storeDetails || {};
  const rider = order?.rider;

  return (
    <div className="mx-auto max-w-[1320px] space-y-5 px-4 py-5 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-700">WEPZO delivery</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Track your order</h1>
        </div>
        <form onSubmit={submit} className="flex w-full gap-2 sm:w-auto">
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Order number"
            aria-label="Order number" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm sm:w-52" />
          <button className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white">Find order</button>
        </form>
      </header>

      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500"><RefreshCw className="mx-auto mb-3 animate-spin" size={20} />Loading order details…</div>}
      {!loading && error && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p>{error}</p>
        {error.startsWith('Sign in') && <Link to={`/login?next=${encodeURIComponent(`/track/${orderNo || ''}`)}`} className="mt-2 inline-flex items-center gap-1 font-bold underline">Sign in <ChevronRight size={14} /></Link>}
      </div>}
      {!loading && !order && !error && orderNo && <p className="rounded-2xl border bg-white p-5 text-sm text-slate-500">Order not found.</p>}

      {order && (
        <>
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><PackageCheck size={21} /></span>
              <div>
                <p className="text-xs font-medium text-slate-500">Order #{order.orderNo || order.orderId}</p>
                <p className="mt-0.5 text-lg font-extrabold text-slate-900">{terminal && order.status === 'Delivered' ? 'Delivered successfully' : order.status}</p>
                <p className="mt-1 text-xs text-slate-500">Placed {order.orderDate || order.createdAt || '—'}{lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {eta && !terminal && <div className="text-right"><p className="text-xs text-slate-500">Estimated delivery</p><p className="text-2xl font-extrabold text-brand-700">{eta}</p></div>}
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${refreshing ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                {refreshing ? 'Updating' : 'Live updates'}
              </span>
            </div>
          </section>

          {terminal && order.status === 'Delivered' && <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><ShieldCheck size={22} /><div><p className="font-bold">Your order has been delivered</p><p className="mt-0.5 text-emerald-800">Thanks for ordering with WEPZO.</p></div></div>}
          {terminal && order.status === 'Delivered' && rider && (order.deliveryReview
            ? <div role="status" className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
              <p className="font-bold text-slate-900">Thanks for rating your delivery</p>
              <p className="mt-1 text-sm text-slate-600">Your {order.deliveryReview.rating}-star review is {order.deliveryReview.status === 'Approved' ? 'published' : order.deliveryReview.status === 'Rejected' ? 'not published' : 'waiting for review'}.</p>
            </div>
            : <form onSubmit={submitDeliveryReview} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div><h2 className="font-extrabold text-slate-900">Rate your delivery</h2><p className="mt-1 text-sm text-slate-500">How was your experience with {rider.name || 'your delivery rider'}?</p></div>
              <div className="flex gap-1" role="group" aria-label="Rate delivery from 1 to 5 stars">
                {Array.from({ length: 5 }, (_, index) => {
                  const value = index + 1;
                  return <button key={value} type="button" onClick={() => setReviewRating(value)} aria-label={`${value} star${value === 1 ? '' : 's'}`} aria-pressed={reviewRating === value} className="rounded-md p-1 text-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600">
                    <Star size={25} className={value <= reviewRating ? 'fill-current' : ''} />
                  </button>;
                })}
              </div>
              <label className="block text-xs font-semibold text-slate-600">Comment (optional)
                <textarea value={reviewComment} onChange={event => setReviewComment(event.target.value)} maxLength={1000} rows={3} className="mt-1 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-800" placeholder="Share a little feedback about the delivery…" />
              </label>
              {reviewError && <p role="alert" className="text-sm text-rose-700">{reviewError}</p>}
              <button type="submit" disabled={reviewSubmitting} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{reviewSubmitting ? 'Submitting…' : 'Submit review'}</button>
            </form>)}
          {error && <p role="status" className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-900">{error} {lastUpdated && `Last successful update ${lastUpdated.toLocaleTimeString()}.`}</p>}

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(340px,.85fr)]">
            <section className="space-y-3">
              <TrackMap order={order} />
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {order.remainingKm != null ? `${order.remainingKm} km remaining` : 'Distance unavailable'}</span>
                <span>{rider?.locationUpdatedAt ? `Rider location updated ${new Date(rider.locationUpdatedAt).toLocaleString()}` : rider ? 'Rider location unavailable' : 'Waiting for rider assignment'}</span>
              </div>
            </section>

            <aside className="space-y-4">
              {rider && <section className="overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 bg-gradient-to-r from-orange-50 to-amber-50 p-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-orange-100 text-orange-700 shadow-sm">
                    {rider.photo ? <img src={rider.photo} alt="" className="h-full w-full object-cover" /> : <Bike size={25} />}
                  </div>
                  <div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700">WEPZO delivery partner</p><h2 className="truncate text-lg font-extrabold text-slate-900">{rider.name || 'Your rider'}</h2><p className="mt-0.5 flex items-center gap-1 text-xs text-slate-600"><Star size={13} className="fill-amber-400 text-amber-400" />{riderRating(rider)} <span className="text-slate-400">·</span> {Number(rider.completedDeliveries) || 0} deliveries</p></div>
                  {rider.phone && !terminal && <a href={`tel:${rider.phone}`} aria-label={`Call ${rider.name || 'rider'}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand-700 shadow-sm"><Phone size={17} /></a>}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3 p-4 text-xs">
                  <div><p className="text-slate-400">Vehicle</p><p className="mt-0.5 font-semibold text-slate-800">{rider.vehicle || 'Not provided'}</p></div>
                  <div><p className="text-slate-400">Registration</p><p className="mt-0.5 font-semibold text-slate-800">{rider.vehicleNumber || 'Not provided'}</p></div>
                  <div className="col-span-2"><p className="text-slate-400">Delivery status</p><p className="mt-0.5 font-semibold text-slate-800">{order.status}</p></div>
                </div>
              </section>}

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-center gap-3">
                  {store.logo ? <img src={store.logo} alt="" className="h-11 w-11 rounded-xl border border-slate-100 object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Store size={20} /></span>}
                  <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your store</p><p className="truncate font-bold text-slate-900">{store.name || order.store}</p></div>
                  {store.phone && <a href={`tel:${store.phone}`} aria-label="Call store" className="grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-slate-600"><Phone size={15} /></a>}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex items-center justify-between"><h2 className="font-extrabold text-slate-900">Items in this order</h2><span className="text-xs text-slate-500">{details.length} items</span></div>
                <div className="divide-y divide-slate-100">
                  {details.map((item, index) => {
                    const id = productId(item);
                    const trackPath = `/track/${encodeURIComponent(order.orderNo || order.orderId || order._id)}`;
                    const productPath = id ? `/p/${encodeURIComponent(id)}?returnTo=${encodeURIComponent(trackPath)}` : '';
                    const image = item.image || item.thumbnail || item.images?.[0] || '';
                    const info = <div className="flex min-w-0 items-center gap-3 py-3">
                      {image ? <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-slate-50 object-cover" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-300"><PackageCheck size={20} /></span>}
                      <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-bold text-slate-800">{item.name || item.productName || 'Product'}</p><p className="mt-1 text-xs text-slate-500">{item.variantName || item.variant || item.unit || item.packSize || 'Standard'} · Qty {item.qty || 1}</p></div>
                      <p className="shrink-0 text-sm font-bold text-slate-900">{formatMoney((Number(item.price) || 0) * (Number(item.qty) || 1), business)}</p>
                    </div>;
                    return id ? <Link key={item.lineId || item.id || item._id || index} to={productPath} className="block rounded-lg outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-500">{info}</Link>
                      : <div key={item.lineId || index}>{info}</div>;
                  })}
                  {!details.length && <p className="py-5 text-center text-sm text-slate-500">Item details are not available.</p>}
                </div>
                <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  {itemsPrice > 0 && <div className="flex justify-between"><span>Items price</span><span>{formatMoney(itemsPrice, business)}</span></div>}
                  {productDiscount > 0 && <div className="flex justify-between text-emerald-700"><span>Product discount</span><span>− {formatMoney(productDiscount, business)}</span></div>}
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(itemsTotal, business)}</span></div>
                  {couponDiscount > 0 && <div className="flex justify-between text-emerald-700"><span>Coupon discount</span><span>− {formatMoney(couponDiscount, business)}</span></div>}
                  <div className="flex justify-between"><span>Delivery{order.zone?.name ? ` · ${order.zone.name}` : ''}</span><span className={freeDelivery ? 'font-semibold text-emerald-700' : ''}>{freeDelivery ? 'FREE' : formatMoney(deliveryCharge, business)}</span></div>
                  {Number(order.searchCharge) > 0 && <div className="flex justify-between"><span>Search charge</span><span>{formatMoney(order.searchCharge, business)}</span></div>}
                  {Number(order.platformFee) > 0 && <div className="flex justify-between"><span>Platform fee</span><span>{formatMoney(order.platformFee, business)}</span></div>}
                  {Number(order.taxAmount ?? bill?.taxAmount) > 0 && <div className="flex justify-between"><span>{bill?.taxName || order.taxName || 'Tax'}</span><span>{formatMoney(order.taxAmount ?? bill?.taxAmount, business)}</span></div>}
                  <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-extrabold text-slate-900"><span>Total</span><span>{formatMoney(order.amount || order.total, business)}</span></div>
                  {Number(order.amountDueOnDelivery) > 0 && <div className="flex justify-between rounded-lg bg-amber-50 px-3 py-2 text-amber-800"><span>{String(order.paymentStatus || '').toLowerCase() === 'paid' ? 'Extra COD to pay at delivery' : 'COD to pay at delivery'}</span><b>{formatMoney(order.amountDueOnDelivery, business)}</b></div>}
                  {itemRefundTotal > 0 && <div className="flex justify-between rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800"><span>Refund to original payment method · {itemRefunds.some(item => ['submitting', 'unknown'].includes(item.status)) ? 'being confirmed' : itemRefunds.some(item => item.status === 'processing') ? 'processing' : itemRefunds.some(item => item.status === 'completed') ? 'refunded' : 'initiated'}</span><b>{formatMoney(itemRefundTotal, business)}</b></div>}
                  <div className="flex justify-between pt-1"><span>Payment</span><span className="font-semibold text-slate-800">{order.paymentStatus || order.payment || 'Pending'}</span></div>
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
