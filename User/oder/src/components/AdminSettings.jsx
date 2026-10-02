import { useEffect, useMemo, useState } from 'react'
import { formatINR, photo } from '../data/store.js'
import PlatformStores from './PlatformStores.jsx'
import PlatformAdminAccounts from './PlatformAdminAccounts.jsx'
import PlatformDashboard from './PlatformDashboard.jsx'
import OrderManagement from './OrderManagement.jsx'
import DeliveryZones from './DeliveryZones.jsx'
import BrandLogo from './BrandLogo.jsx'
import Icon from './Icon.jsx'
import { downloadOrderBill, downloadSpreadsheet } from '../utils/adminExports.js'

const sections = ['Overview', 'Profile', 'Products', 'Categories', 'Storefront banner', 'Storefront settings', 'Delivery zones', 'Orders', 'Payment setup', 'Payment integration', 'Delivery partners']
const defaultPlans = [{ id: '1m', label: '1 month', unit: 'month', duration: 1, months: 1, price: 500, enabled: true }, { id: '3m', label: '3 months', unit: 'month', duration: 3, months: 3, price: 1350, enabled: true }, { id: '6m', label: '6 months', unit: 'month', duration: 6, months: 6, price: 2500, enabled: true }, { id: '12m', label: '1 year', unit: 'year', duration: 1, months: 12, price: 4800, enabled: true }]
const allPaymentMethods = { cod: true, advance: true, online: true }
const deliveryProviderDefaults = {
  shadowfax: { enabled: false, quoteUrl: '', bookingUrl: '', trackingUrl: '', paymentMethods: allPaymentMethods },
  porter: { enabled: false, quoteUrl: '', bookingUrl: '', trackingUrl: '', paymentMethods: allPaymentMethods },
  ownRider: { enabled: false, paymentMethods: allPaymentMethods },
}
const emptyProduct = { name: '', category: '', regularPrice: '', offerPrice: '', offerLabel: '', color: '', image: '', tag: '', stock: '', maxPerOrder: '', variantType: 'size', size: '', weight: '' }
const productPageSize = 10
const formatStorageSize = (bytes = 0) => bytes < 1024 * 1024 ? `${Math.max(0, bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`

function ProductDetailModal({ product, onClose, onEdit }) {
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return <div className="admin-product-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="admin-product-detail-modal" role="dialog" aria-modal="true" aria-labelledby="admin-product-detail-title"><header><div><span>PRODUCT DETAILS</span><h2 id="admin-product-detail-title">{product.name}</h2></div><button type="button" className="admin-product-detail-close" onClick={onClose} aria-label="Close product details"><Icon name="close" size={18}/></button></header><div className="admin-product-detail-body"><img src={photo(product.image)} alt={product.name}/><dl><div><dt>Category</dt><dd>{product.category || '—'}</dd></div><div><dt>Price</dt><dd>{formatINR(product.price)}</dd></div>{product.oldPrice && <div><dt>Original price</dt><dd>{formatINR(product.oldPrice)}</dd></div>}<div><dt>Color / details</dt><dd>{product.color || '—'}</dd></div><div><dt>Size or weight</dt><dd>{product.size ? `Size: ${product.size}` : product.weight ? `Weight: ${product.weight}` : 'Not set'}</dd></div><div><dt>Stock</dt><dd>{product.stock ?? product.quantity ?? 'Not tracked'}</dd></div><div><dt>Maximum per order</dt><dd>{product.maxPerOrder ?? 'No limit'}</dd></div></dl></div><footer><button type="button" className="admin-cancel" onClick={onClose}>Close</button><button type="button" className="checkout-primary" onClick={onEdit}>Edit product</button></footer></section></div>
}

