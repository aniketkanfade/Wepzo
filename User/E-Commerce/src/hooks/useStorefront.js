import { useCallback, useEffect, useMemo, useState } from 'react'
import { ADMIN_PREVIEW, BUILDER_PREVIEW, imageOf, request, storageKey, WEBSITE_ID } from '../lib/storefront'

export default function useStorefront() {
  const [home, setHome] = useState(null)
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
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem(storageKey('wepzo-favorites')) || '[]'))
  const [cartOpen, setCartOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [locationOpen, setLocationOpen] = useState(false)
  const [location, setLocation] = useState(() => JSON.parse(localStorage.getItem(storageKey('wepzo-location')) || '{"pincode":""}'))
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [customer, setCustomer] = useState(() => JSON.parse(localStorage.getItem(storageKey('wepzo-shop-customer')) || 'null'))
  const [message, setMessage] = useState('')
  const [checkout, setCheckout] = useState(false)
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [quote, setQuote] = useState(null)
  const [cookieAccepted, setCookieAccepted] = useState(() => localStorage.getItem(storageKey('wepzo-cookie-consent')) === 'accepted')

  const business = home?.business || {}
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
    if (location.pincode || !home?.pincode) return
    const next = { ...location, city: home.city || '', pincode: home.pincode }
    setLocation(next)
    localStorage.setItem(storageKey('wepzo-location'), JSON.stringify(next))
  }, [home?.city, home?.pincode, location])
  useEffect(() => {
    document.title = business.businessName || 'Wepzo Store'
    let icon = document.querySelector('link[rel~="icon"]')
    if (!icon) {
      icon = document.createElement('link')
      icon.rel = 'icon'
      document.head.appendChild(icon)
    }
    icon.href = business.favicon ? imageOf({ image: business.favicon }) : '/favicon.ico'
  }, [business.businessName, business.favicon])
  useEffect(() => { if (customer?.phone) setPhone(customer.phone) }, [customer])

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
  const cartItem = id => cart.find(item => item.id === id)

  const changeQty = (product, amount) => setCart(current => {
    const productId = product._id || product.id
    const found = current.find(item => item.id === productId)
    if (!found && amount > 0) return [...current, {
      id: productId,
      name: product.name,
      image: imageOf(product),
      price: Number(product.price || product.salePrice || 0),
      qty: 1,
    }]
    return current.map(item => item.id === productId ? { ...item, qty: item.qty + amount } : item).filter(item => item.qty > 0)
  })

  const toggleFavorite = product => {
    const id = product._id || product.id
    setFavorites(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  const calculateQuote = async () => {
    try {
      const result = await request('/shop/quote', {
        method: 'POST',
        body: JSON.stringify({ items: cart.map(item => ({ id: item.id, qty: item.qty })), lat: location.lat, lng: location.lng, pincode: location.pincode }),
      })
      setQuote(result)
      setMessage(result.message || '')
    } catch (quoteError) {
      setMessage(quoteError.message)
    }
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
    } catch (authError) {
      setMessage(authError.message)
    } finally {
      setBusy(false)
    }
  }

  const signOut = () => {
    localStorage.removeItem(storageKey('wepzo-shop-token'))
    localStorage.removeItem(storageKey('wepzo-shop-customer'))
    setCustomer(null)
    setMessage('You have been signed out.')
  }

  const placeOrder = async () => {
    if (!customer) {
      setAuthOpen(true)
      return
    }
    if (!address.trim() || !phone.trim()) {
      setMessage('Add your delivery address and phone number.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const order = await request('/shop/orders', {
        method: 'POST',
        body: JSON.stringify({ items: cart.map(item => ({ id: item.id, qty: item.qty })), address, phone, lat: location.lat || null, lng: location.lng || null, pincode: location.pincode, payment: 'COD' }),
      })
      setCart([])
      setCheckout(false)
      setCartOpen(false)
      setMessage(`Order ${order.orderNo || order.orderId} placed successfully.`)
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
    cart, setCart, favorites, setFavorites, cartOpen, setCartOpen, selected, setSelected,
    locationOpen, setLocationOpen, location, setLocation, authOpen, setAuthOpen, authMode, setAuthMode,
    customer, message, setMessage, checkout, setCheckout, address, setAddress, phone, setPhone,
    busy, quote, setQuote, cookieAccepted, setCookieAccepted, categories, modules, shown, deals,
    bestsellers, heroBanner, categoryProduct, count, subtotal, cartItem, changeQty, toggleFavorite,
    calculateQuote, submitAuth, placeOrder, signOut,
  }
}
