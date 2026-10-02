import { useEffect, useMemo, useState } from 'react'
import './App.css'
import './tailwind.css'
import Icon from './components/Icon.jsx'
import Header from './components/Header.jsx'
import BrandLogo from './components/BrandLogo.jsx'
import ProductCard from './components/ProductCard.jsx'
import Checkout from './components/Checkout.jsx'
import LoginPage from './components/LoginPage.jsx'
import AdminSettings from './components/AdminSettings.jsx'
import StoreSignup from './components/StoreSignup.jsx'
import MainAdminLogin from './components/MainAdminLogin.jsx'
import PlatformStores from './components/PlatformStores.jsx'
import OrderManagement from './components/OrderManagement.jsx'
import CustomerProfile from './components/CustomerProfile.jsx'
import CodPaymentPrompt from './components/CodPaymentPrompt.jsx'
import { deleteLocalStore, findLocalStoreBySlug, listLocalStores, restoreLocalStore, updateLocalStore } from './platformLocal.js'
import { products as initialProducts, categories as initialCategories } from './data/store.js'
import { getProductQuantityLimit, getTrackedStock } from './utils/productLimits.js'
const defaultSubscriptionPlans = [{ id: '1m', label: '1 month', unit: 'month', duration: 1, months: 1, price: 500, enabled: true }, { id: '3m', label: '3 months', unit: 'month', duration: 3, months: 3, price: 1350, enabled: true }, { id: '6m', label: '6 months', unit: 'month', duration: 6, months: 6, price: 2500, enabled: true }, { id: '12m', label: '1 year', unit: 'year', duration: 1, months: 12, price: 4800, enabled: true }]
const normalizePlans = (plans) => plans.map((plan) => {
  const unit = plan.unit || (String(plan.label).toLowerCase().includes('year') ? 'year' : 'month')
  const duration = Number(plan.duration) || (unit === 'year' ? Math.max(1, Math.round(Number(plan.months || 12) / 12)) : Number(plan.months || 1))
  const months = unit === 'year' ? duration * 12 : duration
  return { ...plan, unit, duration, months, label: `${duration} ${unit}${duration === 1 ? '' : 's'}` }
})
function App() {
  const routePath = window.location.pathname.replace(/\/+$/, '') || '/'
  const isAdminRoute = ['/admin', '/store-admin', '/platform-admin', '/signup'].includes(routePath)
  const routeStore = !isAdminRoute && routePath !== '/' ? findLocalStoreBySlug(routePath.slice(1)) : null
  const customerSessionKey = `morrow-customer-${routeStore?.storeId || 'main'}-user`
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(isAdminRoute ? 'morrow-user' : customerSessionKey)) } catch { return null }
  })
  const [activeStoreId, setActiveStoreId] = useState(() => {
    try { return routeStore?.storeId || (isAdminRoute ? JSON.parse(localStorage.getItem('morrow-user'))?.storeId : '') || '' } catch { return routeStore?.storeId || '' }
  })
  const [productCategories, setProductCategories] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(activeStoreId ? `morrow-store-${activeStoreId}-categories` : 'morrow-categories'))
      return Array.isArray(saved) ? saved : activeStoreId ? [] : initialCategories.slice(1)
    } catch { return activeStoreId ? [] : initialCategories.slice(1) }
  })
  const [subscriptionAmount, setSubscriptionAmount] = useState(() => {
    const saved = Number(localStorage.getItem('morrow-platform-subscription-price'))
    return Number.isFinite(saved) && saved > 0 ? saved : 500
  })
  const [storagePricePerGb, setStoragePricePerGb] = useState(() => {
    const saved = Number(localStorage.getItem('morrow-platform-storage-price-per-gb'))
    return Number.isFinite(saved) && saved >= 0 ? saved : 100
  })
  const storeKey = (name, storeId = activeStoreId) => storeId ? `morrow-store-${storeId}-${name}` : `morrow-${name}`
  const customerAddressKey = (email = currentUser?.email) => `${storeKey('delivery-address')}-${encodeURIComponent(String(email || 'guest').trim().toLowerCase())}`
  const defaultAppearance = { announcement: 'A little something for your everyday · Free shipping over ₹7,200', footerTagline: 'Good things for the everyday.', copyright: '© 2025 MORROW STUDIO', background: '#fbfaf7', accent: '#354232', showAnnouncement: true, showFooterTagline: true, showCopyright: true, useCustomBackground: true, useCustomAccent: true, showAdminLink: true }
  const [appearance, setAppearance] = useState(() => {
    try { return { ...defaultAppearance, ...(JSON.parse(localStorage.getItem(storeKey('appearance'))) || {}) } } catch { return defaultAppearance }
  })
  const defaultBanner = { eyebrow: 'THE SLOWER SIDE OF EVERYDAY', title: 'Good things,', highlight: 'well chosen.', description: 'Considered pieces for the way you live, made to stay with you a little longer.', image: '', caption: 'THE EVERYDAY EDIT' }
  const [banner, setBanner] = useState(() => {
    try { return { ...defaultBanner, ...(JSON.parse(localStorage.getItem(storeKey('banner'))) || {}) } } catch { return defaultBanner }
  })
  const [subscriptionPlans, setSubscriptionPlans] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem('morrow-subscription-plans')); return Array.isArray(saved) ? normalizePlans(saved) : defaultSubscriptionPlans } catch { return defaultSubscriptionPlans }
  })
  const [storeSubscription, setStoreSubscription] = useState(() => {
    try { return activeStoreId ? JSON.parse(localStorage.getItem(`morrow-store-${activeStoreId}-subscription`)) || { status: 'free', expiresAt: null } : { status: 'free', expiresAt: null } } catch { return { status: 'free', expiresAt: null } }
  })
  const [directoryVersion, setDirectoryVersion] = useState(0)
  useEffect(() => {
    const updateFromOtherTab = () => setDirectoryVersion((version) => version + 1)
    window.addEventListener('storage', updateFromOtherTab)
    return () => window.removeEventListener('storage', updateFromOtherTab)
  }, [])
  const [platformAnnouncement, setPlatformAnnouncement] = useState(() => {
    try { return JSON.parse(localStorage.getItem('morrow-platform-announcement')) || { configured: false, enabled: true, scope: 'all', storeIds: [], text: '' } } catch { return { configured: false, enabled: true, scope: 'all', storeIds: [], text: '' } }
  })
  const platformStores = useMemo(() => listLocalStores().map((store) => {
    const prefix = `morrow-store-${store.storeId}-`
    const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(`${prefix}${key}`)) ?? fallback } catch { return fallback } }
    const delivery = read('delivery-settings', {})
    const payment = read('payment-settings', {})
    let usedBytes = 0
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key?.startsWith(prefix)) usedBytes += (key.length + (localStorage.getItem(key)?.length || 0)) * 2
    }
    return {
      ...store,
      products: read('products', []), categories: read('categories', []),
      orders: read('orders', []),
      appearance: read('appearance', {}),
      storage: { limitGb: 1, purchasedGb: 0, ...read('storage', {}) },
      storageUsedBytes: usedBytes,
      selectedPlan: store.selectedPlan,
      subscription: read('subscription', { status: 'free', expiresAt: null, planId: '' }),
      paymentGateway: payment.keyId ? 'Razorpay configured' : 'Not configured',
      deliveryPartners: Object.entries(delivery).filter(([, config]) => config?.enabled).map(([key]) => ({ shadowfax: 'Shadowfax', porter: 'Porter', ownRider: 'Own rider' }[key] || key)),
      paymentMethods: Object.entries(payment.methods || {}).filter(([, enabled]) => enabled).map(([key]) => ({ cod: 'COD', advance: 'Advance', online: 'Online' }[key] || key)),
    }
  }), [directoryVersion])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All pieces')
  const [cart, setCart] = useState({})
  const [catalog, setCatalog] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey('products')))
      return Array.isArray(saved) ? saved : initialProducts
    } catch { return initialProducts }
  })
  const [notice, setNotice] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(() => isAdminRoute)
  const [mainAdminAuthenticated, setMainAdminAuthenticated] = useState(false)
  const [storeAdminAuthenticated, setStoreAdminAuthenticated] = useState(false)
  const [mainAdminChecking, setMainAdminChecking] = useState(() => isAdminRoute)
  const [advanceAmount, setAdvanceAmount] = useState(() => {
    const saved = Number(localStorage.getItem(storeKey('advance-percent')))
    return Number.isFinite(saved) && saved >= 0 && saved <= 100 ? saved : 20
  })
  const [paymentSettings, setPaymentSettings] = useState(() => {
    const defaults = { keyId: '', createOrderUrl: '/api/payments/razorpay/order', verifyPaymentUrl: '/api/payments/razorpay/verify', methods: { cod: true, advance: true, online: true } }
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey('payment-settings'))) || {}
      return { ...defaults, ...saved, methods: { ...defaults.methods, ...(saved.methods || {}) } }
    } catch { return defaults }
  })
  const [deliverySettings, setDeliverySettings] = useState(() => {
    const defaults = {
      shadowfax: { enabled: false, quoteUrl: '', bookingUrl: '', trackingUrl: '', paymentMethods: { cod: true, advance: true, online: true } },
      porter: { enabled: false, quoteUrl: '', bookingUrl: '', trackingUrl: '', paymentMethods: { cod: true, advance: true, online: true } },
      ownRider: { enabled: false, paymentMethods: { cod: true, advance: true, online: true } },
    }
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey('delivery-settings'))) || {}
      return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, { ...value, ...(saved[key] || {}), paymentMethods: { ...value.paymentMethods, ...(saved[key]?.paymentMethods || {}) } }]))
    } catch { return defaults }
  })
  const [savedAddress, setSavedAddress] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`${storeKey('delivery-address')}-${encodeURIComponent(String(currentUser?.email || 'guest').trim().toLowerCase())}`)) } catch { return null }
  })
  useEffect(() => {
    if (!adminOpen) return undefined
    if (currentUser?.storeId) {
      const owner = restoreLocalStore(currentUser)
      if (owner) {
        if (JSON.stringify(owner) !== JSON.stringify(currentUser)) setCurrentUser(owner)
        setActiveStoreId(owner.storeId)
        setStoreAdminAuthenticated(true)
      } else {
        localStorage.removeItem('morrow-user')
        setCurrentUser(null)
        setActiveStoreId('')
      }
      setMainAdminChecking(false)
      return undefined
    }
    let active = true
    fetch('/api/main-admin/session', { credentials: 'same-origin' })
      .then((response) => response.json())
      .then((result) => { if (active) setMainAdminAuthenticated(result.authenticated === true) })
      .catch(() => { if (active) setMainAdminAuthenticated(false) })
      .finally(() => { if (active) setMainAdminChecking(false) })
    return () => { active = false }
  }, [adminOpen, currentUser])
  const filtered = useMemo(() => catalog.filter((p) => (category === 'All pieces' || p.category === category) && `${p.name} ${p.category} ${p.color}`.toLowerCase().includes(query.toLowerCase())), [catalog, category, query])
  const categoryOptions = productCategories
  const saveCategories = (nextCategories) => {
    setProductCategories(nextCategories)
    localStorage.setItem(storeKey('categories'), JSON.stringify(nextCategories))
    if (category !== 'All pieces' && !nextCategories.includes(category)) setCategory('All pieces')
  }
  const saveProducts = (nextProducts) => {
    setCatalog(nextProducts)
    localStorage.setItem(storeKey('products'), JSON.stringify(nextProducts))
    const productIds = new Set(nextProducts.map((product) => product.id))
    setCart((items) => Object.fromEntries(Object.entries(items).filter(([id]) => productIds.has(Number(id)))))
  }
  const closeAdmin = () => {
    if (['/admin', '/store-admin', '/signup', '/platform-admin'].includes(window.location.pathname.replace(/\/+$/, ''))) window.history.pushState({}, '', currentUser?.storeId ? `/${currentUser.subdomain}` : '/')
    setAdminOpen(false)
  }
  const logoutAdmin = async () => {
    try { await fetch('/api/main-admin/logout', { method: 'POST', credentials: 'same-origin' }) } catch { /* sign out locally even if the server is unavailable */ }
    localStorage.removeItem('morrow-user')
    setCurrentUser(null)
    setActiveStoreId('')
    setStoreAdminAuthenticated(false)
    setMainAdminAuthenticated(false)
    setMainAdminChecking(false)
  }
  const rechargeStore = async (plan) => {
    const response = await fetch('/api/platform/subscription/renewal', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storeId: currentUser?.storeId, planId: plan.id }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.verified !== true || !result.expiresAt) throw new Error(result.error || 'Recharge payment is not configured. Connect the platform subscription payment backend first.')
    const updated = { status: 'active', planId: plan.id, expiresAt: result.expiresAt }
    setStoreSubscription(updated)
    localStorage.setItem(storeKey('subscription'), JSON.stringify(updated))
    return `Plan active until ${new Date(result.expiresAt).toLocaleDateString('en-IN')}.`
  }
  const saveStorageSettings = (storeId, storage, pricePerGb) => {
    localStorage.setItem(`morrow-store-${storeId}-storage`, JSON.stringify(storage))
    localStorage.setItem('morrow-platform-storage-price-per-gb', String(pricePerGb))
    setStoragePricePerGb(pricePerGb)
    refreshPlatformStores()
  }
  const buyStoreStorage = async (additionalGb) => {
    const response = await fetch('/api/platform/storage/purchase', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storeId: currentUser?.storeId, additionalGb }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.verified !== true || !Number.isFinite(Number(result.limitGb))) throw new Error(result.error || 'Storage purchase is not configured. Connect the platform storage payment backend first.')
    const next = { ...JSON.parse(localStorage.getItem(storeKey('storage')) || '{}'), limitGb: Number(result.limitGb), purchasedGb: Number(result.purchasedGb ?? (Number(result.limitGb) - 1)) }
    localStorage.setItem(storeKey('storage'), JSON.stringify(next))
    refreshPlatformStores()
    return `Payment verified. Your store now has ${next.limitGb} GB storage.`
  }
  const refreshPlatformStores = () => setDirectoryVersion((version) => version + 1)
  const savePlatformAnnouncement = (settings) => {
    const next = { ...settings, configured: true }
    setPlatformAnnouncement(next)
    localStorage.setItem('morrow-platform-announcement', JSON.stringify(next))
  }
  const savePlatformStore = (storeId, changes) => {
    updateLocalStore(storeId, changes)
    if (changes.subscription) localStorage.setItem(`morrow-store-${storeId}-subscription`, JSON.stringify(changes.subscription))
    refreshPlatformStores()
  }
  const removePlatformStore = (storeId) => { deleteLocalStore(storeId); refreshPlatformStores() }
  const savePlatformStoreProducts = (storeId, items) => { localStorage.setItem(`morrow-store-${storeId}-products`, JSON.stringify(items)); refreshPlatformStores() }
  const savePlatformStoreCategories = (storeId, items) => { localStorage.setItem(`morrow-store-${storeId}-categories`, JSON.stringify(items)); refreshPlatformStores() }
  const savePlatformStoreAppearance = (storeId, settings) => { localStorage.setItem(`morrow-store-${storeId}-appearance`, JSON.stringify(settings)); refreshPlatformStores() }
  const recordOrder = (order) => {
    const orderStoreId = routeStore?.storeId || ''
    const key = orderStoreId ? `morrow-store-${orderStoreId}-orders` : 'morrow-orders'
    let saved = []
    try { saved = JSON.parse(localStorage.getItem(key)) || [] } catch { saved = [] }
    const createdAt = new Date().toISOString()
    saved.unshift({ ...order, id: `order-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, storeId: orderStoreId || 'main', storeName: routeStore?.storeName || 'Main store', status: 'new', statusHistory: [{ status: 'new', at: createdAt }], createdAt })
    localStorage.setItem(key, JSON.stringify(saved))
    const purchasedQuantities = new Map((order.items || []).map((item) => [item.id, Number(item.quantity) || 0]))
    const updatedCatalog = catalog.map((product) => {
      const stock = getTrackedStock(product)
      const purchased = purchasedQuantities.get(product.id) || 0
      return stock === null || purchased === 0 ? product : { ...product, stock: Math.max(0, stock - purchased) }
    })
    if (updatedCatalog.some((product, index) => product !== catalog[index])) saveProducts(updatedCatalog)
    refreshPlatformStores()
  }
  const openStoreAdmin = (owner) => {
    refreshPlatformStores()
    const id = owner.storeId
    const prefix = `morrow-store-${id}`
    const read = (name, fallback) => {
      const key = `${prefix}-${name}`
      try {
        const saved = localStorage.getItem(key)
        if (saved !== null) return JSON.parse(saved) ?? fallback
      } catch { /* start with a clean tenant setting */ }
      localStorage.setItem(key, JSON.stringify(fallback))
      return fallback
    }
    const emptyDelivery = { shadowfax: { enabled: false, quoteUrl: '', bookingUrl: '', trackingUrl: '', paymentMethods: { cod: true, advance: true, online: true } }, porter: { enabled: false, quoteUrl: '', bookingUrl: '', trackingUrl: '', paymentMethods: { cod: true, advance: true, online: true } }, ownRider: { enabled: false, paymentMethods: { cod: true, advance: true, online: true } } }
    localStorage.setItem('morrow-user', JSON.stringify(owner))
    setCurrentUser(owner)
    setActiveStoreId(id)
    const savedProducts = read('products', [])
    setCatalog(Array.isArray(savedProducts) ? savedProducts : [])
    setCart({})
    setAdvanceAmount(read('advance-percent', 20))
    setPaymentSettings(read('payment-settings', { keyId: '', createOrderUrl: '/api/payments/razorpay/order', verifyPaymentUrl: '/api/payments/razorpay/verify', methods: { cod: true, advance: true, online: true } }))
    setDeliverySettings(read('delivery-settings', emptyDelivery))
    setSavedAddress(read('delivery-address', null))
    setProductCategories(read('categories', []))
    setBanner({ ...defaultBanner, ...read('banner', defaultBanner) })
    setAppearance({ ...defaultAppearance, ...read('appearance', defaultAppearance) })
    setStoreSubscription(read('subscription', { status: 'free', expiresAt: null }))
    setStoreAdminAuthenticated(true)
    setLoginOpen(false)
    setCheckoutOpen(false)
    setAdminOpen(true)
    window.history.pushState({}, '', '/admin')
  }
  const openMainAdmin = () => {
    setStoreAdminAuthenticated(false)
    localStorage.removeItem('morrow-user')
    setCurrentUser(null)
    setActiveStoreId('')
    try {
      const savedProducts = JSON.parse(localStorage.getItem('morrow-products'))
      setCatalog(Array.isArray(savedProducts) ? savedProducts : initialProducts)
      const savedPercent = Number(localStorage.getItem('morrow-advance-percent'))
      setAdvanceAmount(Number.isFinite(savedPercent) && savedPercent >= 0 && savedPercent <= 100 ? savedPercent : 20)
      const savedPayments = JSON.parse(localStorage.getItem('morrow-payment-settings')) || {}
      setPaymentSettings({ keyId: '', createOrderUrl: '/api/payments/razorpay/order', verifyPaymentUrl: '/api/payments/razorpay/verify', methods: { cod: true, advance: true, online: true }, ...savedPayments, methods: { cod: true, advance: true, online: true, ...(savedPayments.methods || {}) } })
      const defaultDelivery = { shadowfax: { enabled: false, quoteUrl: '', bookingUrl: '', trackingUrl: '', paymentMethods: { cod: true, advance: true, online: true } }, porter: { enabled: false, quoteUrl: '', bookingUrl: '', trackingUrl: '', paymentMethods: { cod: true, advance: true, online: true } }, ownRider: { enabled: false, paymentMethods: { cod: true, advance: true, online: true } } }
      const savedDelivery = JSON.parse(localStorage.getItem('morrow-delivery-settings')) || {}
      setDeliverySettings(Object.fromEntries(Object.entries(defaultDelivery).map(([key, value]) => [key, { ...value, ...(savedDelivery[key] || {}), paymentMethods: { ...value.paymentMethods, ...(savedDelivery[key]?.paymentMethods || {}) } }])))
      setSavedAddress(JSON.parse(localStorage.getItem('morrow-delivery-address')))
      const savedCategories = JSON.parse(localStorage.getItem('morrow-categories'))
      setProductCategories(Array.isArray(savedCategories) ? savedCategories : initialCategories.slice(1))
      setBanner({ ...defaultBanner, ...(JSON.parse(localStorage.getItem('morrow-banner')) || {}) })
      setAppearance({ ...defaultAppearance, ...(JSON.parse(localStorage.getItem('morrow-appearance')) || {}) })
      setStoreSubscription({ status: 'platform', expiresAt: null })
    } catch { setCatalog(initialProducts) }
    setMainAdminAuthenticated(true)
  }
  const changeQuantity = (product, amount) => {
    const currentQuantity = cart[product.id] || 0
    const limit = getProductQuantityLimit(product)
    if (amount > 0 && currentQuantity + amount > limit) {
      const stock = getTrackedStock(product)
      setNotice(stock !== null && currentQuantity >= stock ? `${product.name} is out of stock.` : `Maximum ${limit} per order for ${product.name}.`)
      window.setTimeout(() => setNotice(''), 2200)
      return
    }
    setCart((items) => {
      const nextQuantity = Math.min(limit, Math.max(0, (items[product.id] || 0) + amount))
      const nextItems = { ...items }
      if (nextQuantity > 0) nextItems[product.id] = nextQuantity
      else delete nextItems[product.id]
      return nextItems
    })
    if (amount > 0) {
      setNotice(`${product.name} added to your bag`)
      window.setTimeout(() => setNotice(''), 2200)
    }
  }
  const cartCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0)
  const mainOrders = (() => { try { return JSON.parse(localStorage.getItem('morrow-orders')) || [] } catch { return [] } })()
  const mainProducts = (() => { try { const saved = JSON.parse(localStorage.getItem('morrow-products')); return Array.isArray(saved) ? saved : initialProducts } catch { return initialProducts } })()
  const customerOrders = currentUser ? (() => {
    const key = routeStore?.storeId ? `morrow-store-${routeStore.storeId}-orders` : 'morrow-orders'
    try { return (JSON.parse(localStorage.getItem(key)) || []).filter((order) => String(order.customer?.email || '').toLowerCase() === String(currentUser.email || '').toLowerCase()) } catch { return [] }
  })() : []
  const dueCodOrder = customerOrders.find((order) => order.status === 'delivered' && order.codCollectionStatus !== 'paid' && Number(order.codCollectionExpiresAt) > Date.now())
  const adminOrders = currentUser?.storeId
    ? (() => { try { return (JSON.parse(localStorage.getItem(`morrow-store-${currentUser.storeId}-orders`)) || []).map((order) => ({ ...order, storeId: currentUser.storeId, storeName: currentUser.storeName })) } catch { return [] } })()
    : [{ storeId: 'main', storeName: 'Main store', orders: mainOrders }, ...platformStores].flatMap((store) => (store.orders || []).map((order) => ({ ...order, storeId: store.storeId, storeName: store.storeName })))
  const updateOrderStatus = (order, status) => {
    const key = order.storeId && order.storeId !== 'main' ? `morrow-store-${order.storeId}-orders` : 'morrow-orders'
    let saved = []
    try { saved = JSON.parse(localStorage.getItem(key)) || [] } catch { saved = [] }
    const changedAt = new Date().toISOString()
    const updated = saved.map((item) => {
      if (item.id !== order.id) return item
      const remaining = Math.max(0, Number(item.total || 0) - Number(item.paidAmount || 0))
      const needsCashCollection = status === 'delivered' && remaining > 0 && ['cod', 'advance'].includes(item.paymentMethod)
      return { ...item, status, statusHistory: [...(item.statusHistory || []), { status, at: changedAt }], ...(needsCashCollection ? { codCollectionStatus: 'pending', codCollectionExpiresAt: Date.now() + 10 * 60 * 1000 } : {}) }
    })
    localStorage.setItem(key, JSON.stringify(updated))
    refreshPlatformStores()
  }
  const markCodBalancePaid = (order) => {
    const key = order.storeId && order.storeId !== 'main' ? `morrow-store-${order.storeId}-orders` : 'morrow-orders'
    let saved = []
    try { saved = JSON.parse(localStorage.getItem(key)) || [] } catch { saved = [] }
    const paidAt = new Date().toISOString()
    const updated = saved.map((item) => item.id === order.id ? { ...item, codCollectionStatus: 'paid', balancePaidAt: paidAt, balanceCollectedAmount: Math.max(0, Number(item.total || 0) - Number(item.paidAmount || 0)), statusHistory: [...(item.statusHistory || []), { status: 'cod_paid', at: paidAt }] } : item)
    localStorage.setItem(key, JSON.stringify(updated))
    refreshPlatformStores()
  }
  const currentStorage = (() => { try { return { limitGb: 1, purchasedGb: 0, ...JSON.parse(localStorage.getItem(storeKey('storage')) || '{}') } } catch { return { limitGb: 1, purchasedGb: 0 } } })()
  let currentStorageUsedBytes = 0
  if (activeStoreId) for (let index = 0; index < localStorage.length; index += 1) { const key = localStorage.key(index); if (key?.startsWith(`morrow-store-${activeStoreId}-`)) currentStorageUsedBytes += (key.length + (localStorage.getItem(key)?.length || 0)) * 2 }
  const adminPanel = <AdminSettings owner={currentUser} subscription={storeSubscription} subscriptionPlans={subscriptionPlans} onRecharge={rechargeStore} storage={currentStorage} storageUsedBytes={currentStorageUsedBytes} storagePricePerGb={storagePricePerGb} onBuyStorage={buyStoreStorage} onSaveStorageSettings={saveStorageSettings} onLogout={logoutAdmin} platformStores={platformStores} orders={adminOrders} onUpdateOrderStatus={updateOrderStatus} platformAnnouncement={platformAnnouncement} onSavePlatformAnnouncement={savePlatformAnnouncement} mainOrders={mainOrders} mainProducts={mainProducts} onUpdatePlatformStore={savePlatformStore} onDeletePlatformStore={removePlatformStore} onSavePlatformStoreProducts={savePlatformStoreProducts} onSavePlatformStoreCategories={savePlatformStoreCategories} onSavePlatformStoreAppearance={savePlatformStoreAppearance} storeName={currentUser?.storeName || 'Main store'} subdomain={currentUser?.subdomain} isMainAdmin={!currentUser?.storeId} subscriptionAmount={subscriptionAmount} onSaveSubscription={(amount) => { setSubscriptionAmount(amount); localStorage.setItem('morrow-platform-subscription-price', String(amount)); const nextPlans = subscriptionPlans.map((plan) => plan.id === '1m' ? { ...plan, price: amount } : plan); setSubscriptionPlans(nextPlans); localStorage.setItem('morrow-subscription-plans', JSON.stringify(nextPlans)) }} onSavePlans={(plans) => { setSubscriptionPlans(plans); localStorage.setItem('morrow-subscription-plans', JSON.stringify(plans)); const monthly = plans.find((plan) => plan.id === '1m'); if (monthly) { setSubscriptionAmount(monthly.price); localStorage.setItem('morrow-platform-subscription-price', String(monthly.price)) } }} amount={advanceAmount} paymentSettings={paymentSettings} deliverySettings={deliverySettings} productCategories={productCategories} onSaveCategories={saveCategories} banner={banner} onSaveBanner={(nextBanner) => { setBanner(nextBanner); localStorage.setItem(storeKey('banner'), JSON.stringify(nextBanner)) }} appearance={appearance} onSaveAppearance={(nextAppearance) => { setAppearance(nextAppearance); localStorage.setItem(storeKey('appearance'), JSON.stringify(nextAppearance)) }} products={catalog} onSaveProducts={saveProducts} onBack={closeAdmin} onSaveDelivery={(settings) => { setDeliverySettings(settings); localStorage.setItem(storeKey('delivery-settings'), JSON.stringify(settings)) }} onSavePayment={(amount, settings) => { setAdvanceAmount(amount); setPaymentSettings(settings); localStorage.setItem(storeKey('advance-percent'), String(amount)); localStorage.setItem(storeKey('payment-settings'), JSON.stringify(settings)) }}/>

  return <div className="storefront" style={{ '--store-bg': appearance.useCustomBackground ? appearance.background : '#fbfaf7', '--store-accent': appearance.useCustomAccent ? appearance.accent : '#354232' }}>
    {!adminOpen && !loginOpen && (platformAnnouncement.configured ? platformAnnouncement.enabled && (platformAnnouncement.scope === 'all' || platformAnnouncement.storeIds.includes(routeStore?.storeId || 'main')) : appearance.showAnnouncement) && <div className="announcement">{platformAnnouncement.configured ? platformAnnouncement.text : appearance.announcement}</div>}
    {!adminOpen && !loginOpen && <Header query={query} setQuery={setQuery} cartCount={cartCount} currentUser={currentUser} storeName={routeStore?.storeName} storeLogo={appearance.logo}
      onBagClick={() => { if (currentUser) { setProfileOpen(false); setCheckoutOpen(true) } else setLoginOpen(true) }}
      onProfileClick={() => { if (currentUser) setProfileOpen((open) => !open); else setLoginOpen(true) }} />}
    <main id="top">
      {adminOpen
        ? (mainAdminChecking ? <section className="login-page"><div className="login-card"><p>Checking admin session...</p></div></section> : (mainAdminAuthenticated || storeAdminAuthenticated) ? adminPanel : <MainAdminLogin amount={subscriptionAmount} plans={subscriptionPlans} onAuthenticated={openMainAdmin} onStoreReady={openStoreAdmin} onBack={closeAdmin}/>)
        : routeStore?.status === 'disabled' || routeStore?.permissions?.customers === false ? <section className="admin-empty store-closed"><h2>This store is unavailable</h2><p>The store owner has paused customer access.</p></section>
        : loginOpen ? <LoginPage onBack={() => setLoginOpen(false)} onLogin={(user) => { localStorage.setItem(customerSessionKey, JSON.stringify(user)); setCurrentUser(user); try { setSavedAddress(JSON.parse(localStorage.getItem(customerAddressKey(user.email)))) } catch { setSavedAddress(null) }; setLoginOpen(false); setCheckoutOpen(true); setProfileOpen(false) }}/>
        : profileOpen ? <CustomerProfile customer={currentUser} orders={customerOrders} onLogout={() => { localStorage.removeItem(customerSessionKey); setCurrentUser(null); setSavedAddress(null); setCart({}); setProfileOpen(false) }}/>
        : checkoutOpen ? <Checkout cart={cart} products={catalog} customer={currentUser} address={savedAddress} advanceAmount={advanceAmount} paymentSettings={paymentSettings} deliverySettings={deliverySettings} serviceZones={appearance.deliveryZones || []} onOrderPlaced={recordOrder} onQuantityChange={changeQuantity} onBack={() => setCheckoutOpen(false)} onSaveAddress={(address) => { setSavedAddress(address); localStorage.setItem(customerAddressKey(), JSON.stringify(address)) }}/>
        : <>{(banner.image || banner.video || banner.videoUrl) && <section className="hero">
        <div className="hero-copy"><span className="eyebrow"><i/> {banner.eyebrow}</span><h1>{banner.title}<br/><em>{banner.highlight}</em></h1><p>{banner.description}</p><a className="hero-link" href="#collection">Shop the collection <Icon name="arrow" size={17}/></a></div>
        <div className="hero-image" style={banner.image && !banner.video && !banner.videoUrl ? { backgroundImage: `url("${banner.image}")` } : undefined} role={banner.video || banner.videoUrl ? undefined : 'img'} aria-label={banner.video || banner.videoUrl ? undefined : `${routeStore?.storeName || 'Store'} banner`}>{(banner.video || banner.videoUrl) && <video className="hero-banner-video" src={banner.video || banner.videoUrl} autoPlay muted loop playsInline aria-label={`${routeStore?.storeName || 'Store'} banner video`}/>}<span className="hero-caption">{banner.caption} <b>01 / 04</b></span></div>
        <div className="hero-stamp">{(routeStore?.storeName || 'MADE FOR SLOW DAYS').toUpperCase()} <span>✳</span></div>
      </section>}
      <section className="collection" id="collection">
        {categoryOptions.length > 0 && <div className="category-row" role="tablist" aria-label="Filter by category">{['All pieces', ...categoryOptions].map((item) => <button key={item} className={`category-chip ${category === item ? 'active' : ''}`} onClick={() => setCategory(item)} role="tab" aria-selected={category === item}>{item}</button>)}</div>}
        <div className="product-grid" id="products">{filtered.map((product, index) => <ProductCard key={product.id} product={product} index={index} quantity={cart[product.id] || 0} onQuantityChange={changeQuantity}/>)}</div>
        {filtered.length === 0 && <div className="empty-state">No pieces found. Try another search.</div>}
      </section>
      <section className="note-banner"><span className="note-sparkle">✳</span><div><span className="eyebrow">A NOTE FROM MORROW</span><p>Less, but <em>lovelier.</em></p></div><span className="note-aside">Thoughtfully made. Happily kept.</span></section>
    </>}</main>
    {!adminOpen && !loginOpen && <footer><BrandLogo className="wordmark" label={routeStore?.storeName || 'morrow'} logo={appearance.logo}/>{appearance.showFooterTagline && <span>{appearance.footerTagline}</span>}{appearance.showAdminLink && <a className="admin-footer-link" href="/admin">Admin</a>}{appearance.showCopyright && <span>{appearance.copyright}</span>}</footer>}
    {!adminOpen && currentUser && !checkoutOpen && !loginOpen && dueCodOrder && <CodPaymentPrompt order={dueCodOrder} upiId={paymentSettings.upiId} onPaid={markCodBalancePaid}/>}
    {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}
  </div>
}

export default App





