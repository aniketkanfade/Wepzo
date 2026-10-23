const params = new URLSearchParams(window.location.search)

export const API = '/api'
export const BUILDER_PREVIEW = params.get('builderPreview') === '1'
export const ADMIN_PREVIEW = params.get('adminPreview') === '1'
export const WEBSITE_ID = (params.get('websiteId') || import.meta.env.VITE_WEBSITE_ID) || ''
export const WEBSITE_MODULE_ID = (params.get('websiteModuleId') || params.get('moduleId') || import.meta.env.VITE_WEBSITE_MODULE_ID) || ''

// Earlier storefront versions kept shopper data in browser storage. Remove only
// those old, namespaced E-Commerce keys; the active shopper state now comes from
// the server and the server session cookie must remain intact.
const LEGACY_STOREFRONT_STORAGE_KEYS = [
  'wepzo-cart',
  'wepzo-favorites',
  'wepzo-location',
  'wepzo-shop-customer',
  'wepzo-shop-token',
  'wepzo-pending-payment-order',
  'wepzo-cookie-consent',
  'wepzo-delivery-address',
]

try {
  const legacyKeys = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (key && LEGACY_STOREFRONT_STORAGE_KEYS.some(prefix => key === prefix || key.startsWith(`${prefix}:`))) {
      legacyKeys.push(key)
    }
  }
  legacyKeys.forEach(key => window.localStorage.removeItem(key))
} catch {
  // Storage can be unavailable in private or restricted browser contexts.
}

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

const getRetryDelays = [1000, 2000, 4000, 8000]

export async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Website-Module': 'e-commerce',
    // The API is reverse-proxied on Vercel. Send the browser's original host
    // explicitly so the backend can resolve the correct published tenant.
    'X-Website-Host': window.location.host,
    ...(ADMIN_PREVIEW ? { 'X-Admin-Preview': '1' } : {}),
    ...(WEBSITE_ID ? { 'X-Website-Id': WEBSITE_ID } : {}),
    ...(WEBSITE_MODULE_ID ? { 'X-Website-Module-Id': WEBSITE_MODULE_ID } : {}),
    ...(options.headers || {}),
  }
  const method = String(options.method || 'GET').toUpperCase()
  let response
  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await fetch(`${API}${path}`, { ...options, headers, credentials: 'include' })
    } catch (error) {
      if (method !== 'GET' || attempt >= getRetryDelays.length) throw error
      await new Promise(resolve => window.setTimeout(resolve, getRetryDelays[attempt]))
      continue
    }
    if (method !== 'GET' || ![502, 503, 504].includes(response.status) || attempt >= getRetryDelays.length) break
    await new Promise(resolve => window.setTimeout(resolve, getRetryDelays[attempt]))
  }
  const responseText = await response.text()
  let data = {}
  let invalidJson = false
  try {
    data = responseText ? JSON.parse(responseText) : {}
  } catch {
    invalidJson = true
  }
  if (!response.ok) {
    if (invalidJson) throw new Error(`Request failed (${response.status} ${response.statusText}).`)
    const detail = data.message || responseText.trim().slice(0, 180)
    const error = new Error(detail || `Request failed (${response.status} ${response.statusText}).`)
    error.status = response.status
    throw error
  }
  if (invalidJson) {
    throw new Error(`The API returned an invalid response for ${path}. Check that the backend is running and the API proxy is configured.`)
  }
  return data
}
