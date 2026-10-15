import { useEffect, useState } from 'react'
import ProductCard from './ProductCard'
import { imageOf, money, request } from '../lib/storefront'
import './StoreAccountPages.css'

function PageHeading({ eyebrow, title, action }) {
  return <div className="account-page-heading">
    <div><span className="account-page-eyebrow">{eyebrow}</span><h1>{title}</h1></div>
    {action}
  </div>
}

function EmptyState({ title, message, action, onAction }) {
  return <div className="account-empty-state">
    <span aria-hidden="true">—</span>
    <h2>{title}</h2>
    <p>{message}</p>
    {action && <button type="button" onClick={onAction}>{action}</button>}
  </div>
}

export function CartPage({ cart, products, count, subtotal, business, changeQty, clearCart, checkout, address, phone, location, serviceArea, setLocationOpen, setAddressOpen, startCheckout, busy, placeOrder, quote, couponCode, applyCoupon, removeCoupon, paymentMethod, setPaymentMethod, onCart, onShop }) {
  const [couponDraft, setCouponDraft] = useState(couponCode || '')
  const cartProducts = cart.map(item => {
    const catalogProduct = products.find(product =>
      [product._id, product.id, product.productId].some(id => id != null && String(id) === String(item.id))
    )
    const mrp = Number(item.mrp || catalogProduct?.mrp || catalogProduct?.originalPrice || catalogProduct?.price) || Number(item.price) || 0
    return {
      ...item,
      catalogProduct,
      brand: item.brand || catalogProduct?.brand || '',
      unit: item.unit || catalogProduct?.unit || '',
      mrp,
      discount: Number(item.discount || catalogProduct?.discount) || 0,
    }
  })
  const savings = cartProducts.reduce((sum, item) => sum + Math.max(0, item.mrp - item.price) * item.qty, 0)
  const bill = quote?.deliverable ? quote : null
  const totalAmount = bill?.total ?? subtotal
  const productRows = cartProducts.map(item => (
    <article className="cart-page-item" key={`${item.id}:${item.variantId || 'default'}`}>
      <div className="cart-page-thumb">{item.image ? <img src={imageOf(item)} alt={item.name} /> : <span>{item.name?.slice(0, 1) || '?'}</span>}</div>
      <div className="cart-page-item-info">
        {item.brand && <span className="cart-page-brand">{item.brand}</span>}
        <h3>{item.name}</h3>
        {(item.unit || item.variantLabel) && <small>{item.unit || item.variantLabel}</small>}
        {item.catalogProduct?.tags?.length > 0 && <span className="cart-page-product-tag">{item.catalogProduct.tags[0]}</span>}
        <div className="cart-page-pricing">
          <b>{money(item.price, business)}</b>
          {item.mrp > item.price && <del>{money(item.mrp, business)}</del>}
          {item.discount > 0 && <span>{item.discount}% OFF</span>}
        </div>
      </div>
      <div className="cart-page-item-actions">
        <div className="cart-page-quantity" aria-label={`${item.qty} in cart`}>
          <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => changeQty(item, -1)}>−</button>
          <span>{item.qty}</span>
          <button type="button" aria-label={`Add one ${item.name}`} onClick={() => changeQty(item, 1)}>+</button>
        </div>
        <button type="button" className="cart-remove-button" aria-label={`Remove ${item.name}`} onClick={() => changeQty(item, -item.qty)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/></svg>
        </button>
      </div>
      <strong className="cart-page-line-total">{money(item.price * item.qty, business)}</strong>
    </article>
  ))
  const billDetails = <>
    <h3>Bill Details</h3>
    <div><span>Item Total ({count} items)</span><b>{money(subtotal, business)}</b></div>
    <div><span>Delivery Charges</span><b>{bill ? money(bill.deliveryCharge, business) : 'Calculated at checkout'}</b></div>
    {bill && <div><span>Search Charge</span><b>{money(bill.searchCharge, business)}</b></div>}
    {bill && <div><span>Platform Fee</span><b>{money(bill.platformFee, business)}</b></div>}
    {bill?.taxAmount > 0 && <div><span>{bill.taxName || 'GST'} ({bill.taxPercent}%) {bill.taxIncluded ? '(included)' : ''}</span><b>{money(bill.taxAmount, business)}</b></div>}
    {bill?.couponDiscount > 0 && <div className="cart-page-savings"><span>Coupon {bill.couponCode} discount</span><b>−{money(bill.couponDiscount, business)}</b></div>}
    {savings > 0 && <div className="cart-page-savings"><span>You are saving {money(savings, business)}<small>with offers and discounts</small></span></div>}
    {quote?.message && !quote.deliverable && <p className="cart-page-quote" role="status">{quote.message}</p>}
    <div className="cart-page-grand-total"><span>Total Amount</span><b>{money(totalAmount, business)}</b></div>
  </>
  const hasPaymentOptions = business.codEnabled !== false || business.onlinePaymentEnabled

  return <main className="account-page">
    {!cart.length
      ? <EmptyState title="A little space for something lovely." message="Your bag is waiting for its first good thing." action="Keep exploring" onAction={onShop} />
      : checkout
      ? <div className="checkout-page-layout">
        <section className="cart-page-card checkout-order-card" aria-label="Order details">
          <div className="cart-page-card-heading">
            <div><span className="cart-page-cart-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 9H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg></span><div><h2>Order Details</h2><p>{count} item(s) in your order</p></div></div>
            <button type="button" className="cart-clear-button" onClick={onCart}>Back to cart</button>
          </div>
          <div className="cart-page-items" aria-label="Items in your order">{productRows}</div>
          <div className="checkout-order-bill cart-page-bill-details">{billDetails}</div>
        </section>

        <section className="cart-page-card checkout-payment-card" aria-label="Delivery and payment">
          <div className="cart-page-card-heading">
            <div><span className="cart-page-cart-icon" aria-hidden="true">✓</span><div><h2>Delivery & Payment</h2><p>Confirm your address and payment method</p></div></div>
          </div>
          <div className="checkout-payment-content">
            <section className="checkout-address-block" aria-label="Delivery address">
              <div className="checkout-section-heading"><h3>Delivery address</h3>
                {address && <button type="button" onClick={() => setAddressOpen(true)}>Edit</button>}
              </div>
              <div className="checkout-location">Delivering to {location.pincode || 'your selected location'} <button type="button" onClick={() => setLocationOpen(true)}>Change</button></div>
              {address
                ? <p className="checkout-saved-address">{address}<br /><span>{phone}</span></p>
                : <button type="button" className="button button-dark wide" onClick={() => setAddressOpen(true)}>Add delivery address</button>}
            </section>

            <section className="checkout-coupon checkout-panel" aria-label="Coupon code">
              <label htmlFor="checkout-coupon-code">Apply coupon code</label>
              <div><input id="checkout-coupon-code" value={couponDraft} onChange={event => setCouponDraft(event.target.value.toUpperCase())} placeholder="Enter coupon code" />
                <button type="button" disabled={busy || !couponDraft.trim()} onClick={() => applyCoupon(couponDraft)}>Apply</button></div>
              {quote?.couponCode && !quote.couponError && <p role="status">Applied: {quote.couponTitle || quote.couponCode}</p>}
              {quote?.couponError && <p className="cart-page-quote" role="alert">{quote.couponError}</p>}
              {couponCode && <button type="button" className="checkout-coupon-remove" disabled={busy} onClick={() => { setCouponDraft(''); removeCoupon() }}>Remove coupon</button>}
            </section>

            <fieldset className="checkout-payment-methods checkout-panel">
              <legend>Payment method</legend>
              {business.onlinePaymentEnabled && <label className={`checkout-payment-option ${paymentMethod === 'ONLINE' ? 'is-selected' : ''}`}>
                <input type="radio" name="checkout-payment" value="ONLINE" checked={paymentMethod === 'ONLINE'} onChange={() => setPaymentMethod('ONLINE')} />
                <span className="checkout-payment-option-copy"><b>Pay online</b><small>Secure payment via {business.paymentGateway || 'payment gateway'}</small><span className="checkout-payment-badges"><i>UPI</i><i>Cards</i><i>EMI</i><i>Wallets</i></span></span>
              </label>}
              {business.codEnabled !== false && <label className={`checkout-payment-option ${paymentMethod === 'COD' ? 'is-selected' : ''}`}>
                <input type="radio" name="checkout-payment" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} />
                <span className="checkout-payment-option-copy"><b>Cash on delivery</b><small>Pay when your order arrives</small></span>
              </label>}
              {!hasPaymentOptions && <p className="cart-page-quote" role="status">No payment method is currently available. Please contact the store.</p>}
            </fieldset>

            {serviceArea && <p className={`cart-page-quote ${serviceArea.serviceable === true ? 'text-emerald-700' : serviceArea.serviceable === false ? 'text-rose-700' : 'text-amber-700'}`} role="status">
              {serviceArea.serviceable === true ? `Service available${serviceArea.zone?.name ? ` in ${serviceArea.zone.name}` : ''}.` : serviceArea.serviceable === false ? 'Out of service area for this PIN code.' : 'Could not verify service area.'}
            </p>}
            <button className="button button-orange wide checkout-complete-order" disabled={busy || !address || !phone || !hasPaymentOptions || serviceArea?.serviceable !== true || !!quote?.couponError} onClick={placeOrder}>
              {busy ? 'Processing…' : paymentMethod === 'ONLINE' ? `Pay securely with ${business.paymentGateway || 'gateway'}` : 'Complete order · Cash on delivery'} <span>→</span>
            </button>
            <p className="cart-page-checkout-note">Your total: {money(totalAmount, business)}</p>
          </div>
        </section>
      </div>
      : <section className="cart-page-card" aria-label="Shopping cart">
        <div className="cart-page-card-heading">
          <div><span className="cart-page-cart-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 9H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg></span><div><h2>Your Cart ({count})</h2><p>Items added to your cart</p></div></div>
          <button type="button" className="cart-clear-button" onClick={clearCart}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/></svg>
            Clear Cart
          </button>
        </div>
        <div className="cart-page-items" aria-label="Items in your cart">
          {productRows}
        </div>
        <div className="cart-page-billing">
          <div className="cart-page-bill-details">{billDetails}</div>
          <aside className="cart-page-summary">
            <button className="button button-orange wide" onClick={startCheckout}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 9H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg>
            Proceed to Checkout <span>→</span>
            </button>
            <p className="cart-page-checkout-note">Shipping and taxes calculated at checkout.</p>
          </aside>
        </div>
      </section>}
  </main>
}

