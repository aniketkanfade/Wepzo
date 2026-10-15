import { useCallback, useEffect, useMemo, useState } from 'react'
import { ADMIN_PREVIEW, BUILDER_PREVIEW, imageOf, request, storageKey, WEBSITE_ID } from '../lib/storefront'

const deliveryAddressStorageKey = customer => {
  const customerId = customer?._id || customer?.id || customer?.phone || 'guest'
  return storageKey(`wepzo-delivery-address:${customerId}`)
}

const readSavedDeliveryAddress = customer => {
  try {
    const saved = JSON.parse(localStorage.getItem(deliveryAddressStorageKey(customer)) || 'null')
    return saved && typeof saved.address === 'string' && saved.address.trim() ? saved : null
  } catch {
    return null
  }
}

function loadCheckoutScript(src, globalName) {
  if (window[globalName]) return Promise.resolve(true)
  return new Promise(resolve => {
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve(!!window[globalName])
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
}

export default function useStorefront() {
  const currentPageFromPath = () => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/'
    if (/^\/product\/[^/]+/.test(path)) return 'product'
    return ['cart', 'checkout', 'wishlist', 'profile', 'orders', 'support'].includes(path.slice(1)) ? path.slice(1) : 'home'
  }
  const [home, setHome] = useState(null)
  const [currentPage, setCurrentPage] = useState(currentPageFromPath)
  const [builderComponents, setBuilderComponents] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [childCategory, setChildCategory] = useState('')
  const [selectedModule, setSelectedModule] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('')
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem(storageKey('wepzo-cart')) || '[]'))
  const [favorites, setFavorites] = useState(() => {
    try {
      const storedFavorites = JSON.parse(localStorage.getItem(storageKey('wepzo-favorites')) || '[]')
      return Array.isArray(storedFavorites)
        ? [...new Set(storedFavorites.filter(id => id != null && String(id).trim()).map(String))]
        : []
    } catch {
      return []
    }
  })
  const [favoriteCatalog, setFavoriteCatalog] = useState([])
  const [favoriteCatalogLoading, setFavoriteCatalogLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [locationOpen, setLocationOpen] = useState(false)
  const [addressOpen, setAddressOpen] = useState(false)
  const [location, setLocation] = useState(() => JSON.parse(localStorage.getItem(storageKey('wepzo-location')) || '{"pincode":""}'))
  const [serviceArea, setServiceArea] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [customer, setCustomer] = useState(() => JSON.parse(localStorage.getItem(storageKey('wepzo-shop-customer')) || 'null'))
  const [message, setMessage] = useState('')
  const [checkout, setCheckout] = useState(() => currentPageFromPath() === 'checkout')
  const [address, setAddress] = useState(() => readSavedDeliveryAddress(customer)?.address || '')
  const [addressDetails, setAddressDetails] = useState(() => readSavedDeliveryAddress(customer))
  const [phone, setPhone] = useState(() => readSavedDeliveryAddress(customer)?.phone || '')
  const [checkoutAfterLogin, setCheckoutAfterLogin] = useState(false)
  const [busy, setBusy] = useState(false)
  const [paymentWindowOpen, setPaymentWindowOpen] = useState(false)
  const [quote, setQuote] = useState(null)
  const [couponCode, setCouponCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('COD')
  const [pendingPaymentOrder, setPendingPaymentOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey('wepzo-pending-payment-order')) || 'null') } catch { return null }
  })
  const [cookieAccepted, setCookieAccepted] = useState(() => localStorage.getItem(storageKey('wepzo-cookie-consent')) === 'accepted')

  const business = home?.business || {}

  const checkServiceArea = useCallback(async (pincode, state = '') => {
    const pin = String(pincode || '').trim()
    if (!/^\d{6}$/.test(pin)) {
      const result = { serviceable: false, pincode: pin, zone: null, message: 'Enter a valid 6-digit PIN code.' }
      setServiceArea(result)
      return result
    }
    const result = await request(`/shop/service-area?${new URLSearchParams({ pincode: pin, ...(state ? { state } : {}) })}`)
    setServiceArea(result)
    return result
  }, [])

  const productRouteId = () => {
    const match = window.location.pathname.match(/^\/product\/([^/]+)/)
    return match ? decodeURIComponent(match[1]) : ''
  }

  const openProduct = product => {
    const id = product?._id || product?.id
    if (!id) return
    window.history.pushState({ ...(window.history.state || {}), wepzoProductDetail: true }, '', `/product/${encodeURIComponent(id)}${window.location.search}`)
    setSelected(product)
    setCurrentPage('product')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const navigatePage = page => {
    const path = page === 'home' ? '/' : `/${page}`
    window.history.pushState({ wepzoPage: page }, '', `${path}${window.location.search}`)
    setCurrentPage(page)
    if (page !== 'product') setSelected(null)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const closeProduct = () => {
    if (window.history.state?.wepzoProductDetail) window.history.back()
    else {
      window.history.replaceState({}, '', `/${window.location.search}`)
      setSelected(null)
      setCurrentPage('home')
    }
  }

  const goHome = () => {
    navigatePage('home')
    setSelected(null)
    setSelectedModule('')
    setCategory('')
    setSubCategory('')
    setChildCategory('')
  }

  const goToModule = slug => {
    if (!slug) return
    navigatePage('home')
    setSelected(null)
    setSelectedModule(slug)
    setCategory('')
    setSubCategory('')
    setChildCategory('')
  }

  useEffect(() => {
    const syncProductRoute = () => {
      const id = productRouteId()
      setCurrentPage(currentPageFromPath())
      setSelected(id ? products.find(product => String(product._id || product.id) === id) || null : null)
    }
    syncProductRoute()
    window.addEventListener('popstate', syncProductRoute)
    return () => window.removeEventListener('popstate', syncProductRoute)
  }, [products])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const orderId = params.get('wepzoOrderId')
    if (!orderId) return
    params.delete('wepzoOrderId')
    params.delete('paymentGateway')
    const query = params.toString()
    window.history.replaceState(window.history.state || {}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
    setBusy(true)
    request('/shop/payments/verify', { method: 'POST', body: JSON.stringify({ orderId }) })
      .then(result => {
        if (!result.verified) throw new Error('Payment could not be verified.')
        setCart([])
        setPendingPaymentOrder(null)
        localStorage.removeItem(storageKey('wepzo-pending-payment-order'))
        setCheckout(false)
        navigatePage('orders')
        setMessage(`Payment received. Order ${result.order?.orderNo || ''} is confirmed.`)
      })
      .catch(paymentError => setMessage(paymentError.message))
      .finally(() => setBusy(false))
  }, [])
  const selectedComponentData = useMemo(() => builderComponents.map(entry => (
    entry.componentId && typeof entry.componentId === 'object' ? entry.componentId : entry
  )), [builderComponents])

  useEffect(() => {
    if (!BUILDER_PREVIEW) return undefined
    const receivePreview = event => {
      if (event.source !== window.parent || event.data?.type !== 'wepzo:builder-preview') return
      setBuilderComponents(Array.isArray(event.data.components) ? event.data.components : [])
    }
    window.addEventListener('message', receivePreview)
    return () => window.removeEventListener('message', receivePreview)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [shop, catalog, publishedWebsite] = await Promise.all([
        request('/shop/home'),
        request(`/shop/products?${new URLSearchParams({ ...(selectedModule ? { module: selectedModule } : {}), ...(sort ? { sort } : {}) })}`),
        WEBSITE_ID ? request(`/public/published-websites/${WEBSITE_ID}`).catch(() => null) : Promise.resolve(null),
      ])
      setHome(shop)
      if (shop.business?.codEnabled === false && shop.business?.onlinePaymentEnabled) setPaymentMethod('ONLINE')
      setProducts(catalog)
      if (Array.isArray(shop.websiteComponents)) setBuilderComponents(shop.websiteComponents)
      if (publishedWebsite?.components) setBuilderComponents(publishedWebsite.components)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [sort, selectedModule])

  useEffect(() => { load() }, [load])
  useEffect(() => { localStorage.setItem(storageKey('wepzo-cart'), JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem(storageKey('wepzo-favorites'), JSON.stringify(favorites)) }, [favorites])
  useEffect(() => {
    if (!favorites.length) {
      setFavoriteCatalog([])
      setFavoriteCatalogLoading(false)
      return undefined
    }

    let cancelled = false
    setFavoriteCatalogLoading(true)
    request('/shop/products')
      .then(catalog => { if (!cancelled) setFavoriteCatalog(Array.isArray(catalog) ? catalog : []) })
      .catch(() => { if (!cancelled) setFavoriteCatalog([]) })
      .finally(() => { if (!cancelled) setFavoriteCatalogLoading(false) })

    return () => { cancelled = true }
  }, [favorites.length > 0])
  useEffect(() => {
    if (location.pincode || !home?.pincode) return
    const next = { ...location, city: home.city || '', pincode: home.pincode }
    setLocation(next)
    localStorage.setItem(storageKey('wepzo-location'), JSON.stringify(next))
  }, [home?.city, home?.pincode, location])
  useEffect(() => {
    if (!location.pincode) {
      setServiceArea(null)
      return undefined
    }
    let cancelled = false
    setServiceArea({ serviceable: null, pincode: location.pincode, zone: null, message: 'Checking service area…' })
    checkServiceArea(location.pincode)
      .then(result => { if (!cancelled) setServiceArea(result) })
      .catch(error => {
        if (!cancelled) setServiceArea({ serviceable: null, pincode: location.pincode, zone: null, message: error.message })
      })
    return () => { cancelled = true }
  }, [checkServiceArea, location.pincode])
  useEffect(() => {
    document.title = business.businessName || 'Wepzo Store'
    let icon = document.querySelector('link[rel~="icon"]')
    if (!icon) {
      icon = document.createElement('link')
      icon.rel = 'icon'
      document.head.appendChild(icon)
    }
    icon.href = business.favicon
      ? imageOf({ image: business.favicon })
      : String(business.businessName || 'WEPZO').trim().toLowerCase() === 'wepzo' ? '/wepzo-favicon.svg' : '/favicon.ico'
  }, [business.businessName, business.favicon])
  useEffect(() => {
    const savedAddress = readSavedDeliveryAddress(customer)
    setAddress(savedAddress?.address || '')
    setAddressDetails(savedAddress)
    setPhone(savedAddress?.phone || customer?.phone || '')
  }, [customer?._id, customer?.id, customer?.phone])

  const modules = useMemo(() => (home?.modules || []).filter(item => item.status !== false && item.slug), [home])
  const categories = useMemo(() => {
    if (!selectedModule) return []
    const module = modules.find(item => item.slug === selectedModule)
    if (!module) return []
    return [...new Set((home?.categories || [])
      .filter(item => String(item.moduleId || item.module?._id || item.module || '') === String(module._id)
        || String(item.moduleSlug || '').toLowerCase() === String(module.slug).toLowerCase())
      .map(item => item.name)
      .filter(Boolean))]
  }, [home, modules, selectedModule])
  const subCategories = useMemo(() => [...new Set((home?.subCategories || [])
    .filter(item => category && String(item.mainCategory || '').toLowerCase() === category.toLowerCase())
    .map(item => item.name).filter(Boolean))], [home, category])
  const childCategories = useMemo(() => [...new Set((home?.childCategories || [])
    .filter(item => category && subCategory
      && String(item.mainCategory || '').toLowerCase() === category.toLowerCase()
      && String(item.subCategory || '').toLowerCase() === subCategory.toLowerCase())
    .map(item => item.name).filter(Boolean))], [home, category, subCategory])
  const shown = useMemo(() => products.filter(item => {
    const productCategory = item.mainCategory || item.category
    const matchesCategory = (!category || productCategory === category)
      && (!subCategory || item.subCategory === subCategory)
      && (!childCategory || item.childCategory === childCategory)
    const term = query.trim().toLowerCase()
    return matchesCategory && (!term || `${item.name} ${item.brand} ${productCategory || ''}`.toLowerCase().includes(term))
  }), [products, category, subCategory, childCategory, query])
  const deals = useMemo(() => [...products.filter(item => Number(item.discount) > 0), ...products]
    .filter((item, index, list) => list.findIndex(entry => (entry._id || entry.id) === (item._id || item.id)) === index)
    .slice(0, 6), [products])
  const bestsellers = useMemo(() => [...products].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 6), [products])
  const heroBanner = home?.banners?.[0]
  const categoryProduct = name => products.find(item => [item.mainCategory || item.category, item.subCategory, item.childCategory]
    .some(value => String(value || '').toLowerCase() === String(name).toLowerCase()))
  const count = cart.reduce((sum, item) => sum + item.qty, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const cartItem = id => {
    const items = cart.filter(item => String(item.id) === String(id))
    if (!items.length) return null
    return { ...items[0], qty: items.reduce((sum, item) => sum + item.qty, 0), entries: items }
  }

  const discardPendingPaymentOrder = () => {
    setPendingPaymentOrder(null)
    localStorage.removeItem(storageKey('wepzo-pending-payment-order'))
  }

  const changeQty = (product, amount) => {
    discardPendingPaymentOrder()
    setQuote(null)
    setCart(current => {
      const productId = product._id || product.id
      const variantId = product.variantId || ''
      const matches = item => String(item.id) === String(productId) && String(item.variantId || '') === String(variantId)
      const found = current.find(matches)
      if (!found && amount > 0) return [...current, {
        id: productId,
        name: product.name,
        image: imageOf(product),
        price: Number(product.salePrice ?? product.price ?? 0),
        qty: amount,
        variantId: variantId || null,
        variantLabel: product.variantLabel || '',
        mrp: Number(product.mrp ?? product.originalPrice ?? product.regularPrice ?? product.price) || 0,
        discount: Number(product.discount) || 0,
        unit: product.unit || '',
        brand: product.brand || '',
      }]
      return current.map(item => matches(item) ? { ...item, qty: item.qty + amount } : item).filter(item => item.qty > 0)
    })
  }

  const clearCart = () => {
    discardPendingPaymentOrder()
    setCart([])
    setQuote(null)
    setCheckout(false)
  }

  const toggleFavorite = product => {
    const productId = product?._id ?? product?.id
    if (productId == null || !String(productId).trim()) return
    const id = String(productId)
    setFavorites(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  const calculateQuote = async (pincode = location.pincode, deliveryState = addressDetails?.state || '', code = couponCode) => {
    try {
      const result = await request('/shop/quote', {
        method: 'POST',
        body: JSON.stringify({ items: cart.map(item => ({ id: item.id, variantId: item.variantId || undefined, qty: item.qty })), lat: location.lat, lng: location.lng, pincode, deliveryState, couponCode: code }),
      })
      setQuote(result)
      setMessage(result.couponError || result.message || '')
      return result
    } catch (quoteError) {
      setMessage(quoteError.message)
      return null
    }
  }

  useEffect(() => {
    if (checkout && !quote && cart.length) calculateQuote()
  }, [checkout, cart])

  const applyCoupon = async code => {
    const normalized = String(code || '').trim().toUpperCase()
    if (!normalized) {
      setMessage('Enter a coupon code.')
      return
    }
    discardPendingPaymentOrder()
    const result = await calculateQuote(location.pincode, addressDetails?.state || '', normalized)
    if (result) setCouponCode(result.couponError ? '' : normalized)
  }

  const removeCoupon = async () => {
    discardPendingPaymentOrder()
    const result = await calculateQuote(location.pincode, addressDetails?.state || '', '')
    if (result) setCouponCode('')
  }

  const submitAuth = async event => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const form = new FormData(event.currentTarget)
    try {
      const result = await request(`/shop/auth/${authMode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify({ name: form.get('name'), email: form.get('email'), phone: form.get('phone'), password: form.get('password') }),
      })
      localStorage.setItem(storageKey('wepzo-shop-token'), result.token)
      localStorage.setItem(storageKey('wepzo-shop-customer'), JSON.stringify(result.user))
      setCustomer(result.user)
      setAuthOpen(false)
      setMessage(`Welcome ${result.user.name}`)
      if (checkoutAfterLogin) {
        setCheckoutAfterLogin(false)
        setCheckout(true)
        const savedAddress = readSavedDeliveryAddress(result.user)
        if (savedAddress) {
          setAddress(savedAddress.address)
          setAddressDetails(savedAddress)
          setPhone(savedAddress.phone || result.user.phone || '')
        } else {
          setAddress('')
          setAddressDetails(null)
          setPhone(result.user.phone || '')
          setAddressOpen(true)
        }
      }
    } catch (authError) {
      setMessage(authError.message)
    } finally {
      setBusy(false)
    }
  }

  const signOut = () => {
    localStorage.removeItem(storageKey('wepzo-shop-token'))
    localStorage.removeItem(storageKey('wepzo-shop-customer'))
    localStorage.removeItem(storageKey('wepzo-pending-payment-order'))
    setPendingPaymentOrder(null)
    setCustomer(null)
    setMessage('You have been signed out.')
  }

  const choosePaymentMethod = method => {
    if (method !== paymentMethod) discardPendingPaymentOrder()
    setPaymentMethod(method)
  }

  const startCheckout = () => {
    setCheckout(true)
    navigatePage('checkout')
    if (!customer) {
      setCheckoutAfterLogin(true)
      setAuthMode('login')
      setAuthOpen(true)
      return
    }
    const savedAddress = readSavedDeliveryAddress(customer)
    if (savedAddress) {
      setAddress(savedAddress.address)
      setAddressDetails(savedAddress)
      setPhone(savedAddress.phone || customer.phone || '')
    } else {
      setAddress('')
      setAddressDetails(null)
      setPhone(customer.phone || '')
      setAddressOpen(true)
    }
  }

  const closeAuth = () => {
    setAuthOpen(false)
    if (checkoutAfterLogin) {
      setCheckoutAfterLogin(false)
      setCheckout(false)
    }
  }

  const saveDeliveryAddress = details => {
    discardPendingPaymentOrder()
    setAddress(details.address)
    setAddressDetails(details)
    setPhone(details.phone)
    localStorage.setItem(deliveryAddressStorageKey(customer), JSON.stringify(details))
    const nextLocation = {
      ...location,
      pincode: details.pincode,
      serviceable: details.serviceArea.serviceable,
      serviceZone: details.serviceArea.zone?.name || '',
    }
    setLocation(nextLocation)
    localStorage.setItem(storageKey('wepzo-location'), JSON.stringify(nextLocation))
    setAddressOpen(false)
    calculateQuote(details.pincode, details.state)
  }

  const saveDetectedLocation = async (lat, lng) => {
    const details = await request(`/shop/location-details?${new URLSearchParams({ lat: String(lat), lng: String(lng) })}`)
    if (!details.found) return details
    discardPendingPaymentOrder()
    const serviceAreaResult = await checkServiceArea(details.pincode, details.state)
    const nextLocation = {
      ...location,
      lat,
      lng,
      pincode: details.pincode,
      serviceable: serviceAreaResult.serviceable,
      serviceZone: serviceAreaResult.zone?.name || '',
    }
    setLocation(nextLocation)
    localStorage.setItem(storageKey('wepzo-location'), JSON.stringify(nextLocation))
    return { ...details, serviceArea: serviceAreaResult }
  }

  const placeOrder = async () => {
    if (!customer) {
      setCheckoutAfterLogin(true)
      setAuthOpen(true)
      return
    }
    if (!address.trim() || !phone.trim()) {
      setAddressOpen(true)
      return
    }
    setBusy(true)
    setMessage('')
    try {
      let order = pendingPaymentOrder
      if (!order || paymentMethod !== 'ONLINE') {
        order = await request('/shop/orders', {
          method: 'POST',
          body: JSON.stringify({ items: cart.map(item => ({ id: item.id, variantId: item.variantId || undefined, qty: item.qty })), address, phone, lat: location.lat || null, lng: location.lng || null, pincode: location.pincode, deliveryState: addressDetails?.state || '', couponCode, payment: paymentMethod }),
        })
      }
      if (paymentMethod === 'ONLINE') {
        const retryOrder = { _id: order._id, orderNo: order.orderNo, payment: 'ONLINE' }
        setPendingPaymentOrder(retryOrder)
        localStorage.setItem(storageKey('wepzo-pending-payment-order'), JSON.stringify(retryOrder))
        const payment = await request('/shop/payments/initiate', {
          method: 'POST',
          body: JSON.stringify({ orderId: order._id }),
        })
        if (payment.provider === 'razorpay') {
          if (!await loadCheckoutScript('https://checkout.razorpay.com/v1/checkout.js', 'Razorpay')) throw new Error('Razorpay checkout could not be loaded. Please retry.')
          const checkoutWindow = new window.Razorpay({
            key: payment.keyId,
            amount: payment.amount,
            currency: payment.currency,
            order_id: payment.orderId,
            name: business.businessName || 'WEPZO',
            description: `Order ${order.orderNo}`,
            handler: async response => {
              try {
                const verified = await request('/shop/payments/verify', { method: 'POST', body: JSON.stringify({ orderId: order._id, ...response }) })
                if (!verified.verified) throw new Error('Payment could not be verified.')
                setCart([])
                setPendingPaymentOrder(null)
                setPaymentWindowOpen(false)
                localStorage.removeItem(storageKey('wepzo-pending-payment-order'))
                setCheckout(false)
                navigatePage('orders')
                setMessage(`Payment received. Order ${order.orderNo} is confirmed.`)
              } catch (paymentError) {
                setPaymentWindowOpen(false)
                setMessage(paymentError.message)
              }
            },
            modal: { ondismiss: () => {
              setPaymentWindowOpen(false)
              setMessage('Payment was not completed. Your order is saved; retry payment to continue.')
            } },
          })
          setPaymentWindowOpen(true)
          checkoutWindow.open()
          setMessage('Complete payment in the secure Razorpay window.')
        } else if (payment.provider === 'phonepe' && payment.redirectUrl) {
          window.location.assign(payment.redirectUrl)
        } else if (payment.provider === 'cashfree' && payment.paymentSessionId) {
          if (!await loadCheckoutScript('https://sdk.cashfree.com/js/v3/cashfree.js', 'Cashfree')) throw new Error('Cashfree checkout could not be loaded. Please retry.')
          const cashfree = window.Cashfree({ mode: payment.environment })
          const result = await cashfree.checkout({ paymentSessionId: payment.paymentSessionId, redirectTarget: '_self' })
          if (result?.error) throw new Error(result.error.message || 'Cashfree checkout failed to open.')
        } else {
          throw new Error('The selected payment gateway returned an invalid checkout session.')
        }
      } else {
        setCart([])
        setCheckout(false)
        navigatePage('orders')
        setMessage(`Order ${order.orderNo || order.orderId} placed successfully.`)
      }
    } catch (orderError) {
      setMessage(orderError.message)
    } finally {
      setBusy(false)
    }
  }

  return {
    home, products, loading, error, load, business, builderComponents, selectedComponentData,
    category, setCategory, subCategory, setSubCategory, childCategory, setChildCategory,
    subCategories, childCategories, selectedModule, setSelectedModule, query, setQuery, sort, setSort,
    cart, setCart, clearCart, favorites, favoriteCatalog, favoriteCatalogLoading, setFavorites, selected, setSelected, openProduct, closeProduct, goHome, goToModule,
    currentPage, navigatePage,
    locationOpen, setLocationOpen, location, setLocation, serviceArea, checkServiceArea, authOpen, setAuthOpen, authMode, setAuthMode,
    customer, message, setMessage, checkout, setCheckout, address, setAddress, addressDetails, phone, setPhone,
    addressOpen, setAddressOpen, startCheckout, closeAuth, saveDeliveryAddress, saveDetectedLocation,
    busy: busy || paymentWindowOpen, quote, setQuote, couponCode, setCouponCode, applyCoupon, removeCoupon, paymentMethod, setPaymentMethod: choosePaymentMethod,
    cookieAccepted, setCookieAccepted, categories, modules, shown, deals,
    bestsellers, heroBanner, categoryProduct, count, subtotal, cartItem, changeQty, toggleFavorite,
    calculateQuote, submitAuth, placeOrder, signOut,
  }
}
