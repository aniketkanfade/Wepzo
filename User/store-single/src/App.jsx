import { useEffect, useMemo, useState } from 'react'
import { ADMIN_PREVIEW, BUILDER_PREVIEW, assetUrl, request } from './api'

const formatMoney = (value, business = {}) => {
  const amount = Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: Math.max(0, Math.min(4, Number(business.decimalDigits) || 0)),
    maximumFractionDigits: Math.max(0, Math.min(4, Number(business.decimalDigits) || 0)),
  })
  const symbol = business.currencySymbol || 'â‚¹'
  return business.currencyPosition === 'right' ? `${amount} ${symbol}` : `${symbol}${amount}`
}

export default function App() {
  const [home, setHome] = useState(null)
  const [products, setProducts] = useState([])
  const [components, setComponents] = useState([])
  const [cart, setCart] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [customer, setCustomer] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [checkout, setCheckout] = useState({ name: '', email: '', phone: '', password: '', address: '', pincode: '', state: '' })
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [shopperReady, setShopperReady] = useState(false)
  const business = home?.business || {}

  useEffect(() => {
    let active = true
    Promise.all([
      request('/shop/home'),
      request('/shop/products'),
      request('/shop/state'),
      request('/shop/auth/me').then(result => result.user || null).catch(authError => {
        if (authError.status === 401) return null
        throw authError
      }),
    ])
      .then(([homeData, productData, shopperState, customerData]) => {
        if (!active) return
        setHome(homeData)
        setProducts(Array.isArray(productData) ? productData : [])
        setComponents(Array.isArray(homeData.websiteComponents) ? homeData.websiteComponents : [])
        setCart(Array.isArray(shopperState.cart?.items) ? shopperState.cart.items : [])
        setCustomer(customerData)
        const savedAddress = shopperState.location?.checkoutAddress || {}
        setCheckout(current => ({ ...current, ...savedAddress, password: '', phone: savedAddress.phone || customerData?.phone || '' }))
      })
      .then(() => { if (active) setShopperReady(true) })
      .catch(loadError => { if (active) setError(loadError.message || 'Store products could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!BUILDER_PREVIEW) return undefined
    const receivePreview = event => {
      if (event.source !== window.parent || event.data?.type !== 'wepzo:builder-preview') return
      setComponents(Array.isArray(event.data.components) ? event.data.components : [])
    }
    window.addEventListener('message', receivePreview)
    return () => window.removeEventListener('message', receivePreview)
  }, [])

  useEffect(() => {
    if (!shopperReady) return undefined
    const timer = window.setTimeout(() => {
      request('/shop/state', {
        method: 'PUT',
        body: { state: {
          cart: { items: cart, couponCode: '', pendingPaymentOrder: null },
          wishlist: { items: [] },
          location: { current: null, saved: [], checkoutAddress: {
            name: checkout.name,
            email: checkout.email,
            phone: checkout.phone,
            address: checkout.address,
            pincode: checkout.pincode,
            state: checkout.state,
          }, gps: null, pickup: null },
          cookieAccepted: false,
        } },
      }).catch(saveError => setNotice(saveError.message || 'Your bag could not be saved to the server.'))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [shopperReady, cart, checkout.name, checkout.email, checkout.phone, checkout.address, checkout.pincode, checkout.state])

  const categories = useMemo(() => [...new Set(products.map(product => product.category).filter(Boolean))], [products])
  const shownProducts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return products.filter(product => {
      const matchesCategory = !category || product.category === category
      const matchesQuery = !needle || `${product.name || ''} ${product.brand || ''} ${product.category || ''}`.toLowerCase().includes(needle)
      return matchesCategory && matchesQuery
    })
  }, [products, query, category])
  const cartProducts = useMemo(() => cart.map(line => {
    const product = products.find(item => String(item.id || item._id) === String(line.id))
    return product ? { ...product, quantity: line.quantity } : null
  }).filter(Boolean), [cart, products])
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0)
  const subtotal = cartProducts.reduce((sum, product) => sum + (Number(product.price) || 0) * product.quantity, 0)
  const hero = (home?.banners || []).find(item => item.image || item.video)
  const logo = assetUrl(business.businessLogo)
  const heroImage = assetUrl(hero?.image)
  const whatsappNumber = String(business.businessPhone || '').replace(/\D/g, '')
  const componentNames = components.map(item => item.componentId?.name || item.componentId?.slug || item.name).filter(Boolean)
  const previewOnly = ADMIN_PREVIEW || BUILDER_PREVIEW || !home || home.isMainWebsite === true && ADMIN_PREVIEW

  const changeQuantity = (product, delta) => {
    const id = String(product.id || product._id)
    setCart(current => {
      const existing = current.find(line => String(line.id) === id)
      const nextQuantity = (existing?.quantity || 0) + delta
      if (nextQuantity <= 0) return current.filter(line => String(line.id) !== id)
      if (!existing) return [...current, { id, quantity: 1 }]
      return current.map(line => String(line.id) === id ? { ...line, quantity: nextQuantity } : line)
    })
    if (delta > 0) setNotice(`${product.name} added to your bag`)
  }

  const whatsappCheckout = () => {
    if (!cartProducts.length) return
    if (!whatsappNumber) {
      setNotice('The store has not added a WhatsApp phone number yet.')
      return
    }
    const lines = cartProducts.map(product => `â€¢ ${product.name} Ã— ${product.quantity} â€” ${formatMoney(product.price * product.quantity, business)}`)
    const message = [
      `Hello ${business.businessName || 'there'}, I would like to order:`,
      ...lines,
      `Total: ${formatMoney(subtotal, business)}`,
    ].join('\n')
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  const updateCheckout = event => setCheckout(current => ({ ...current, [event.target.name]: event.target.value }))
  const saveCustomer = data => {
    setCustomer(data.user)
    setCheckoutError('')
  }
  const authenticateCustomer = async event => {
    event.preventDefault()
    setCheckoutLoading(true)
    setCheckoutError('')
    try {
      const endpoint = authMode === 'register' ? '/shop/auth/register' : '/shop/auth/login'
      const body = authMode === 'register'
        ? { name: checkout.name, email: checkout.email, phone: checkout.phone, password: checkout.password }
        : { email: checkout.email, phone: checkout.phone, password: checkout.password }
      saveCustomer(await request(endpoint, { method: 'POST', body }))
    } catch (authError) {
      setCheckoutError(authError.message || 'Your account could not be verified.')
    } finally {
      setCheckoutLoading(false)
    }
  }
  const placeOrder = async event => {
    event.preventDefault()
    if (!customer) {
      setCheckoutError('Sign in or create an account before placing the order.')
      return
    }
    if (!cartProducts.length) return
    setCheckoutLoading(true)
    setCheckoutError('')
    const body = {
      items: cartProducts.map(product => ({ id: product.id || product._id, qty: product.quantity })),
      pincode: checkout.pincode,
      deliveryState: checkout.state,
      moduleSlug: 'store-single',
    }
    try {
      const quoteResult = await request('/shop/quote', { method: 'POST', body })
      if (!quoteResult.quote?.deliverable) throw new Error(quoteResult.quote?.message || 'This delivery location is unavailable.')
      const order = await request('/shop/orders', {
        method: 'POST',
        body: { ...body, address: checkout.address, phone: checkout.phone, payment: 'COD' },
      })
      setCart([])
      setNotice(`Order ${order.orderNo || ''} placed successfully.`)
    } catch (orderError) {
      setCheckoutError(orderError.message || 'Your order could not be placed.')
    } finally {
      setCheckoutLoading(false)
    }
  }
  const signOut = () => {
    request('/shop/auth/logout', { method: 'POST' }).catch(error => setNotice(error.message))
    setCustomer(null)
    setNotice('You have signed out.')
  }

  const cardStyles = business.themeColors?.storefrontCardStyles || {}
  return <div className="store-single" style={{
    '--store-accent': business.primaryColor || '#334b3f',
    '--storefront-product-border-radius': `${Math.max(0, Math.min(40, Number(cardStyles.product?.borderRadius ?? 12)))}px`,
    '--storefront-product-border-width': `${Math.max(0, Math.min(8, Number(cardStyles.product?.borderWidth ?? 1)))}px`,
    '--storefront-product-border-color': cardStyles.product?.borderColor || '#e2e8f0',
    '--storefront-product-background': cardStyles.product?.backgroundColor || business.themeColors?.productCardBackground || business.themeColors?.surfaceBackground || '#fff',
    '--storefront-category-border-radius': `${Math.max(0, Math.min(40, Number(cardStyles.category?.borderRadius ?? 12)))}px`,
    '--storefront-category-border-width': `${Math.max(0, Math.min(8, Number(cardStyles.category?.borderWidth ?? 1)))}px`,
    '--storefront-category-border-color': cardStyles.category?.borderColor || '#e2e8f0',
    '--storefront-category-background': cardStyles.category?.backgroundColor || business.themeColors?.surfaceBackground || '#fff',
    '--storefront-promo-border-radius': `${Math.max(0, Math.min(40, Number(cardStyles.promo?.borderRadius ?? 12)))}px`,
    '--storefront-promo-border-width': `${Math.max(0, Math.min(8, Number(cardStyles.promo?.borderWidth ?? 1)))}px`,
    '--storefront-promo-border-color': cardStyles.promo?.borderColor || '#e2e8f0',
    '--storefront-promo-background': cardStyles.promo?.backgroundColor || business.themeColors?.surfaceBackground || '#fff',
    '--storefront-account-border-radius': `${Math.max(0, Math.min(40, Number(cardStyles.account?.borderRadius ?? 12)))}px`,
    '--storefront-account-border-width': `${Math.max(0, Math.min(8, Number(cardStyles.account?.borderWidth ?? 1)))}px`,
    '--storefront-account-border-color': cardStyles.account?.borderColor || '#e2e8f0',
    '--storefront-account-background': cardStyles.account?.backgroundColor || business.themeColors?.surfaceBackground || '#fff',
    ...Object.fromEntries(['header', 'cart', 'profile', 'order', 'support', 'button'].flatMap(type => {
      const style = cardStyles[type] || {};
      return [
        [`--storefront-${type}-background`, style.backgroundColor || (type === 'header' ? business.themeColors?.headerBackground : type === 'product' ? business.themeColors?.productCardBackground : type === 'button' ? business.themeColors?.buttonBackground : business.themeColors?.surfaceBackground) || '#ffffff'],
        ...(type === 'button' ? [['--storefront-button-text-color', style.textColor || business.themeColors?.buttonText || '#ffffff']] : []),
        [`--storefront-${type}-border-radius`, `${Math.max(0, Math.min(40, Number(style.borderRadius ?? (type === 'button' ? 6 : 12))))}px`],
        [`--storefront-${type}-border-width`, `${Math.max(0, Math.min(8, Number(style.borderWidth ?? (type === 'button' ? 0 : 1))))}px`],
        [`--storefront-${type}-border-color`, style.borderColor || '#e2e8f0'],
      ];
    })),
  }}>
    <header className="site-header">
      <a className="brand" href="#top" aria-label={business.businessName || 'Store home'}>
        {logo ? <img src={logo} alt="" /> : <span className="brand-monogram">{(business.businessName || 'S').slice(0, 1)}</span>}
        <span>{business.businessName || 'Your Store'}</span>
      </a>
      <nav aria-label="Store navigation"><a href="#collection">Shop</a><a href="#about">About</a><a href="#contact">Contact</a></nav>
      <div className="header-actions">
      {customer && <button className="account-button" type="button" onClick={signOut}>Sign out</button>}
      <button className="bag-button" type="button" onClick={() => setCartOpen(true)} aria-label={`Open bag, ${cartCount} items`}>
      Bag <span>{cartCount}</span>
      </button>
      </div>
    </header>

    <main id="top">
      <section className={`hero ${heroImage ? 'hero-with-image' : ''}`} style={heroImage ? { backgroundImage: `linear-gradient(90deg, rgba(20, 31, 25, .76), rgba(20, 31, 25, .12)), url("${heroImage}")` } : undefined}>
        <div className="hero-content">
          <p className="eyebrow">{hero?.subtitle || 'A collection made for you'}</p>
          <h1>{hero?.title || business.siteTitle || business.businessName || 'Find your next favourite.'}</h1>
          <p className="hero-copy">{business.tagline || business.businessAddress || 'Discover thoughtful products selected by our team.'}</p>
          <a className="primary-button" href="#collection">{hero?.cta || 'Explore the collection'} <span aria-hidden="true">â†’</span></a>
        </div>
      </section>

      <section className="collection" id="collection">
        <div className="collection-heading">
          <div><p className="eyebrow">The collection</p><h2>Made to be yours</h2></div>
          <label className="search-box"><span aria-hidden="true">âŒ•</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search the collection" aria-label="Search products" /></label>
        </div>
        {categories.length > 0 && <div className="category-list" aria-label="Filter products">
          <button type="button" className={!category ? 'selected' : ''} onClick={() => setCategory('')}>All pieces</button>
          {categories.map(item => <button type="button" key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(category === item ? '' : item)}>{item}</button>)}
        </div>}
        {error && <div className="state-card error" role="alert"><strong>Storefront is unavailable</strong><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></div>}
        {loading && <div className="state-card">Loading the collectionâ€¦</div>}
        {!loading && !error && shownProducts.length === 0 && <div className="state-card">No products match your search yet.</div>}
        {!loading && !error && shownProducts.length > 0 && <div className="product-grid">
          {shownProducts.map(product => {
            const image = assetUrl(product.image || product.images?.[0])
            const quantity = cart.find(line => String(line.id) === String(product.id || product._id))?.quantity || 0
            return <article className="product-card" key={product.id || product._id}>
              <div className="product-image">
                {image ? <img src={image} alt={product.name || 'Store product'} loading="lazy" /> : <span>{(product.name || 'Product').slice(0, 1)}</span>}
                {Number(product.discount) > 0 && <span className="discount">{Math.round(product.discount)}% off</span>}
              </div>
              <div className="product-info">
                <p className="product-category">{product.category || product.brand || 'Selected piece'}</p>
                <h3>{product.name || 'Untitled product'}</h3>
                <p className="product-description">{product.shortDesc || product.description || ''}</p>
                <div className="product-buy">
                  <strong>{formatMoney(product.price, business)}</strong>
                  {quantity
                    ? <div className="quantity-control"><button type="button" onClick={() => changeQuantity(product, -1)} aria-label={`Remove one ${product.name}`}>âˆ’</button><span>{quantity}</span><button type="button" onClick={() => changeQuantity(product, 1)} aria-label={`Add one ${product.name}`}>+</button></div>
                    : <button type="button" className="add-button" onClick={() => changeQuantity(product, 1)}>Add to bag</button>}
                </div>
              </div>
            </article>
          })}
        </div>}
      </section>

      <section className="about" id="about">
        <p className="eyebrow">A little about us</p>
        <h2>{business.businessName || 'A store with a point of view'}</h2>
        <p>{business.about || business.description || business.businessAddress || 'A considered collection, brought together for everyday life.'}</p>
        {componentNames.length > 0 && BUILDER_PREVIEW && <small>Website sections: {componentNames.join(' Â· ')}</small>}
      </section>
    </main>

    <footer id="contact"><span>{business.copyrightText || `Â© ${new Date().getFullYear()} ${business.businessName || 'Your Store'}`}</span>
      <a href={business.businessEmail ? `mailto:${business.businessEmail}` : '#top'}>{business.businessEmail || 'Back to top'}</a>
    </footer>

    {cartOpen && <div className="cart-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setCartOpen(false) }}>
      <aside className="cart-panel" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="cart-heading"><div><p className="eyebrow">Your selection</p><h2 id="cart-title">Shopping bag ({cartCount})</h2></div><button type="button" onClick={() => setCartOpen(false)} aria-label="Close bag">Ã—</button></div>
        {cartProducts.length === 0 ? <p className="empty-cart">Your bag is waiting for its first find.</p> : <div className="cart-lines">
          {cartProducts.map(product => <div className="cart-line" key={product.id || product._id}>
            <div><strong>{product.name}</strong><span>{formatMoney(product.price, business)} each</span></div>
            <div className="quantity-control"><button type="button" onClick={() => changeQuantity(product, -1)} aria-label={`Remove one ${product.name}`}>âˆ’</button><span>{product.quantity}</span><button type="button" onClick={() => changeQuantity(product, 1)} aria-label={`Add one ${product.name}`}>+</button></div>
          </div>)}
          <div className="cart-total"><span>Subtotal</span><strong>{formatMoney(subtotal, business)}</strong></div>
          <p className="checkout-note">Delivery details and final charges will be confirmed by the store.</p>
          {!previewOnly && <form className="checkout-form" onSubmit={customer ? placeOrder : authenticateCustomer}>
            {!customer && <div className="auth-switch"><button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Sign in</button><button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Create account</button></div>}
            {customer && <p className="checkout-account">Ordering as {customer?.name || customer?.email || customer?.phone}</p>}
            {authMode === 'register' && !customer && <input required name="name" value={checkout.name} onChange={updateCheckout} placeholder="Your name" autoComplete="name" />}
            {!customer && <input name="email" value={checkout.email} onChange={updateCheckout} placeholder="Email address (or use phone)" autoComplete="email" />}
            {!customer && <input name="password" type="password" required value={checkout.password} onChange={updateCheckout} placeholder="Password" autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} />}
            <input name="phone" required value={checkout.phone || customer?.phone || ''} onChange={updateCheckout} placeholder="Phone number" autoComplete="tel" />
            <input name="address" required value={checkout.address} onChange={updateCheckout} placeholder="Delivery address" autoComplete="street-address" />
            <div className="checkout-location"><input name="pincode" required inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={checkout.pincode} onChange={updateCheckout} placeholder="6-digit PIN code" autoComplete="postal-code" /><input name="state" value={checkout.state} onChange={updateCheckout} placeholder="State" autoComplete="address-level1" /></div>
            {checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}
            <button className="primary-button checkout-button" type="submit" disabled={checkoutLoading}>
              {checkoutLoading ? 'Please waitâ€¦' : customer ? 'Place cash-on-delivery order' : authMode === 'register' ? 'Create account to continue' : 'Sign in to continue'}
              <span aria-hidden="true">â†’</span>
            </button>
          </form>}
          {previewOnly && <p className="checkout-note">Checkout is available after the store is published.</p>}
          {whatsappNumber && <button className="secondary-button" type="button" onClick={whatsappCheckout}>Ask the store on WhatsApp</button>}
        </div>}
        {notice && <p role="status" className="notice">{notice}</p>}
      </aside>
    </div>}
  </div>
}
