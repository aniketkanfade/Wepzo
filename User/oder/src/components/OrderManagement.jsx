import { useEffect, useMemo, useRef, useState } from 'react'
import { formatINR } from '../data/store.js'
import Icon from './Icon.jsx'
import { QRCodeSVG } from 'qrcode.react'
import { createUpiPaymentUri, getOrderPaymentSummary } from '../utils/orderPayments.js'
import { downloadOrderBill, shareOrderBill } from '../utils/adminExports.js'

const statuses = [
  { id: 'new', label: 'New orders' },
  { id: 'processing', label: 'Processing' },
  { id: 'on_the_way', label: 'On the way' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'refunded', label: 'Refunds' },
]
const statusLabel = (status) => statuses.find((item) => item.id === status)?.label || 'New'
const dateLabel = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}
const deliveryLabel = (partner) => ({ shadowfax: 'Shadowfax', porter: 'Porter', ownRider: 'Store rider' }[partner] || partner || 'Standard delivery')

function InvoicePreview({ order, upiId }) {
  const items = order.items || []
  const subtotal = Number(order.subtotal ?? items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0))
  const shipping = Number(order.shipping || 0)
  const { total, paid, balance } = getOrderPaymentSummary(order)
  const invoiceUpiId = upiId || order.upiId || ''
  const paymentUri = createUpiPaymentUri(order, invoiceUpiId)
  const address = order.address || {}

  return <article className="invoice-preview-sheet">
    <header className="invoice-sheet-header"><div><strong>{order.storeName || 'Store'}</strong><small>Customer invoice</small></div><div><span>INVOICE</span><strong>{String(order.id || '').toUpperCase()}</strong><small>{dateLabel(order.createdAt)}</small></div></header>
    <div className="invoice-customer-block"><div><span>BILL TO</span><strong>{order.customer?.name || address.name || 'Customer'}</strong><small>{order.customer?.email || 'Email not provided'}</small><small>{order.customer?.phone || address.phone || 'Phone not provided'}</small></div><div><span>DELIVERY ADDRESS</span><strong>{[address.line, address.city, address.postal].filter(Boolean).join(', ') || 'Address not provided'}</strong><small>Payment: {order.paymentMethod || 'Not specified'}</small></div></div>
    <div className="invoice-items-scroll"><table className="invoice-items-table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>{items.map((item, index) => <tr key={`${item.id || item.name}-${index}`}><td>{item.name || 'Product'}{(item.size || item.weight) && <small className="invoice-item-option">{item.size ? `Size: ${item.size}` : `Weight: ${item.weight}`}</small>}</td><td>{Number(item.quantity || 0)}</td><td>{formatINR(item.price || 0)}</td><td>{formatINR(Number(item.price || 0) * Number(item.quantity || 0))}</td></tr>)}</tbody></table></div>
    <div className="invoice-totals"><div><span>Subtotal</span><strong>{formatINR(subtotal)}</strong></div><div><span>Shipping</span><strong>{shipping ? formatINR(shipping) : 'Free'}</strong></div><div className="invoice-grand-total"><span>Total amount</span><strong>{formatINR(total)}</strong></div><div><span>{order.paymentMethod === 'advance' ? 'Advance paid' : 'Paid'}</span><strong>{formatINR(paid)}</strong></div><div><span>Balance due</span><strong>{formatINR(balance)}</strong></div></div>
    {balance > 0 && (paymentUri ? <section className="invoice-payment-qr"><div><span>PAY REMAINING BALANCE</span><strong>{formatINR(balance)}</strong><small>UPI ID: {invoiceUpiId}</small><p>Scan with any UPI app to pay.</p></div><QRCodeSVG value={paymentUri} size={128} level="M" includeMargin/></section> : <p className="invoice-payment-unavailable">Balance due: {formatINR(balance)}. Add a store UPI ID to enable payment QR.</p>)}
    <footer className="invoice-sheet-footer"><span>Order {order.id || ''}</span><span>Thank you for your order.</span></footer>
  </article>
}

