const params = new URLSearchParams(window.location.search)

export const API = (import.meta.env.VITE_E_COMMERCE_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')
export const BUILDER_PREVIEW = params.get('builderPreview') === '1'
export const ADMIN_PREVIEW = params.get('adminPreview') === '1'
export const WEBSITE_ID = import.meta.env.VITE_WEBSITE_ID || params.get('websiteId') || ''
export const WEBSITE_MODULE_ID = import.meta.env.VITE_WEBSITE_MODULE_ID || params.get('moduleId') || ''

export const storageKey = key => `${key}:${WEBSITE_ID || window.location.hostname}`

export const KNOWN_COMPONENTS = new Set([
  'logo', 'quick-commerce-header', 'quick-commerce-location', 'quick-commerce-search', 'quick-commerce-categories',
  'quick-commerce-favorites', 'quick-commerce-cart', 'quick-commerce-profile', 'quick-commerce-offer-banner',
  'quick-commerce-category-tiles', 'quick-commerce-nearby-stores', 'quick-commerce-product-grid', 'quick-commerce-flash-deals',
  'quick-commerce-brand-section', 'quick-commerce-product-listing', 'quick-commerce-product-details', 'quick-commerce-cart-page',
  'quick-commerce-checkout', 'quick-commerce-order-tracking', 'quick-commerce-account', 'quick-commerce-wishlist', 'quick-commerce-footer',
])

export const COMPONENT_TYPES = new Set([
  'header', 'logo', 'search', 'location', 'navbar', 'categories', 'category_tiles', 'hero', 'banner', 'stores', 'brands',
  'flash_deals', 'product_grid', 'product_listing', 'product_details', 'favorites', 'cart', 'cart_page', 'checkout', 'profile',
  'account', 'wishlist', 'order_tracking', 'footer',
])

export const money = (value, business = {}) => {
  const configuredSymbol = String(business.currencySymbol || '').trim()
  const symbol = /[\u00C3\u00C2\u00E2\u00EF\uFFFD]/.test(configuredSymbol) ? '₹' : configuredSymbol || '₹'
  const digits = Math.max(0, Math.min(4, Number(business.decimalDigits) || 0))
  const amount = Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return business.currencyPosition === 'right' ? `${amount} ${symbol}` : `${symbol}${amount}`
}

const assetSource = value => {
  if (typeof value === 'string') {
    const source = value.trim()
    if (source.length > 100 && /^[A-Za-z0-9+/]+={0,2}$/.test(source)) return `data:image/png;base64,${source}`
    return source
  }
  if (!value || typeof value !== 'object') return ''
  for (const key of ['url', 'src', 'path', 'filePath', 'fileUrl', 'previewUrl', 'originalUrl', 'location', 'publicUrl', 'secure_url', 'dataUrl', 'base64', 'image', 'imageUrl', 'thumbnail', 'logo']) {
    if (value[key] && value[key] !== value) return assetSource(value[key])
  }
  return ''
}

export const assetUrl = value => {
  const source = assetSource(value)
  if (!source || /^(https?:|data:|blob:)/i.test(source) || source.startsWith('//')) return source
  const origin = API.replace(/\/api\/?$/, '')
  return origin + (source.startsWith('/') ? source : `/${source}`)
}

export const imageOf = item => {
  const mediaType = String(item?.mediaType || item?.mimeType || item?.type || '').toLowerCase()
  const uploadedImage = mediaType.includes('image') ? item?.media || item?.mediaUrl || item?.asset : ''
  return assetUrl(item?.image || item?.imageUrl || item?.thumbnail || item?.logo || uploadedImage || item)
}

export const videoOf = item => {
  const mediaType = String(item?.mediaType || item?.mimeType || item?.type || '').toLowerCase()
  const source = item?.video || item?.videoUrl || item?.video_url || item?.videoSrc
    || (mediaType.includes('video') ? item?.media || item?.asset || item?.src || item?.url : '')
  return assetUrl(source)
}

export async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Website-Module': 'e-commerce',
    ...(WEBSITE_ID ? { 'X-Website-Id': WEBSITE_ID } : {}),
    ...(WEBSITE_MODULE_ID ? { 'X-Website-Module-Id': WEBSITE_MODULE_ID } : {}),
    ...(options.headers || {}),
  }
  const token = localStorage.getItem(storageKey('wepzo-shop-token'))
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API}${path}`, { ...options, headers })
  const responseText = await response.text()
  let data = {}
  try {
    data = responseText ? JSON.parse(responseText) : {}
  } catch {
    data = {}
  }
  if (!response.ok) {
    const detail = data.message || responseText.trim().slice(0, 180)
    throw new Error(detail || `Request failed (${response.status} ${response.statusText}).`)
  }
  return data
}
