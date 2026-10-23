const params = new URLSearchParams(window.location.search)

export const API = '/api'
export const BUILDER_PREVIEW = params.get('builderPreview') === '1'

// Keep tenant identity in memory, as Quick Commerce does. This preserves the
// website context through client-side navigation without browser storage.
let websiteContext = null

function currentWebsiteContext() {
  const currentParams = new URLSearchParams(window.location.search)
  const explicitWebsiteId = currentParams.get('websiteId') || ''
  const explicitModuleId = currentParams.get('websiteModuleId') || currentParams.get('moduleId') || ''
  const adminPreview = currentParams.get('adminPreview') === '1'

  if (explicitWebsiteId) {
    const isSameWebsite = String(websiteContext?.websiteId || '') === String(explicitWebsiteId)
    websiteContext = {
      websiteId: explicitWebsiteId,
      websiteModuleId: explicitModuleId || (isSameWebsite ? websiteContext?.websiteModuleId : '') || '',
    }
  }

  return {
    adminPreview,
    websiteId: explicitWebsiteId || (!adminPreview ? websiteContext?.websiteId || import.meta.env.VITE_WEBSITE_ID || '' : ''),
    websiteModuleId: explicitModuleId || (!adminPreview ? websiteContext?.websiteModuleId || import.meta.env.VITE_WEBSITE_MODULE_ID || '' : ''),
  }
}

export const getWebsiteId = () => currentWebsiteContext().websiteId

function currentWebsiteHost(context) {
  if (context.websiteId) return window.location.host

  const configuredHost = String(import.meta.env.VITE_WEBSITE_HOST || '').trim()
  if (configuredHost) return configuredHost

  const isLocalDevelopmentHost = import.meta.env.DEV
    && ['localhost', '127.0.0.1'].includes(window.location.hostname)
  return isLocalDevelopmentHost ? 'wepzo.in' : window.location.host
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

export async function request(path, options = {}, retryAfterWebsiteSessionReset = true) {
  const context = currentWebsiteContext()
  const headers = {
    'Content-Type': 'application/json',
    'X-Website-Module': 'e-commerce',
    // The API is reverse-proxied. Pass the site domain through explicitly;
    // local development uses the main storefront domain unless a tenant ID is set.
    'X-Website-Host': currentWebsiteHost(context),
    ...(context.adminPreview ? { 'X-Admin-Preview': '1' } : {}),
    ...(context.websiteId ? { 'X-Website-Id': context.websiteId } : {}),
    ...(context.websiteModuleId ? { 'X-Website-Module-Id': context.websiteModuleId } : {}),
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
    if (method === 'GET'
      && retryAfterWebsiteSessionReset
      && ['WRONG_WEBSITE', 'WRONG_WEBSITE_MODULE'].includes(data.code)) {
      const logoutResponse = await fetch(`${API}/shop/auth/logout`, {
        method: 'POST',
        headers,
        credentials: 'include',
      })
      if (logoutResponse.ok) return request(path, options, false)
    }
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