export default function OrderManagement({ orders = [], isMainAdmin = false, searchTerm = '', onUpdateStatus, upiId = '' }) {
  const [filter, setFilter] = useState('new')
  const statusTabsRef = useRef(null)
  const statusScrollFrameRef = useRef(null)
  const [invoiceOrder, setInvoiceOrder] = useState(null)
  const [invoiceShareMessage, setInvoiceShareMessage] = useState('')
  useEffect(() => { if (searchTerm.trim()) setFilter('all') }, [searchTerm])
  useEffect(() => {
    const tabs = statusTabsRef.current
    const activeTab = tabs?.querySelector('.active')
    if (!tabs || !activeTab) return
    if (statusScrollFrameRef.current) cancelAnimationFrame(statusScrollFrameRef.current)
    const tabsBounds = tabs.getBoundingClientRect()
    const activeBounds = activeTab.getBoundingClientRect()
    const centeredScrollLeft = tabs.scrollLeft + activeBounds.left - tabsBounds.left - (tabs.clientWidth - activeTab.clientWidth) / 2
    tabs.scrollTo({ left: Math.max(0, centeredScrollLeft), behavior: 'smooth' })
  }, [filter])
  useEffect(() => () => {
    if (statusScrollFrameRef.current) cancelAnimationFrame(statusScrollFrameRef.current)
  }, [])
  useEffect(() => {
    if (!invoiceOrder) return undefined
    const closeOnEscape = (event) => { if (event.key === 'Escape') setInvoiceOrder(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [invoiceOrder])
  const sortedOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [orders])
  const matchingOrders = searchTerm.trim() ? sortedOrders.filter((order) => `${order.id} ${order.storeName} ${order.customer?.name} ${order.customer?.email} ${order.customer?.phone} ${(order.items || []).map((item) => item.name).join(' ')}`.toLowerCase().includes(searchTerm.trim().toLowerCase())) : sortedOrders
  const visibleOrders = filter === 'all' ? matchingOrders : matchingOrders.filter((order) => (order.status || 'new') === filter)
  const count = (status) => sortedOrders.filter((order) => (order.status || 'new') === status).length
  const shareInvoice = async () => {
    try {
      const result = await shareOrderBill({ ...invoiceOrder, upiId })
      setInvoiceShareMessage(result === 'copied' ? 'Invoice details copied to clipboard.' : result === 'unavailable' ? 'Sharing is not available in this browser.' : 'Invoice shared.')
    } catch (error) {
      if (error.name !== 'AbortError') setInvoiceShareMessage('Could not share this invoice.')
    }
  }
  const scrollStatusTabs = (direction) => {
    const tabs = statusTabsRef.current
    if (!tabs) return
    if (statusScrollFrameRef.current) cancelAnimationFrame(statusScrollFrameRef.current)
    const start = tabs.scrollLeft
    const target = Math.max(0, Math.min(tabs.scrollWidth - tabs.clientWidth, start + direction * 180))
    const startedAt = performance.now()
    const duration = 900
    const animate = (timestamp) => {
      const progress = Math.min(1, (timestamp - startedAt) / duration)
      const eased = progress * progress * (3 - 2 * progress)
      tabs.scrollLeft = start + (target - start) * eased
      if (progress < 1) statusScrollFrameRef.current = requestAnimationFrame(animate)
      else statusScrollFrameRef.current = null
    }
    statusScrollFrameRef.current = requestAnimationFrame(animate)
  }

  return <section className="order-management">
    <div className="admin-section-heading"><div><h2>{isMainAdmin ? 'All store orders' : 'Store orders'}</h2><p>{isMainAdmin ? 'Review and update orders from every storefront.' : 'Accept orders and follow each delivery through to completion.'}</p></div><span>{sortedOrders.length} total</span></div>
    <div className="order-status-filter">
      <button type="button" className="order-status-scroll order-status-scroll-left" aria-label="Scroll statuses left" onClick={() => scrollStatusTabs(-1)}><Icon name="arrow" size={15}/></button>
      <div className="order-status-tabs" ref={statusTabsRef} role="tablist" aria-label="Filter orders">
        <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All <b>{sortedOrders.length}</b></button>
        {statuses.map((status) => <button type="button" key={status.id} className={filter === status.id ? 'active' : ''} onClick={() => setFilter(status.id)}>{status.label} <b>{count(status.id)}</b></button>)}
      </div>
      <button type="button" className="order-status-scroll order-status-scroll-right" aria-label="Scroll statuses right" onClick={() => scrollStatusTabs(1)}><Icon name="arrow" size={15}/></button>
    </div>
    {!visibleOrders.length ? <div className="admin-empty order-empty"><span>OR</span><h2>{filter === 'new' ? 'No new orders' : `No ${filter === 'all' ? '' : statusLabel(filter).toLowerCase() + ' '}orders`}</h2><p>Orders will appear here after customers place them.</p></div> : <div className="order-card-list">{visibleOrders.map((order) => {
      const current = order.status || 'new'
      const steps = ['new', 'processing', 'on_the_way', 'delivered']
      const currentStep = steps.indexOf(current)
      const history = order.statusHistory || []
      return <article className="order-card" key={`${order.storeId}-${order.id}`}>
        <header className="order-card-header"><div><span className="order-number">ORDER {String(order.id || '').slice(-8).toUpperCase()}</span><small>{dateLabel(order.createdAt)}</small></div><span className={`order-status-pill status-${current}`}>{statusLabel(current)}</span></header>
        <div className="order-card-main">
          <div className="order-customer"><strong>{order.customer?.name || order.address?.name || 'Customer'}</strong><span>{order.customer?.email || 'Email not provided'}</span><span>{order.customer?.phone || order.address?.phone || 'Phone not provided'}</span><span>{[order.address?.line, order.address?.city, order.address?.postal].filter(Boolean).join(', ') || 'Delivery address not provided'}</span>{order.storePickup?.address && <span><b>Store pickup for rider:</b> {order.storePickup.address}</span>}</div>
          <div className="order-products">{(order.items || []).map((item) => <div key={item.id}><span>{item.name} <b>× {item.quantity}</b>{(item.size || item.weight) && <small className="order-product-option">{item.size ? `Size: ${item.size}` : `Weight: ${item.weight}`}</small>}</span><strong>{formatINR(Number(item.price || 0) * Number(item.quantity || 0))}</strong></div>)}<div className="order-total"><span>Total</span><strong>{formatINR(order.total || 0)}</strong></div><small>{order.paymentMethod === 'cod' ? 'Cash on delivery' : order.paymentMethod === 'advance' ? `Advance paid ${formatINR(order.paidAmount || 0)}` : `Paid online ${formatINR(order.paidAmount || 0)}`}</small>{current === 'delivered' && Number(order.total || 0) > Number(order.paidAmount || 0) && <div className="order-cod-payment"><span>Balance at delivery</span><strong>{formatINR(Number(order.total || 0) - Number(order.paidAmount || 0))}</strong><b>{order.codCollectionStatus === 'paid' ? 'COD marked paid' : 'COD payment pending'}</b></div>}</div>
          {isMainAdmin && <div className="order-store-tag"><span>STORE</span><strong>{order.storeName || (order.storeId === 'main' ? 'Main store' : order.storeId || 'Main store')}</strong></div>}
        </div>
        {(current === 'on_the_way' || current === 'delivered') && <div className="order-tracking"><strong>Delivery progress</strong><span>{deliveryLabel(order.deliveryPartner)}</span><div className="order-tracking-steps">{steps.map((step, index) => <div key={step} className={index <= currentStep ? 'complete' : ''}><i/><span>{statusLabel(step)}</span></div>)}</div>{history.filter((entry) => entry.status === current).map((entry, index) => <small key={`${entry.at}-${index}`}>Updated {dateLabel(entry.at)}</small>)}</div>}
        <footer className="order-actions"><button type="button" className="order-action-muted order-bill-download" onClick={() => { setInvoiceOrder(order); setInvoiceShareMessage('') }}>View invoice</button>{current === 'new' && <button type="button" className="order-action-primary" onClick={() => onUpdateStatus(order, 'processing')}>Accept order →</button>}{current === 'processing' && <button type="button" className="order-action-primary" onClick={() => onUpdateStatus(order, 'on_the_way')}>Ready · Send on the way →</button>}{current === 'on_the_way' && <button type="button" className="order-action-primary" onClick={() => onUpdateStatus(order, 'delivered')}>Mark delivered →</button>}{!['cancelled', 'refunded', 'delivered'].includes(current) && <button type="button" className="order-action-muted" onClick={() => onUpdateStatus(order, 'cancelled')}>Cancel order</button>}{current === 'cancelled' && <button type="button" className="order-action-muted" onClick={() => onUpdateStatus(order, 'refunded')}>Mark refund complete</button>}</footer>
      </article>
    })}</div>}
    {invoiceOrder && <div className="invoice-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setInvoiceOrder(null) }}><section className="invoice-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-modal-title"><header className="invoice-modal-header"><div><span id="invoice-modal-title">INVOICE PREVIEW</span><p>Review the bill before downloading or sharing it.</p></div><button type="button" className="invoice-modal-close" onClick={() => setInvoiceOrder(null)} aria-label="Close invoice preview" title="Close preview"><Icon name="close" size={17}/></button></header><div className="invoice-modal-body"><InvoicePreview order={invoiceOrder} upiId={upiId}/></div><footer className="invoice-modal-footer">{invoiceShareMessage && <p role="status">{invoiceShareMessage}</p>}<div><button type="button" className="order-action-muted invoice-modal-action" onClick={() => setInvoiceOrder(null)} aria-label="Cancel invoice preview" title="Cancel"><Icon name="close" size={16}/><span className="invoice-modal-action-label">Cancel</span></button><button type="button" className="order-action-muted invoice-modal-action" onClick={shareInvoice} aria-label="Share invoice" title="Share invoice"><Icon name="share" size={16}/><span className="invoice-modal-action-label">Share invoice</span></button><button type="button" className="order-action-primary invoice-modal-action" onClick={() => downloadOrderBill({ ...invoiceOrder, upiId })} aria-label="Download invoice PDF" title="Download PDF"><Icon name="download" size={16}/><span className="invoice-modal-action-label">Download PDF</span></button></div></footer></section></div>}
  </section>
}


