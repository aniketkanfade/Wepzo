const params = new URLSearchParams(window.location.search)

export const WEBSITE_ID = (params.get('adminPreview') === '1'
  ? params.get('websiteId')
  : params.get('websiteId') || import.meta.env.VITE_WEBSITE_ID) || ''
export const MODULE_ID = (params.get('adminPreview') === '1'
  ? params.get('moduleId')
  : params.get('websiteModuleId') || params.get('moduleId') || import.meta.env.VITE_WEBSITE_MODULE_ID) || ''
export const BUILDER_PREVIEW = params.get('builderPreview') === '1'
export const ADMIN_PREVIEW = params.get('adminPreview') === '1'
export const API = '/api'

export async function request(path, { method = 'GET', body } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Website-Module': 'store-single',
    ...(WEBSITE_ID ? { 'X-Website-Id': WEBSITE_ID } : {}),
    ...(MODULE_ID ? { 'X-Website-Module-Id': MODULE_ID } : {}),
    ...(ADMIN_PREVIEW ? { 'X-Admin-Preview': '1' } : {}),
  }
  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    credentials: 'include',
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await response.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error('The storefront server returned an invalid response.')
  }
  if (!response.ok) {
    const error = new Error(data.message || `Storefront request failed (${response.status}).`)
    error.status = response.status
    throw error
  }
  return data
}

export function assetUrl(value) {
  const source = String(value || '').trim()
  if (!source || /^(https?:|data:|blob:)/i.test(source) || source.startsWith('//')) return source
  const origin = API.replace(/\/api\/?$/, '')
  return `${origin}${source.startsWith('/') ? source : `/${source}`}`
}