export default function AdminSettings({ amount, paymentSettings, deliverySettings, products, mainOrders = [], mainProducts = [], orders = [], onUpdateOrderStatus, productCategories = [], banner = {}, appearance = {}, platformAnnouncement = {}, onSavePlatformAnnouncement, storeName, subdomain, owner, subscription = {}, subscriptionPlans = defaultPlans, platformStores = [], storage = { limitGb: 1 }, storageUsedBytes = 0, storagePricePerGb = 100, onSaveStorageSettings, onBuyStorage, onUpdatePlatformStore, onDeletePlatformStore, onSavePlatformStoreProducts, onSavePlatformStoreCategories, onSavePlatformStoreAppearance, isMainAdmin = false, subscriptionAmount = 500, onSaveSubscription, onSavePlans, onRecharge, onLogout, onSaveProducts, onSaveCategories, onSavePayment, onSaveDelivery, onSaveBanner, onSaveAppearance, onBack }) {
  const [activeSection, setActiveSection] = useState('Overview')
  const [draftAmount, setDraftAmount] = useState(String(amount))
  const [draftSubscriptionAmount, setDraftSubscriptionAmount] = useState(String(subscriptionAmount))
  const [storagePriceDraft, setStoragePriceDraft] = useState(String(storagePricePerGb))
  const [storageStoreId, setStorageStoreId] = useState(platformStores[0]?.storeId || '')
  const [storageLimitDraft, setStorageLimitDraft] = useState(String(platformStores[0]?.storage?.limitGb || 1))
  const [storageBusy, setStorageBusy] = useState(false)
  const [keyId, setKeyId] = useState(paymentSettings.keyId || '')
  const [upiId, setUpiId] = useState(paymentSettings.upiId || '')
  const [savedUpiId, setSavedUpiId] = useState(paymentSettings.upiId || '')
  const [createOrderUrl, setCreateOrderUrl] = useState(paymentSettings.createOrderUrl || '/api/payments/razorpay/order')
  const [verifyPaymentUrl, setVerifyPaymentUrl] = useState(paymentSettings.verifyPaymentUrl || '/api/payments/razorpay/verify')
  const [methods, setMethods] = useState({ cod: true, advance: true, online: true, ...(paymentSettings.methods || {}) })
  const [deliveryProviders, setDeliveryProviders] = useState(() => Object.fromEntries(Object.entries(deliveryProviderDefaults).map(([key, defaults]) => [key, { ...defaults, ...(deliverySettings?.[key] || {}), paymentMethods: { ...allPaymentMethods, ...(deliverySettings?.[key]?.paymentMethods || {}) } }])))
  const [productForm, setProductForm] = useState(emptyProduct)
  const [editingId, setEditingId] = useState(null)
  const [productPage, setProductPage] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [savedMessage, setSavedMessage] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [deliveryMessage, setDeliveryMessage] = useState('')
  const [bannerDraft, setBannerDraft] = useState({ eyebrow: 'THE SLOWER SIDE OF EVERYDAY', title: 'Good things,', highlight: 'well chosen.', description: 'Considered pieces for the way you live, made to stay with you a little longer.', image: '', caption: 'THE EVERYDAY EDIT', ...(banner || {}) })
  const [bannerError, setBannerError] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [editingCategory, setEditingCategory] = useState('')
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [planDraft, setPlanDraft] = useState(subscriptionPlans)
  const [appearanceDraft, setAppearanceDraft] = useState({ announcement: 'A little something for your everyday · Free shipping over ₹7,200', footerTagline: 'Good things for the everyday.', copyright: '© 2025 MORROW STUDIO', background: '#fbfaf7', accent: '#354232', showAnnouncement: true, showFooterTagline: true, showCopyright: true, useCustomBackground: true, useCustomAccent: true, showAdminLink: true, ...(appearance || {}) })
  const [platformAnnouncementDraft, setPlatformAnnouncementDraft] = useState({ enabled: platformAnnouncement.enabled ?? true, scope: platformAnnouncement.scope || 'all', storeIds: platformAnnouncement.storeIds || [] })
  const [rechargeBusy, setRechargeBusy] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [adminSearchQuery, setAdminSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchStoreId, setSearchStoreId] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [designStoreId, setDesignStoreId] = useState('main')
  const [designStoreSearch, setDesignStoreSearch] = useState('')
  const [logoError, setLogoError] = useState('')
  const selectedDesignStore = platformStores.find((item) => item.storeId === designStoreId)
  const chooseDesignStore = (storeId) => {
    setDesignStoreId(storeId)
    const selected = platformStores.find((item) => item.storeId === storeId)
    setAppearanceDraft({
      announcement: 'A little something for your everyday · Free shipping over ₹7,200', footerTagline: 'Good things for the everyday.', copyright: '© 2025 MORROW STUDIO',
      background: '#fbfaf7', accent: '#354232', showAnnouncement: true, showFooterTagline: true, showCopyright: true,
      useCustomBackground: true, useCustomAccent: true, showAdminLink: true, ...(selected?.appearance || {}),
    })
    setLogoError('')
  }
  const allowedSections = sections.filter((section) => {
    if (isMainAdmin || ['Overview', 'Profile'].includes(section)) return true
    if (['Products', 'Categories'].includes(section)) return owner?.permissions?.products !== false
    if (['Storefront banner', 'Storefront settings'].includes(section)) return owner?.permissions?.storefront !== false
    if (section === 'Orders') return owner?.permissions?.orders !== false
    if (['Payment setup', 'Payment integration'].includes(section)) return owner?.permissions?.payments !== false
    if (['Delivery partners', 'Delivery zones'].includes(section)) return owner?.permissions?.delivery !== false
    return true
  })
  const adminSections = isMainAdmin ? [...allowedSections.filter((section) => section !== 'Delivery zones'), 'Admin accounts', 'Store management', 'Subscriptions', 'Storage subscriptions'] : allowedSections
  const desktopSectionGroups = (isMainAdmin ? [
    ['PLATFORM', ['Overview', 'Admin accounts', 'Store management', 'Subscriptions', 'Storage subscriptions']],
    ['CATALOG MANAGEMENT', ['Products', 'Categories']],
    ['ORDER MANAGEMENT', ['Orders']],
    ['STOREFRONT', ['Storefront banner', 'Storefront settings']],
    ['DELIVERY', ['Delivery partners']],
    ['PAYMENTS', ['Payment setup', 'Payment integration']],
  ] : [
    ['STORE', ['Overview']],
    ['CATALOG MANAGEMENT', ['Products', 'Categories']],
    ['ORDER MANAGEMENT', ['Orders']],
    ['STOREFRONT', ['Storefront banner', 'Storefront settings']],
    ['DELIVERY', ['Delivery zones', 'Delivery partners']],
    ['PAYMENTS', ['Payment setup', 'Payment integration']],
  ]).map(([title, items]) => ({ title, items: items.filter((item) => adminSections.includes(item)) })).filter((group) => group.items.length)
  const sectionIcons = { Overview: 'dashboard', Profile: 'user', Products: 'package', Categories: 'grid', 'Storefront banner': 'image', 'Storefront settings': 'settings', 'Delivery zones': 'map', Orders: 'clipboard', 'Payment setup': 'wallet', 'Payment integration': 'card', 'Delivery partners': 'truck', 'Admin accounts': 'users', 'Store management': 'store', Subscriptions: 'card', 'Storage subscriptions': 'database' }
  const searchResults = useMemo(() => {
    const query = adminSearchQuery.trim().toLowerCase()
    if (!query) return []
    const results = []
    const available = adminSections.filter((section) => section !== 'Profile')
    available.forEach((section) => { if (section.toLowerCase().includes(query)) results.push({ title: section, detail: 'Admin section', section }) })
    const addMatches = (items, fields, section, storeId = '') => items.forEach((item) => {
      const haystack = fields.map((field) => item[field]).filter(Boolean).join(' ').toLowerCase()
      if (haystack.includes(query)) results.push({ title: item.name || item.storeName || String(item.id || ''), detail: storeId ? 'Store catalog' : section === 'Orders' ? 'Order' : section === 'Products' ? 'Product' : 'Category', section, storeId })
    })
    const addOrderMatches = (items) => items.forEach((order) => {
      const haystack = `${order.id} ${order.storeName} ${order.customer?.name} ${order.customer?.email} ${order.customer?.phone} ${(order.items || []).map((item) => item.name).join(' ')}`.toLowerCase()
      if (haystack.includes(query)) results.push({ title: `Order ${String(order.id || '').slice(-8)}`, detail: `${order.customer?.name || 'Customer'} · ${order.storeName || 'Store'}`, section: 'Orders' })
    })
    if (!isMainAdmin || !['Store management'].includes(activeSection)) {
      addMatches(products, ['name', 'category', 'color', 'tag'], 'Products')
      productCategories.filter((category) => category.toLowerCase().includes(query)).forEach((category) => results.push({ title: category, detail: 'Category', section: 'Categories' }))
      addOrderMatches(orders)
    }
    if (isMainAdmin) {
      platformStores.forEach((store) => {
        const storeText = `${store.storeName} ${store.subdomain} ${store.name} ${store.email}`.toLowerCase()
        if (storeText.includes(query)) results.push({ title: store.storeName, detail: `Store · /${store.subdomain || ''}`, section: 'Store management', storeId: store.storeId })
        addMatches(store.products || [], ['name', 'category', 'color', 'tag'], 'Store management', store.storeId)
        ;(store.categories || []).filter((category) => category.toLowerCase().includes(query)).forEach((category) => results.push({ title: category, detail: `${store.storeName} · Category`, section: 'Store management', storeId: store.storeId }))
      })
      addOrderMatches(mainOrders)
    }
    return results.slice(0, 10)
  }, [adminSearchQuery, adminSections, activeSection, isMainAdmin, products, productCategories, orders, platformStores, mainOrders])
  const chooseSearchResult = (result) => {
    setActiveSection(result.section)
    setSearchStoreId(result.storeId || '')
    setSearchOpen(false)
  }
  const normalizedAdminQuery = adminSearchQuery.trim().toLowerCase()
  const filteredProducts = normalizedAdminQuery ? products.filter((product) => `${product.name} ${product.category} ${product.color} ${product.tag} ${product.size} ${product.weight}`.toLowerCase().includes(normalizedAdminQuery)) : products
  const productPageCount = Math.max(1, Math.ceil(filteredProducts.length / productPageSize))
  const currentProductPage = Math.min(productPage, productPageCount)
  const productStart = (currentProductPage - 1) * productPageSize
  const visibleProducts = filteredProducts.slice(productStart, productStart + productPageSize)
  const visibleCategories = normalizedAdminQuery ? productCategories.filter((category) => category.toLowerCase().includes(normalizedAdminQuery)) : productCategories
  const savePayment = (event) => {
    event.preventDefault()
    const value = draftAmount.trim() === '' ? 0 : Number(draftAmount)
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setPaymentError('Advance payment must be between 0 and 100%.')
      return
    }
    const savedMethods = value === 0 ? { ...methods, advance: false } : methods
    if (!Object.values(savedMethods).some(Boolean)) {
      setPaymentError('Enable at least one payment option before saving.')
      return
    }
    setPaymentError('')
    setMethods(savedMethods)
    onSavePayment(Math.round(value), { ...paymentSettings, methods: savedMethods })
    setSavedMessage('Payment settings saved.')
    window.setTimeout(() => setSavedMessage(''), 2500)
  }

  const savePaymentIntegration = (event) => {
    event.preventDefault()
    onSavePayment(amount, { ...paymentSettings, keyId: keyId.trim(), upiId: upiId.trim(), createOrderUrl: createOrderUrl.trim(), verifyPaymentUrl: verifyPaymentUrl.trim() })
    setSavedUpiId(upiId.trim())
    setSavedMessage('Payment integration settings saved.')
    window.setTimeout(() => setSavedMessage(''), 2500)
  }

  const saveDelivery = (event) => {
    event.preventDefault()
    onSaveDelivery(deliveryProviders)
    setDeliveryMessage('Delivery partner settings saved.')
    window.setTimeout(() => setDeliveryMessage(''), 2500)
  }

  const uploadBanner = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setBannerError('Choose an image file.'); return }
    if (file.size > 10 * 1024 * 1024) { setBannerError('Image must be 10 MB or smaller.'); return }
    const reader = new FileReader()
    reader.onerror = () => setBannerError('Could not read this image.')
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => setBannerError('This image could not be opened.')
      image.onload = () => {
        const scale = Math.min(1, 1800 / image.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
        setBannerDraft((previous) => ({ ...previous, image: canvas.toDataURL('image/jpeg', 0.82), video: '', videoUrl: '' }))
        setBannerError('')
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  }

  const uploadBannerVideo = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) { setBannerError('Choose a video file.'); return }
    if (file.size > 3 * 1024 * 1024) { setBannerError('Video must be 3 MB or smaller so it can be saved with this store.'); return }
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl)
      if (!Number.isFinite(video.duration) || video.duration < 30) {
        setBannerError('The uploaded video must be at least 30 seconds long.')
        return
      }
      const reader = new FileReader()
      reader.onerror = () => setBannerError('Could not read this video.')
      reader.onload = () => {
        setBannerDraft((previous) => ({ ...previous, video: reader.result, videoUrl: '', image: '' }))
        setBannerError('')
      }
      reader.readAsDataURL(file)
    }
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      setBannerError('This video could not be opened.')
    }
    video.src = objectUrl
  }

  const saveBanner = (event) => {
    event.preventDefault()
    try {
      onSaveBanner(bannerDraft)
      setSavedMessage('Storefront banner saved.')
    } catch {
      setBannerError('Could not save this banner. Choose a smaller video or use a video link instead.')
      return
    }
    window.setTimeout(() => setSavedMessage(''), 2500)
  }

  const addCategory = (event) => {
    event.preventDefault()
    const name = newCategory.trim()
    if (!name) return
    if (productCategories.some((item) => item.toLowerCase() === name.toLowerCase())) {
      setSavedMessage('That category already exists.')
      return
    }
    onSaveCategories([...productCategories, name])
    setNewCategory('')
    setSavedMessage('Category added.')
    window.setTimeout(() => setSavedMessage(''), 2500)
  }

  const deleteCategory = (name) => {
    onSaveCategories(productCategories.filter((item) => item !== name))
    onSaveProducts(products.map((product) => product.category === name ? { ...product, category: '' } : product))
    setSavedMessage('Category removed.')
    window.setTimeout(() => setSavedMessage(''), 2500)
  }

  const startCategoryEdit = (name) => {
    setEditingCategory(name)
    setEditingCategoryName(name)
  }

  const cancelCategoryEdit = () => {
    setEditingCategory('')
    setEditingCategoryName('')
  }

  const updateCategory = (name) => {
    const nextName = editingCategoryName.trim()
    if (!nextName || nextName === name) {
      cancelCategoryEdit()
      return
    }
    if (productCategories.some((item) => item !== name && item.toLowerCase() === nextName.toLowerCase())) {
      setSavedMessage('That category already exists.')
      return
    }
    onSaveCategories(productCategories.map((item) => item === name ? nextName : item))
    onSaveProducts(products.map((product) => product.category === name ? { ...product, category: nextName } : product))
    cancelCategoryEdit()
    setSavedMessage('Category updated.')
    window.setTimeout(() => setSavedMessage(''), 2500)
  }

  const saveSubscription = (event) => {
    event.preventDefault()
    const value = Number(draftSubscriptionAmount)
    if (!Number.isFinite(value) || value < 1) return
    onSaveSubscription(Math.round(value))
    setSavedMessage('Subscription price saved.')
    window.setTimeout(() => setSavedMessage(''), 2500)
  }

  const savePlans = (event) => {
    event.preventDefault()
    const cleaned = planDraft.map((plan) => {
      const duration = Math.max(1, Math.round(Number(plan.duration) || 1))
      const unit = plan.unit === 'year' ? 'year' : 'month'
      const months = unit === 'year' ? duration * 12 : duration
      return { ...plan, id: `${duration}${unit === 'year' ? 'y' : 'm'}`, duration, unit, months, label: `${duration} ${unit}${duration === 1 ? '' : 's'}`, price: Math.max(0, Math.round(Number(plan.price) || 0)) }
    })
    if (new Set(cleaned.map((plan) => `${plan.duration}-${plan.unit}`)).size !== cleaned.length) {
      setSavedMessage('Each subscription duration must be unique.')
      return
    }
    onSavePlans(cleaned)
    setSavedMessage('Subscription plans saved.')
    window.setTimeout(() => setSavedMessage(''), 2500)
  }

  const saveAppearance = (event) => {
    event.preventDefault()
    const isEditingPlatformAnnouncement = isMainAdmin && designStoreId === 'main'
    const nextAppearance = { ...appearanceDraft, showAnnouncement: isEditingPlatformAnnouncement ? platformAnnouncementDraft.enabled : appearanceDraft.showAnnouncement }
    if (isMainAdmin && designStoreId !== 'main') onSavePlatformStoreAppearance(designStoreId, nextAppearance)
    else onSaveAppearance(nextAppearance)
    if (isEditingPlatformAnnouncement) onSavePlatformAnnouncement({ enabled: platformAnnouncementDraft.enabled, scope: platformAnnouncementDraft.scope, storeIds: platformAnnouncementDraft.storeIds, text: appearanceDraft.announcement })
    setSavedMessage('Storefront settings saved.')
    window.setTimeout(() => setSavedMessage(''), 2500)
  }

  const uploadStoreLogo = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setLogoError('Choose an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setLogoError('Logo must be 5 MB or smaller.'); return }
    const reader = new FileReader()
    reader.onerror = () => setLogoError('Could not read this image.')
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => setLogoError('This image could not be opened.')
      image.onload = () => {
        const scale = Math.min(1, 700 / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
        setAppearanceDraft((previous) => ({ ...previous, logo: canvas.toDataURL('image/webp', 0.82) }))
        setLogoError('')
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  }

  const recharge = async (plan) => {
    setRechargeBusy(true)
    setProfileMessage('')
    try {
      const result = await onRecharge(plan)
      setProfileMessage(result || 'Payment verified and plan renewed.')
    } catch (error) {
      setProfileMessage(error.message || 'Subscription payment is not connected yet.')
    } finally { setRechargeBusy(false) }
  }

  const saveStorageConfig = (event) => {
    event.preventDefault()
    const selected = platformStores.find((item) => item.storeId === storageStoreId)
    if (!selected || !onSaveStorageSettings) return
    onSaveStorageSettings(storageStoreId, { ...selected.storage, limitGb: Math.max(1, Number(storageLimitDraft) || 1) }, Math.max(0, Number(storagePriceDraft) || 0))
    setSavedMessage('Store storage and price saved.')
    window.setTimeout(() => setSavedMessage(''), 2500)
  }

  const buyStorage = async (additionalGb) => {
    if (!onBuyStorage) return
    setStorageBusy(true)
    setProfileMessage('')
    try { setProfileMessage(await onBuyStorage(additionalGb)) }
    catch (error) { setProfileMessage(error.message || 'Storage payment is not connected yet.') }
    finally { setStorageBusy(false) }
  }

  const chooseStorageStore = (storeId) => {
    setStorageStoreId(storeId)
    const selected = platformStores.find((item) => item.storeId === storeId)
    setStorageLimitDraft(String(selected?.storage?.limitGb || 1))
  }

  const updateDeliveryProvider = (key, changes) => setDeliveryProviders((previous) => ({ ...previous, [key]: { ...previous[key], ...changes } }))

  const toggleProductVariant = () => setProductForm((form) => ({ ...form, variantType: form.variantType === 'size' ? 'weight' : 'size' }))

  const saveProduct = (event) => {
    event.preventDefault()
    const regularPrice = Number(productForm.regularPrice)
    const price = productForm.offerPrice === '' ? regularPrice : Number(productForm.offerPrice)
    const stock = productForm.stock === '' ? undefined : Number(productForm.stock)
    const maxPerOrder = productForm.maxPerOrder === '' ? undefined : Number(productForm.maxPerOrder)
    if (!Number.isFinite(regularPrice) || regularPrice < 0 || !Number.isFinite(price) || price < 0 || price > regularPrice) {
      setUploadError('Offer price must be less than or equal to the original price.')
      return
    }
    if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
      setUploadError('Stock must be a whole number of zero or more.')
      return
    }
    if (maxPerOrder !== undefined && (!Number.isInteger(maxPerOrder) || maxPerOrder < 1)) {
      setUploadError('Maximum per order must be a whole number of at least one.')
      return
    }
    const product = { ...productForm, size: productForm.variantType === 'size' ? productForm.size.trim() : '', weight: productForm.variantType === 'weight' ? productForm.weight.trim() : '', stock, maxPerOrder, id: editingId || Math.max(0, ...products.map((item) => item.id)) + 1, price, oldPrice: price < regularPrice ? regularPrice : undefined, offerLabel: productForm.offerLabel.trim() }
    onSaveProducts(editingId ? products.map((item) => item.id === editingId ? product : item) : [...products, product])
    setUploadError('')
    setProductForm(emptyProduct)
    setEditingId(null)
    setSavedMessage(editingId ? 'Product updated.' : 'Product added to your store.')
    window.setTimeout(() => setSavedMessage(''), 2500)
  }

  const editProduct = (product) => {
    const variantType = product.variantType || (product.size ? 'size' : product.weight ? 'weight' : 'size')
    setProductForm({ name: product.name, category: product.category, regularPrice: String(product.oldPrice || product.price), offerPrice: product.oldPrice ? String(product.price) : '', offerLabel: product.offerLabel || '', color: product.color, image: product.image, tag: product.tag || '', stock: String(product.stock ?? product.quantity ?? ''), maxPerOrder: String(product.maxPerOrder ?? ''), variantType, size: product.size || '', weight: product.weight || '' })
    setEditingId(product.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const uploadProductImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadError('')
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image must be 10 MB or smaller.')
      return
    }
    const reader = new FileReader()
    reader.onerror = () => setUploadError('Could not read this image. Please try another file.')
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => setUploadError('This image could not be opened.')
      image.onload = () => {
        const maxSize = 1200
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        if (!context) {
          setUploadError('Image compression is not available in this browser.')
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        setProductForm((form) => ({ ...form, image: canvas.toDataURL('image/webp', 0.82) }))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  }

  const deleteProduct = (id) => {
    onSaveProducts(products.filter((product) => product.id !== id))
    if (editingId === id) { setProductForm(emptyProduct); setEditingId(null) }
  }

  const exportAdminPage = () => {
    const allOrders = isMainAdmin ? mainOrders : orders
    const rowsBySection = {
      Products: products.map(({ id, name, category, quantity, stock, price, oldPrice, status, color, size, weight }) => ({ id, name, category, quantity: quantity ?? stock ?? '', price, originalPrice: oldPrice || price, status: status || 'Active', details: color, size: size || '', weight: weight || '' })),
      Categories: productCategories.map((name, index) => ({ number: index + 1, category: name })),
      Orders: allOrders.map((order) => ({ orderId: order.id, store: order.storeName || storeName, customer: order.customer?.name || order.address?.name, email: order.customer?.email, mobile: order.customer?.phone || order.address?.phone, status: order.status || 'new', payment: order.paymentMethod, totalINR: order.total, paidINR: order.paidAmount, balanceINR: Math.max(0, Number(order.total || 0) - Number(order.paidAmount || 0)), createdAt: order.createdAt })),
      'Store management': platformStores.map((store) => ({ store: store.storeName, owner: store.name, email: store.email, subdomain: store.subdomain, products: store.products.length, categories: store.categories.length, status: store.status, subscription: store.subscription?.planId, expiresAt: store.subscription?.expiresAt })),
      Subscriptions: subscriptionPlans.map((plan) => ({ plan: plan.label, duration: plan.months, priceINR: plan.price, enabled: plan.enabled })),
      Overview: [{ store: 'Main store', products: mainProducts.length, orders: mainOrders.length, salesINR: mainOrders.reduce((sum, order) => sum + Number(order.total || 0), 0) }, ...platformStores.map((store) => ({ store: store.storeName, products: store.products.length, orders: store.orders.length, salesINR: store.orders.reduce((sum, order) => sum + Number(order.total || 0), 0) }))],
      'Delivery zones': (appearance.deliveryZones || []).map((zone) => ({ zone: zone.name, city: zone.city, radiusKm: zone.radiusKm, boundaryPoints: zone.boundary?.length || 0, centerLat: zone.lat, centerLng: zone.lng })),
    }
    const rows = rowsBySection[activeSection] || [{ section: activeSection, settings: JSON.stringify(activeSection === 'Storefront settings' ? appearanceDraft : activeSection === 'Storefront banner' ? bannerDraft : activeSection === 'Payment setup' ? methods : deliveryProviders) }]
    downloadSpreadsheet(`morrow-${activeSection.toLowerCase().replaceAll(' ', '-')}`, rows)
  }
  const adminWebsiteUrl = !isMainAdmin && subdomain ? `/${subdomain}` : '/'

  return <section className="admin-dashboard">
    <aside className="admin-sidebar">
      <div className="admin-sidebar-head"><BrandLogo className="admin-brand" href="#top" label="morrow" logo={isMainAdmin ? appearanceDraft.logo : appearance.logo} imageOnly/><button className="admin-menu-toggle" type="button" aria-expanded={mobileNavOpen} aria-controls="admin-mobile-menu" onClick={() => setMobileNavOpen((open) => !open)}><span><Icon name={mobileNavOpen ? 'close' : 'menu'} size={15}/></span><b>{mobileNavOpen ? 'Close menu' : 'Menu'}</b></button></div>
      <nav className="admin-nav-desktop" aria-label="Admin sections">
        {desktopSectionGroups.map((group) => <div className="admin-nav-group" key={group.title}><span className="admin-nav-heading">{group.title}</span>{group.items.map((section) => <button key={section} className={activeSection === section ? 'active' : ''} onClick={() => setActiveSection(section)}><span className="admin-nav-mark"><Icon name={sectionIcons[section]} size={16}/></span><span className="admin-nav-label">{section}</span></button>)}</div>)}
      </nav>
      <nav id="admin-mobile-menu" className={`admin-nav-mobile${mobileNavOpen ? ' is-open' : ''}`} aria-label="Admin sections">{adminSections.map((section) => <button key={section} className={activeSection === section ? 'active' : ''} onClick={() => { setActiveSection(section); setMobileNavOpen(false) }}><span className="admin-mobile-mark"><Icon name={sectionIcons[section] || 'dashboard'} size={16}/></span>{section}</button>)}</nav>
    </aside>
    <div className="admin-content">
      <header className={`admin-topbar${isMainAdmin ? ' admin-topbar-main' : ''}`}>
        <div className="admin-topbar-mobile">
          <div className="admin-mobile-title">
            <div><span className="eyebrow">{storeName || 'MORROW STORE'}</span><h1>{activeSection}</h1></div>
            <a className="admin-website-button" href={adminWebsiteUrl} target="_blank" rel="noreferrer">View website <Icon name="arrow" size={14}/></a>
          </div>
          <div className="admin-global-search mobile-admin-search"><Icon name="search" size={16}/><input aria-label="Search all admin data" placeholder="Search admin data..." value={adminSearchQuery} onFocus={() => setSearchOpen(true)} onChange={(event) => { setAdminSearchQuery(event.target.value); setSearchOpen(true) }} onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false); if (event.key === 'Enter' && searchResults[0]) chooseSearchResult(searchResults[0]) }}/>{adminSearchQuery && <button type="button" aria-label="Clear search" onClick={() => setAdminSearchQuery('')}>×</button>}{searchOpen && adminSearchQuery.trim() && <div className="admin-search-results">{searchResults.length ? searchResults.map((result, index) => <button type="button" key={`${result.section}-${result.storeId}-${result.title}-${index}`} onClick={() => chooseSearchResult(result)}><strong>{result.title}</strong><small>{result.detail}</small></button>) : <p>No matching admin data found.</p>}</div>}</div>
        </div>
        <div className="admin-topbar-desktop">
          {!isMainAdmin && <h1>{activeSection}</h1>}
          <div className="admin-global-search"><Icon name="search" size={16}/><input aria-label="Search all admin data" placeholder="Search stores, products, orders..." value={adminSearchQuery} onFocus={() => setSearchOpen(true)} onChange={(event) => { setAdminSearchQuery(event.target.value); setSearchOpen(true) }} onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false); if (event.key === 'Enter' && searchResults[0]) chooseSearchResult(searchResults[0]) }}/>{adminSearchQuery && <button type="button" aria-label="Clear search" onClick={() => setAdminSearchQuery('')}>×</button>}{searchOpen && adminSearchQuery.trim() && <div className="admin-search-results">{searchResults.length ? searchResults.map((result, index) => <button type="button" key={`${result.section}-${result.storeId}-${result.title}-${index}`} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSearchResult(result)}><strong>{result.title}</strong><small>{result.detail}</small></button>) : <p>No matching admin data found.</p>}</div>}</div>
          <a className="admin-website-button" href={adminWebsiteUrl} target="_blank" rel="noreferrer">View website <Icon name="arrow" size={14}/></a>
          <button className="admin-header-profile" type="button" onClick={() => setActiveSection('Profile')}><span>{(owner?.name || (isMainAdmin ? 'A' : storeName) || 'A').slice(0, 1).toUpperCase()}</span><b>{owner?.name || (isMainAdmin ? 'Platform admin' : 'Store profile')}<small>Profile · {isMainAdmin ? 'Main admin' : 'Store admin'}</small></b></button>
        </div>
      </header>
      <div className="admin-page-actions"><button type="button" className="admin-export-button" onClick={exportAdminPage}><Icon name="download" size={15}/> Export Excel</button></div>
      {savedMessage && <div className="admin-saved-message" role="status">✓ {savedMessage}</div>}
      {activeSection === 'Profile' && <div className="admin-profile"><div className="admin-section-heading"><div><h2>{isMainAdmin ? 'Main admin profile' : 'Store admin profile'}</h2><p>Account details, subscription status and access.</p></div></div><article className="admin-profile-card"><div className="admin-profile-avatar">{(owner?.name || storeName || 'A').slice(0, 1).toUpperCase()}</div><div><h3>{owner?.name || (isMainAdmin ? 'Platform administrator' : storeName)}</h3><p>{owner?.email || 'Main administrator'}</p>{!isMainAdmin && <small>{storeName}{subdomain ? ` · /${subdomain}` : ''}</small>}</div></article>{!isMainAdmin && <><article className="admin-plan-status"><div><span>SUBSCRIPTION STATUS</span><strong>{subscription.expiresAt ? (new Date(subscription.expiresAt).getTime() > Date.now() ? 'Active' : 'Expired') : subscription.status === 'free' ? 'Free access' : 'No active plan'}</strong></div><div><span>PLAN EXPIRES</span><strong>{subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : subscription.status === 'free' ? 'No expiry · free setup' : '—'}</strong></div></article><div className="admin-section-heading"><div><h2>Recharge your plan</h2><p>Choose a plan duration to continue using your store.</p></div></div><div className="admin-recharge-plans">{subscriptionPlans.filter((plan) => plan.enabled).map((plan) => <article key={plan.id}><span>{plan.label}</span><strong>{formatINR(plan.price)}</strong><small>{plan.months} {plan.months === 1 ? 'month' : 'months'} of store access</small><button className="checkout-primary" type="button" disabled={rechargeBusy} onClick={() => recharge(plan)}>{rechargeBusy ? 'Please wait…' : 'Recharge plan'}</button></article>)}</div>{profileMessage && <p className="admin-upload-error" role="status">{profileMessage}</p>}</>}<button className="admin-profile-logout" type="button" onClick={onLogout}>Log out</button></div>}
      {!isMainAdmin && activeSection === 'Profile' && <div className="admin-payment"><div className="admin-section-heading"><div><h2>Store storage</h2><p>Extra storage keeps your product photos and storefront media.</p></div></div><div className="admin-payment-form"><article className="admin-plan-status"><div><span>STORAGE USED</span><strong>{formatStorageSize(storageUsedBytes)}</strong></div><div><span>STORAGE LIMIT</span><strong>{storage.limitGb || 1} GB</strong></div></article><p className="admin-intro">Add storage: {formatINR(storagePricePerGb)} per GB. Payment is verified by the platform before your limit changes.</p><div className="admin-recharge-plans">{[1, 5, 10].map((gb) => <article key={gb}><span>{gb} GB extra</span><strong>{formatINR(gb * storagePricePerGb)}</strong><small>Added to your store storage limit</small><button className="checkout-primary" type="button" disabled={storageBusy} onClick={() => buyStorage(gb)}>{storageBusy ? 'Please wait…' : 'Buy storage'}</button></article>)}</div>{profileMessage && <p className="admin-upload-error" role="status">{profileMessage}</p>}<button className="admin-profile-logout" type="button" onClick={onLogout}>Log out</button></div></div>}
      {isMainAdmin && activeSection === 'Admin accounts' && <PlatformAdminAccounts stores={platformStores} mainAdmin={owner} searchTerm={adminSearchQuery} onManageStore={(storeId) => { setSearchStoreId(storeId); setActiveSection('Store management') }}/>}
      {isMainAdmin && activeSection === 'Store management' && <PlatformStores stores={platformStores} subscriptionPlans={subscriptionPlans} searchTerm={adminSearchQuery} searchStoreId={searchStoreId} onUpdateStore={onUpdatePlatformStore} onDeleteStore={onDeletePlatformStore} onSaveProducts={onSavePlatformStoreProducts} onSaveCategories={onSavePlatformStoreCategories}/>}
      {activeSection === 'Storefront settings' && <div className="admin-payment"><div className="admin-section-heading"><div><h2>{isMainAdmin && designStoreId !== 'main' ? `${selectedDesignStore?.storeName || 'Selected store'} storefront` : 'Storefront appearance'}</h2><p>{isMainAdmin && designStoreId !== 'main' ? `Edit the selected store’s logo, header and footer settings${selectedDesignStore?.subdomain ? ` · /${selectedDesignStore.subdomain}` : ''}.` : 'Manage the logo and appearance shown on the storefront.'}</p></div>{isMainAdmin && designStoreId !== 'main' && selectedDesignStore?.subdomain && <a className="admin-export-button" href={`/${selectedDesignStore.subdomain}`} target="_blank" rel="noreferrer">Preview store</a>}</div><form className="admin-payment-form" onSubmit={saveAppearance}>
        {isMainAdmin && <div className="design-store-select"><label>Search stores<input value={designStoreSearch} onChange={(event) => setDesignStoreSearch(event.target.value)} placeholder="Search a store name or owner"/></label><label>Choose store<select value={designStoreId} onChange={(event) => chooseDesignStore(event.target.value)}><option value="main">Main storefront</option>{platformStores.filter((store) => `${store.storeName} ${store.name} ${store.email} ${store.subdomain}`.toLowerCase().includes(designStoreSearch.trim().toLowerCase())).map((store) => <option key={store.storeId} value={store.storeId}>{store.storeName} · /{store.subdomain}</option>)}</select></label></div>}
        <div className="appearance-setting logo-setting"><label>Store logo<input type="file" accept="image/*" onChange={uploadStoreLogo}/><small>Choose the logo shown in this store’s header and footer. Maximum file size: 5 MB.</small></label>{appearanceDraft.logo && <div className="store-logo-preview"><img src={appearanceDraft.logo} alt="Store logo preview"/><button type="button" className="admin-cancel" onClick={() => setAppearanceDraft({ ...appearanceDraft, logo: '' })}>Remove logo</button></div>}</div>{logoError && <p className="admin-upload-error" role="alert">{logoError}</p>}
        {isMainAdmin && <>
          <div className="appearance-setting"><label>Announcement bar text<input value={appearanceDraft.announcement} onChange={(event) => setAppearanceDraft({ ...appearanceDraft, announcement: event.target.value })}/></label><label className="admin-switch"><span>Show announcement bar</span><input type="checkbox" checked={designStoreId === 'main' ? platformAnnouncementDraft.enabled : appearanceDraft.showAnnouncement} onChange={(event) => designStoreId === 'main' ? setPlatformAnnouncementDraft({ ...platformAnnouncementDraft, enabled: event.target.checked }) : setAppearanceDraft({ ...appearanceDraft, showAnnouncement: event.target.checked })}/></label></div>
          <div className="appearance-setting"><label>Footer tagline<input value={appearanceDraft.footerTagline} onChange={(event) => setAppearanceDraft({ ...appearanceDraft, footerTagline: event.target.value })}/></label><label className="admin-switch"><span>Show footer tagline</span><input type="checkbox" checked={appearanceDraft.showFooterTagline} onChange={(event) => setAppearanceDraft({ ...appearanceDraft, showFooterTagline: event.target.checked })}/></label></div>
          <div className="appearance-setting"><label>Footer copyright<input value={appearanceDraft.copyright} onChange={(event) => setAppearanceDraft({ ...appearanceDraft, copyright: event.target.value })}/></label><label className="admin-switch"><span>Show copyright</span><input type="checkbox" checked={appearanceDraft.showCopyright} onChange={(event) => setAppearanceDraft({ ...appearanceDraft, showCopyright: event.target.checked })}/></label></div>
          <div className="appearance-setting"><label>Page background<input type="color" value={appearanceDraft.background} onChange={(event) => setAppearanceDraft({ ...appearanceDraft, background: event.target.value })}/></label><label className="admin-switch"><span>Use custom background</span><input type="checkbox" checked={appearanceDraft.useCustomBackground} onChange={(event) => setAppearanceDraft({ ...appearanceDraft, useCustomBackground: event.target.checked })}/></label></div>
          <div className="appearance-setting"><label>Accent colour<input type="color" value={appearanceDraft.accent} onChange={(event) => setAppearanceDraft({ ...appearanceDraft, accent: event.target.value })}/></label><label className="admin-switch"><span>Use custom accent colour</span><input type="checkbox" checked={appearanceDraft.useCustomAccent} onChange={(event) => setAppearanceDraft({ ...appearanceDraft, useCustomAccent: event.target.checked })}/></label></div>
          <label className="admin-switch"><span>Show admin link in footer</span><input type="checkbox" checked={appearanceDraft.showAdminLink} onChange={(event) => setAppearanceDraft({ ...appearanceDraft, showAdminLink: event.target.checked })}/></label>
        </>}
        <button className="checkout-primary" type="submit">{isMainAdmin ? 'Save storefront settings' : 'Save store logo'}</button>
      </form></div>}      {activeSection === 'Categories' && <div className="admin-products"><div className="admin-section-heading"><div><h2>Product categories</h2><p>Add the categories customers can use to browse your store.</p></div><span>{productCategories.length} categories</span></div><form className="admin-product-form admin-category-form" onSubmit={addCategory}><label>Category name<input required maxLength="40" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="For example, Accessories"/></label><button className="checkout-primary" type="submit">Add category</button></form>{productCategories.length ? <div className="admin-category-list">{visibleCategories.map((item) => <article className={editingCategory === item ? 'is-editing' : ''} key={item}>{editingCategory === item ? <><input className="admin-category-edit-input" aria-label={`Edit ${item}`} maxLength="40" autoFocus value={editingCategoryName} onChange={(event) => setEditingCategoryName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') updateCategory(item); if (event.key === 'Escape') cancelCategoryEdit() }}/><div className="admin-category-actions"><button type="button" className="admin-category-update" onClick={() => updateCategory(item)}>Update</button><button type="button" className="admin-category-cancel" onClick={cancelCategoryEdit}>Cancel</button></div></> : <><span>{item}</span><div className="admin-category-actions"><button type="button" className="admin-category-edit-button" aria-label={`Edit ${item}`} onClick={() => startCategoryEdit(item)}><Icon name="edit" size={14}/></button><button className="delete-product" type="button" aria-label={`Remove ${item}`} onClick={() => deleteCategory(item)}><Icon name="trash" size={14}/></button></div></>}</article>)}{!visibleCategories.length && <p className="admin-intro">No categories match this search.</p>}</div> : <div className="admin-empty"><span>+</span><h2>No categories yet</h2><p>Add a category here. Storefront category filters will appear after the first category is added.</p></div>}</div>}
      {activeSection === 'Storefront banner' && <div className="admin-products"><div className="admin-section-heading"><div><h2>Storefront banner</h2><p>Upload a banner image or add a video that plays on this store’s home page.</p></div></div><form className="admin-product-form" onSubmit={saveBanner}><div className="admin-form-grid"><label>Banner image<input type="file" accept="image/*" onChange={uploadBanner}/><small>Image is resized before saving. Maximum upload size: 10 MB.</small></label><label>Banner video<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={uploadBannerVideo}/><small>At least 30 seconds long; maximum 3 MB. Video will autoplay muted and loop.</small></label><label>Or paste a video URL<input type="url" value={bannerDraft.videoUrl || ''} onChange={(event) => setBannerDraft({ ...bannerDraft, videoUrl: event.target.value, video: '', image: '' })} placeholder="https://example.com/banner.mp4"/><small>Use a direct MP4 or WebM link. Linked videos should be at least 30 seconds long.</small></label><label>Small heading<input value={bannerDraft.eyebrow} onChange={(event) => setBannerDraft({ ...bannerDraft, eyebrow: event.target.value })}/></label><label>Main heading<input value={bannerDraft.title} onChange={(event) => setBannerDraft({ ...bannerDraft, title: event.target.value })}/></label><label>Highlighted heading<input value={bannerDraft.highlight} onChange={(event) => setBannerDraft({ ...bannerDraft, highlight: event.target.value })}/></label><label>Description<textarea rows="3" value={bannerDraft.description} onChange={(event) => setBannerDraft({ ...bannerDraft, description: event.target.value })}/></label><label>Image caption<input value={bannerDraft.caption} onChange={(event) => setBannerDraft({ ...bannerDraft, caption: event.target.value })}/></label></div>{bannerDraft.image && <div className="admin-image-preview"><img src={bannerDraft.image} alt="Banner preview"/><span>Storefront banner image preview</span><button type="button" className="admin-cancel" onClick={() => setBannerDraft({ ...bannerDraft, image: '' })}>Remove image</button></div>}{(bannerDraft.video || bannerDraft.videoUrl) && <div className="admin-image-preview"><video src={bannerDraft.video || bannerDraft.videoUrl} controls muted playsInline style={{maxWidth:'100%',maxHeight:280}}/><span>Storefront banner video preview</span><button type="button" className="admin-cancel" onClick={() => setBannerDraft({ ...bannerDraft, video: '', videoUrl: '' })}>Remove video</button></div>}{bannerError && <p className="admin-upload-error" role="alert">{bannerError}</p>}<div className="admin-form-actions"><button className="checkout-primary" type="submit">Save banner</button></div></form></div>}
      {activeSection === 'Overview' && isMainAdmin && <PlatformDashboard stores={platformStores} mainOrders={mainOrders} mainProducts={mainProducts}/>}
      {activeSection === 'Overview' && !isMainAdmin && <div className="admin-overview"><p className="admin-intro">Welcome back. Here is a quick look at your store.</p><div className="admin-metrics"><article><span>Products</span><strong>{products.length}</strong><small>Items in your catalog</small></article><article><span>Advance payment</span><strong>{amount}%</strong><small>Of the order total</small></article><article><span>Payment gateway</span><strong>{paymentSettings.keyId ? 'Configured' : 'Not set up'}</strong><small>{paymentSettings.keyId ? 'Razorpay Key ID saved' : 'Add Razorpay details to begin'}</small></article></div><article className="admin-tip"><span>QUICK START</span><h2>Set up your store</h2><p>Add products, configure the payment methods customers see, then add gateway and delivery API routes. Keep all API secrets on your server.</p><button className="admin-action" onClick={() => setActiveSection('Payment integration')}>Configure payments →</button></article></div>}

      {activeSection === 'Products' && <div className="admin-products">
        <div className="admin-section-heading"><div><h2>Store catalog</h2><p>Add a product or update what is already listed.</p></div><span>{products.length} products</span></div>
        <form className="admin-product-form" onSubmit={saveProduct}>
          <h3>{editingId ? 'Edit product' : 'Add a product'}</h3>
          <div className="admin-form-grid">
            <label>Product name<input required value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} placeholder="Everyday Tote"/></label>
            <label>Category<select required className="tw:h-11 tw:w-full tw:rounded tw:border tw:border-slate-300 tw:bg-white tw:px-3 tw:text-sm" value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })}><option value="" disabled>{productCategories.length ? 'Choose a category' : 'Create a category first'}</option>{productCategories.map((category) => <option key={category} value={category}>{category}</option>)}{productForm.category && !productCategories.includes(productForm.category) && <option value={productForm.category}>{productForm.category} (current)</option>}</select></label>
            <label>Original price (INR)<input required min="0" type="number" value={productForm.regularPrice} onChange={(event) => setProductForm({ ...productForm, regularPrice: event.target.value })} placeholder="4598"/></label>
            <label>Offer price (INR) <span>(optional)</span><input min="0" max={productForm.regularPrice || undefined} type="number" value={productForm.offerPrice} onChange={(event) => setProductForm({ ...productForm, offerPrice: event.target.value })} placeholder="Leave blank if no offer"/></label>
            <label>Stock quantity <span>(leave blank for unlimited)</span><input min="0" step="1" type="number" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })} placeholder="Unlimited stock"/></label>
            <label>Maximum per order <span>(optional)</span><input min="1" step="1" type="number" value={productForm.maxPerOrder} onChange={(event) => setProductForm({ ...productForm, maxPerOrder: event.target.value })} placeholder="No limit"/></label>
            <div className="admin-variant-settings">
              <label>Size<input type="text" disabled={productForm.variantType !== 'size'} required={productForm.variantType === 'size'} value={productForm.size} onChange={(event) => setProductForm({ ...productForm, size: event.target.value })} placeholder="e.g. S, M, L"/></label>
              <button type="button" role="switch" aria-checked={productForm.variantType === 'size'} aria-label={productForm.variantType === 'size' ? 'Size on, Weight off' : 'Size off, Weight on'} className="admin-variant-switch" onClick={toggleProductVariant}><span className="admin-switch-track" aria-hidden="true"><i/></span></button>
              <label>Weight<input type="text" disabled={productForm.variantType !== 'weight'} required={productForm.variantType === 'weight'} value={productForm.weight} onChange={(event) => setProductForm({ ...productForm, weight: event.target.value })} placeholder="e.g. 250 g, 1 kg"/></label>
            </div>
            <label>Color / details<input required value={productForm.color} onChange={(event) => setProductForm({ ...productForm, color: event.target.value })} placeholder="Sand"/></label>
            <label>Image file<input type="file" accept="image/*" onChange={uploadProductImage}/><small>Choose an image up to 10 MB. It will be resized before saving.</small></label>
          </div>
          {productForm.image && <div className="admin-image-preview"><img src={photo(productForm.image)} alt="Selected product preview"/><span>Product image preview</span></div>}
          {uploadError && <p className="admin-upload-error" role="alert">{uploadError}</p>}
          <div className="admin-form-actions"><button className="checkout-primary" type="submit" disabled={!productForm.image}>{editingId ? 'Save product' : 'Add product'}</button>{editingId && <button className="admin-cancel" type="button" onClick={() => { setEditingId(null); setProductForm(emptyProduct) }}>Cancel</button>}</div>
        </form>
        <div className="admin-product-list admin-product-list-scroll tw:admin:hidden!">{visibleProducts.map((product) => <article className="admin-product-row" key={product.id}><img src={photo(product.image)} alt=""/><div><button type="button" className="admin-product-name-link" onClick={() => setSelectedProduct(product)}>{product.name}</button><small>{product.category} | {product.color}{product.size ? ` | Size: ${product.size}` : product.weight ? ` | Weight: ${product.weight}` : ''} | Stock: {product.stock ?? product.quantity ?? 'untracked'} | Max/order: {product.maxPerOrder ?? 'no limit'}</small></div><b className="admin-product-prices">{product.oldPrice && <del>{formatINR(product.oldPrice)}</del>}{formatINR(product.price)}</b><button type="button" onClick={() => editProduct(product)}>Edit</button><button type="button" className="delete-product" onClick={() => deleteProduct(product.id)} aria-label={`Delete ${product.name}`}><Icon name="trash" size={14}/></button></article>)}</div>
        {visibleProducts.length > 0 && <div className="admin-product-table-scroll tw:hidden tw:admin:block! tw:overflow-x-auto tw:rounded-xl tw:border tw:border-slate-200 tw:bg-white tw:shadow-sm"><table className="tw:w-full tw:min-w-237.5 tw:border-collapse tw:text-left"><thead className="tw:bg-slate-50 tw:text-slate-600"><tr>{['SI', 'Name', 'Category', 'Quantity', 'Store', 'Price', 'Status', 'Action'].map((heading) => <th key={heading} className="tw:border-b tw:border-slate-200 tw:px-3 tw:py-3 tw:text-[11px] tw:font-medium tw:tracking-wide">{heading}</th>)}</tr></thead><tbody>{visibleProducts.map((product, index) => <tr key={product.id} className="tw:border-b tw:border-slate-100 tw:last:border-b-0 tw:hover:bg-slate-50/70"><td className="tw:px-3 tw:py-4 tw:text-xs tw:text-slate-500">{productStart + index + 1}</td><td className="tw:px-3 tw:py-4"><div className="tw:flex tw:min-w-52.5 tw:items-center tw:gap-3"><img className="tw:h-12 tw:w-12 tw:shrink-0 tw:rounded tw:border tw:border-slate-100 tw:bg-slate-50 tw:object-cover" src={photo(product.image)} alt=""/><button type="button" className="admin-product-table-name tw:max-w-52.5 tw:truncate tw:text-xs tw:font-semibold tw:text-slate-900" onClick={() => setSelectedProduct(product)}>{product.name}</button></div></td><td className="tw:max-w-47.5 tw:truncate tw:px-3 tw:py-4 tw:text-xs tw:text-slate-600">{product.category || '—'}</td><td className="tw:px-3 tw:py-4 tw:text-xs tw:font-medium tw:text-slate-800">{product.stock ?? product.quantity ?? '—'}<small className="tw:block tw:pt-1 tw:text-[10px] tw:font-normal tw:text-slate-500">Max/order: {product.maxPerOrder ?? 'no limit'}</small></td><td className="tw:max-w-45 tw:truncate tw:px-3 tw:py-4 tw:text-xs tw:text-sky-700">{storeName || 'Main store'}</td><td className="tw:px-3 tw:py-4 tw:text-xs tw:font-medium tw:text-slate-800">{formatINR(product.price)}</td><td className="tw:px-3 tw:py-4"><span className={product.status === 'inactive' ? 'tw:rounded-full tw:bg-slate-100 tw:px-2.5 tw:py-1 tw:text-[10px] tw:font-medium tw:text-slate-500' : 'tw:rounded-full tw:bg-emerald-50 tw:px-2.5 tw:py-1 tw:text-[10px] tw:font-medium tw:text-emerald-700'}>{product.status === 'inactive' ? 'Inactive' : 'Active'}</span></td><td className="tw:px-3 tw:py-4"><div className="tw:flex tw:items-center tw:gap-2"><button type="button" onClick={() => editProduct(product)} className="tw:grid tw:h-8 tw:w-8 tw:place-items-center tw:rounded-md tw:border tw:border-blue-200 tw:bg-white tw:text-sm tw:text-blue-700 tw:hover:bg-blue-50" aria-label={`Edit ${product.name}`}><Icon name="edit" size={14}/></button><button type="button" onClick={() => deleteProduct(product.id)} className="tw:grid tw:h-8 tw:w-8 tw:place-items-center tw:rounded-md tw:tw:rounded-md tw:border tw:border-rose-200 tw:bg-white tw:text-sm tw:text-rose-600 tw:hover:bg-rose-50" aria-label={`Delete ${product.name}`}><Icon name="trash" size={14}/></button></div></td></tr>)}</tbody></table></div>}
        {filteredProducts.length > 0 && <nav className="tw:flex tw:flex-col tw:gap-3 tw:border-t tw:border-slate-200 tw:pt-4 tw:admin:flex-row tw:admin:items-center tw:admin:justify-between" aria-label="Product pagination"><span className="tw:text-xs tw:text-slate-600">Showing {productStart + 1}-{Math.min(productStart + productPageSize, filteredProducts.length)} of {filteredProducts.length}</span><div className="tw:grid tw:grid-cols-3 tw:items-center tw:gap-2"><button type="button" disabled={currentProductPage === 1} onClick={() => setProductPage((page) => Math.max(1, page - 1))} className="tw:inline-flex tw:min-h-10 tw:items-center tw:justify-center tw:gap-2 tw:rounded tw:border tw:border-slate-300 tw:bg-white tw:px-3 tw:text-xs tw:font-medium tw:text-slate-700 tw:hover:bg-slate-50 tw:disabled:cursor-not-allowed tw:disabled:opacity-40"><span className="tw:rotate-180"><Icon name="arrow" size={14}/></span>Previous</button><span className="tw:whitespace-nowrap tw:text-center tw:text-xs tw:text-slate-600">Page {currentProductPage} of {productPageCount}</span><button type="button" disabled={currentProductPage === productPageCount} onClick={() => setProductPage((page) => Math.min(productPageCount, page + 1))} className="tw:inline-flex tw:min-h-10 tw:items-center tw:justify-center tw:gap-2 tw:rounded tw:border tw:border-slate-300 tw:bg-white tw:px-3 tw:text-xs tw:font-medium tw:text-slate-700 tw:hover:bg-slate-50 tw:disabled:cursor-not-allowed tw:disabled:opacity-40">Next<Icon name="arrow" size={14}/></button></div></nav>}
        {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onEdit={() => { editProduct(selectedProduct); setSelectedProduct(null) }}/ >}
      </div>}

      {activeSection === 'Orders' && <OrderManagement orders={isMainAdmin ? mainOrders : orders} isMainAdmin={isMainAdmin} searchTerm={adminSearchQuery} onUpdateStatus={onUpdateOrderStatus} upiId={savedUpiId}/>}

      {activeSection === 'Payment setup' && <div className="admin-payment"><div className="admin-section-heading"><div><h2>Payment setup</h2><p>Set the advance percentage and choose which options customers see.</p></div></div><form className="admin-payment-form" onSubmit={savePayment}><label>Advance payment (%)<div className="percent-input-wrap"><input type="number" min="0" max="100" step="1" value={draftAmount} onWheel={(event) => event.currentTarget.blur()} onChange={(event) => setDraftAmount(event.target.value)}/><span>%</span></div><small>Leave blank or enter 0 if advance payment is not needed; the rest is due on delivery.</small></label><fieldset className="admin-methods"><legend>Payment options shown at checkout</legend><label><input type="checkbox" checked={methods.cod} onChange={(event) => setMethods({ ...methods, cod: event.target.checked })}/><span><strong>Cash on delivery</strong><small>Customer pays when the order arrives.</small></span></label><label><input type="checkbox" checked={methods.advance} onChange={(event) => setMethods({ ...methods, advance: event.target.checked })}/><span><strong>Pay advance via Razorpay</strong><small>Uses the percentage above; balance is due on delivery.</small></span></label><label><input type="checkbox" checked={methods.online} onChange={(event) => setMethods({ ...methods, online: event.target.checked })}/><span><strong>Pay full amount online</strong><small>Customer pays the full order total online.</small></span></label></fieldset>{paymentError && <p className="admin-upload-error" role="alert">{paymentError}</p>}<button className="checkout-primary" type="submit">Save payment setup</button></form></div>}

      {activeSection === 'Payment integration' && <div className="admin-payment"><div className="admin-section-heading"><div><h2>Payment gateway integration</h2><p>Connect Razorpay separately from checkout payment choices.</p></div></div><form className="admin-payment-form" onSubmit={savePaymentIntegration}><label>Store UPI ID for delivery balance QR<input autoComplete="off" value={upiId} onChange={(event) => setUpiId(event.target.value)} placeholder="store@upi"/><small>Used to create an amount-specific UPI QR when an order is marked delivered.</small></label><label>Razorpay Key ID<input autoComplete="off" value={keyId} onChange={(event) => setKeyId(event.target.value)} placeholder="rzp_test_…"/></label><label>Create order API URL<input value={createOrderUrl} onChange={(event) => setCreateOrderUrl(event.target.value)} placeholder="/api/payments/razorpay/order"/></label><label>Verify payment API URL<input value={verifyPaymentUrl} onChange={(event) => setVerifyPaymentUrl(event.target.value)} placeholder="/api/payments/razorpay/verify"/></label><div className="admin-security-note"><strong>Keep your account secure</strong><p>Keep the Razorpay Key Secret on your server. The order API must calculate the total and create a Razorpay order. The verify API must check the payment signature and return <code>{'{ "verified": true }'}</code> only when valid.</p></div><button className="checkout-primary" type="submit">Save payment integration</button></form></div>}

      {activeSection === 'Delivery zones' && !isMainAdmin && <DeliveryZones zones={appearance.deliveryZones || []} onSave={(zones) => { const next = { ...appearanceDraft, deliveryZones: zones }; setAppearanceDraft(next); onSaveAppearance(next); setSavedMessage('Delivery zones saved.'); window.setTimeout(() => setSavedMessage(''), 2500) }}/>}
      {activeSection === 'Delivery partners' && <div className="admin-payment"><div className="admin-section-heading"><div><h2>Delivery partner integration</h2><p>Enable delivery options and choose which payment methods they accept.</p></div></div><form className="admin-payment-form" onSubmit={saveDelivery}>{[['shadowfax', 'Shadowfax'], ['porter', 'Porter'], ['ownRider', 'Own rider']].filter(([key]) => key !== 'ownRider' || owner?.permissions?.riders !== false).map(([key, title]) => <fieldset className="admin-delivery-provider" key={key}><legend><label><input type="checkbox" checked={deliveryProviders[key].enabled} onChange={(event) => updateDeliveryProvider(key, { enabled: event.target.checked })}/>{title}</label></legend><fieldset className="admin-methods admin-delivery-methods"><legend>Payment methods allowed</legend>{[['cod', 'Cash on delivery'], ['advance', 'Advance payment'], ['online', 'Full online payment']].map(([method, label]) => <label key={method}><input type="checkbox" checked={deliveryProviders[key].paymentMethods[method]} onChange={(event) => updateDeliveryProvider(key, { paymentMethods: { ...deliveryProviders[key].paymentMethods, [method]: event.target.checked } })}/><span><strong>{label}</strong></span></label>)}</fieldset>{key !== 'ownRider' && <><label>Get delivery quote API URL<input value={deliveryProviders[key].quoteUrl} onChange={(event) => updateDeliveryProvider(key, { quoteUrl: event.target.value })} placeholder={`/api/delivery/${key}/quote`}/></label><label>Create delivery / assign rider API URL<input value={deliveryProviders[key].bookingUrl} onChange={(event) => updateDeliveryProvider(key, { bookingUrl: event.target.value })} placeholder={`/api/delivery/${key}/book`}/></label><label>Track delivery API URL<input value={deliveryProviders[key].trackingUrl} onChange={(event) => updateDeliveryProvider(key, { trackingUrl: event.target.value })} placeholder={`/api/delivery/${key}/track`}/></label></>}</fieldset>)}<div className="admin-security-note"><strong>Delivery API credentials</strong><p>Shadowfax and Porter credentials must stay on the server. Own rider is managed manually and does not use API integration.</p></div><button className="checkout-primary" type="submit">Save delivery settings</button></form>{deliveryMessage && <div className="admin-saved-message" role="status">✓ {deliveryMessage}</div>}</div>}
      {isMainAdmin && activeSection === 'Subscriptions' && <div className="admin-payment"><div className="admin-section-heading"><div><h2>Store subscription</h2><p>Set the monthly fee new stores pay when they sign up.</p></div></div><form className="admin-payment-form" onSubmit={saveSubscription}><label>Monthly subscription price (INR)<input required min="1" step="1" type="number" value={draftSubscriptionAmount} onChange={(event) => setDraftSubscriptionAmount(event.target.value)}/><small>Current subscription price: {formatINR(subscriptionAmount)} per month.</small></label><div className="admin-security-note"><strong>Platform payment gateway</strong><p>This subscription uses the platform's payment account. Store owners configure their own checkout gateway separately. The platform payment and price must also be configured on the server before live charges can be taken.</p></div><button className="checkout-primary" type="submit">Save subscription price</button></form></div>}
      {isMainAdmin && activeSection === 'Subscriptions' && <div className="admin-payment admin-plan-settings"><div className="admin-section-heading"><div><h2>Recharge plans</h2><p>Add any number of months or years. Enabled prices appear on vendor signup.</p></div></div><form className="admin-payment-form" onSubmit={savePlans}>{planDraft.map((plan, index) => <div className="admin-plan-edit-row" key={plan.id}><label className="admin-plan-duration"><input type="checkbox" checked={plan.enabled} onChange={(event) => setPlanDraft(planDraft.map((item, i) => i === index ? { ...item, enabled: event.target.checked } : item))}/><input aria-label="Plan duration" type="number" min="1" step="1" value={plan.duration || 1} onChange={(event) => setPlanDraft(planDraft.map((item, i) => i === index ? { ...item, duration: event.target.value } : item))}/><select aria-label="Duration unit" value={plan.unit || 'month'} onChange={(event) => setPlanDraft(planDraft.map((item, i) => i === index ? { ...item, unit: event.target.value } : item))}><option value="month">Month(s)</option><option value="year">Year(s)</option></select><span>{plan.duration || 1} {(plan.unit || 'month')}{Number(plan.duration || 1) === 1 ? '' : 's'}</span></label><label>Price (INR)<input type="number" min="0" step="1" value={plan.price} onChange={(event) => setPlanDraft(planDraft.map((item, i) => i === index ? { ...item, price: event.target.value } : item))}/></label><button type="button" className="delete-product" aria-label="Remove subscription duration" onClick={() => setPlanDraft(planDraft.filter((_, i) => i !== index))}>&times;</button></div>)}<button type="button" className="admin-cancel admin-add-plan" onClick={() => setPlanDraft([...planDraft, { id: `custom-${Date.now()}`, label: '2 months', unit: 'month', duration: 2, months: 2, price: 0, enabled: true }])}>+ Add duration</button><div className="admin-security-note"><strong>Payment verification</strong><p>Recharge only activates after the platform server verifies payment and returns the updated expiry date.</p></div><button className="checkout-primary" type="submit">Save recharge plans</button></form></div>}
      {isMainAdmin && activeSection === 'Storage subscriptions' && <div className="admin-payment"><div className="admin-section-heading"><div><h2>Storage subscriptions</h2><p>Set each store’s storage allowance and the price store owners pay for extra space.</p></div></div><form className="admin-payment-form" onSubmit={saveStorageConfig}><label>Choose store<select required value={storageStoreId} onChange={(event) => chooseStorageStore(event.target.value)}><option value="">Choose a store</option>{platformStores.map((store) => <option key={store.storeId} value={store.storeId}>{store.storeName} · /{store.subdomain}</option>)}</select></label>{platformStores.map((store) => <article className="admin-storage-row" key={store.storeId}><div><strong>{store.storeName}</strong><small>/{store.subdomain} · {formatStorageSize(store.storageUsedBytes)} used of {store.storage?.limitGb || 1} GB</small></div>{store.storeId === storageStoreId && <label>Storage limit (GB)<input required type="number" min="1" step="1" value={storageLimitDraft} onChange={(event) => setStorageLimitDraft(event.target.value)}/></label>}</article>)}<label>Extra storage price per GB (INR)<input required type="number" min="0" step="1" value={storagePriceDraft} onChange={(event) => setStoragePriceDraft(event.target.value)}/></label><div className="admin-security-note"><strong>Platform payment verification</strong><p>Extra storage activates only after the platform server verifies payment. Configure <code>POST /api/platform/storage/purchase</code> before accepting live purchases.</p></div><button className="checkout-primary" type="submit" disabled={!storageStoreId}>Save storage settings</button></form></div>}
    </div>
  </section>
}