export function WishlistPage({ products, favorites, loading, productProps, onShop }) {
  const saved = products.filter(product => favorites.includes(String(product._id || product.id || product.productId || '')))
  return <main className="account-page">
    <PageHeading eyebrow="SAVED FOR LATER" title={<>Your wishlist <em>({favorites.length})</em></>} />
    {loading
      ? <p className="account-page-status">Loading your wishlist…</p>
      : saved.length
      ? <div className="product-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {saved.map((product, index) => <ProductCard key={`wishlist-${product.id || product._id || index}`} {...productProps} product={product} index={index} prefix="wishlist" />)}
      </div>
      : <EmptyState title="Your wishlist is waiting." message="Save something you love and it will show up here." action="Explore products" onAction={onShop} />}
  </main>
}

export function ProfilePage({ customer, onLogin, onSignOut, onOrders }) {
  return <main className="account-page">
    <PageHeading eyebrow="YOUR ACCOUNT" title="Profile" />
    {customer
      ? <section className="profile-card">
        <div className="profile-avatar" aria-hidden="true">{String(customer.name || 'U').trim().slice(0, 1).toUpperCase()}</div>
        <div className="profile-details"><h2>{customer.name || 'Customer'}</h2><p>{customer.email || 'Email not added'}</p><p>{customer.phone || 'Phone not added'}</p></div>
        <div className="profile-actions">
          <button className="button button-dark" type="button" onClick={onOrders}>View your orders</button>
          <button className="text-button" type="button" onClick={onSignOut}>Sign out</button>
        </div>
      </section>
      : <EmptyState title="Sign in to your account" message="Sign in to see your profile and keep your orders together." action="Sign in" onAction={onLogin} />}
  </main>
}

