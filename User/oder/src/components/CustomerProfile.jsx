import { formatINR } from '../data/store.js'

const labels = { new: 'New', processing: 'Processing', on_the_way: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded' }
const steps = ['new', 'processing', 'on_the_way', 'delivered']
const displayDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function CustomerProfile({ customer, orders = [], onLogout }) {
  return <section className="customer-profile-page">
    <div className="customer-profile-heading"><div><span className="eyebrow">YOUR MORROW ACCOUNT</span><h1>Profile & orders</h1><p>{customer?.name || 'Customer'} · {customer?.email} · {customer?.phone}</p></div><button className="customer-logout" type="button" onClick={onLogout}>Log out</button></div>
    <div className="customer-order-heading"><h2>Your orders</h2><span>{orders.length} {orders.length === 1 ? 'order' : 'orders'}</span></div>
    {!orders.length ? <div className="customer-no-orders"><h3>No orders yet</h3><p>Your orders and delivery updates will appear here.</p></div> : <div className="customer-order-list">{orders.map((order) => {
      const status = order.status || 'new'
      const step = steps.indexOf(status)
      const balanceDue = Math.max(0, Number(order.total || 0) - Number(order.paidAmount || 0))
      return <article className="customer-order-card" key={order.id}>
        <header><div><strong>Order {String(order.id || '').slice(-8).toUpperCase()}</strong><small>{displayDate(order.createdAt)}</small></div><span className={`order-status-pill status-${status}`}>{labels[status] || 'New'}</span></header>
        <div className="customer-order-lines">{(order.items || []).map((item) => <div key={item.id}><span>{item.name} × {item.quantity}</span><strong>{formatINR(Number(item.price || 0) * Number(item.quantity || 0))}</strong></div>)}<div className="order-total"><span>Order total</span><strong>{formatINR(order.total || 0)}</strong></div></div>
        {status !== 'cancelled' && status !== 'refunded' && <div className="customer-progress">{steps.map((item, index) => <div className={index <= step ? 'complete' : ''} key={item}><i/><span>{labels[item]}</span></div>)}</div>}
        {order.paymentMethod === 'advance' && <div className="customer-balance"><span>Paid in advance</span><strong>{formatINR(order.paidAmount || 0)}</strong><span>Remaining at delivery</span><strong>{formatINR(balanceDue)}</strong></div>}
        {order.codCollectionStatus === 'paid' && <p className="customer-paid-note">COD balance marked paid on {displayDate(order.balancePaidAt)}.</p>}
        <footer><span>{[order.address?.line, order.address?.city, order.address?.postal].filter(Boolean).join(', ') || 'Delivery address'}</span><strong>{labels[status] || 'New'}</strong></footer>
      </article>
    })}</div>}
  </section>
}