export function OrdersPage({ customer, business, onLogin }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!customer) {
      setOrders([])
      setError('')
      return undefined
    }
    let active = true
    setLoading(true)
    setError('')
    request('/shop/orders')
      .then(data => { if (active) setOrders(Array.isArray(data) ? data : []) })
      .catch(loadError => { if (active) setError(loadError.message || 'Your orders could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [customer])

  return <main className="account-page">
    <PageHeading eyebrow="YOUR ACCOUNT" title="Your orders" />
    {!customer
      ? <EmptyState title="Sign in to view your orders" message="Your order history will be available after you sign in." action="Sign in" onAction={onLogin} />
      : loading
        ? <p className="account-page-status">Loading your orders…</p>
        : error
          ? <p className="account-page-error" role="alert">{error}</p>
          : orders.length
            ? <div className="orders-list">{orders.map(order => <article className="order-card" key={order._id || order.orderNo}>
              <div className="order-card-head"><div><span>Order</span><h2>{order.orderNo || order.orderId || 'Order'}</h2></div><strong>{order.status || 'Pending'}</strong></div>
              <div className="order-card-meta"><span>{order.orderDate || order.createdAt || order.date || 'Date unavailable'}</span><span>{order.items || order.details?.length || 0} item(s)</span><b>{money(order.amount ?? order.total, business)}</b></div>
              {order.address && <p>{order.address}</p>}
            </article>)}</div>
            : <EmptyState title="No orders yet" message="Once you place an order, its details will appear here." />}
  </main>
}

export function SupportPage({ business }) {
  const hasContact = business.businessPhone || business.businessEmail
  return <main className="account-page">
    <PageHeading eyebrow="WE'RE HERE TO HELP" title="Support" />
    {hasContact
      ? <section className="support-card">
        <h2>How can we help?</h2>
        <p>Reach out to our support team and we’ll be happy to help with your order or account.</p>
        <div className="support-actions">
          {business.businessPhone && <a className="button button-dark" href={`tel:${business.businessPhone}`}>Call {business.businessPhone}</a>}
          {business.businessEmail && <a className="button button-orange" href={`mailto:${business.businessEmail}?subject=${encodeURIComponent('Store support')}`}>Email support</a>}
        </div>
      </section>
      : <EmptyState title="Support contact unavailable" message="Please check back later for contact details." />}
  </main>
}
