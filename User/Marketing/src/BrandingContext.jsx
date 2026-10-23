import React, { createContext, useContext, useEffect, useState } from 'react'
import { mergeMarketingSiteContent } from './siteDefaults.js'

const BrandingContext = createContext({ businessName: 'Wepzo', businessLogo: '', primaryColor: '', themeColors: {} })
const API = '/api'
const routeQuery = window.location.hash.includes('?') ? window.location.hash.slice(window.location.hash.indexOf('?') + 1) : ''
const params = new URLSearchParams(`${window.location.search.replace(/^\?/, '')}&${routeQuery}`)
const explicitWebsiteId = params.get('websiteId') || params.get('tenantId') || import.meta.env.VITE_WEBSITE_ID || ''
const moduleId = params.get('websiteModuleId') || params.get('moduleId') || import.meta.env.VITE_WEBSITE_MODULE_ID || ''
const builderPreview = params.get('builderPreview') === '1'
const MARKETING_TOKEN_KEY = 'wepzo_marketing_session_token'

export function clearMarketingSession() {
  window.sessionStorage.removeItem(MARKETING_TOKEN_KEY)
}

export async function marketingRequest(path, options = {}) {
  const sessionToken = window.sessionStorage.getItem(MARKETING_TOKEN_KEY)
  const headers = {
    'Content-Type': 'application/json',
    'X-Website-Module': 'marketing',
    ...(explicitWebsiteId ? { 'X-Website-Id': explicitWebsiteId } : {}),
    ...(moduleId ? { 'X-Website-Module-Id': moduleId } : {}),
    ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    ...(options.headers || {}),
  }
  const response = await fetch(`${API}${path}`, { ...options, headers, credentials: 'include', cache: options.cache || 'no-store' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed. Please try again.')
    error.status = response.status
    throw error
  }
  return data
}

// Public website data resolves its tenant from this site's URL/host.
export async function marketingPublicRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Website-Module': 'marketing',
    ...(explicitWebsiteId ? { 'X-Website-Id': explicitWebsiteId } : {}),
    ...(moduleId ? { 'X-Website-Module-Id': moduleId } : {}),
    ...(options.headers || {}),
  }
  const response = await fetch(`${API}${path}`, { ...options, headers, credentials: 'include', cache: options.cache || 'no-store' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Request failed. Please try again.')
  return data
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({ businessName: 'Wepzo', businessLogo: '', primaryColor: '', themeColors: {}, siteContent: mergeMarketingSiteContent() })

  useEffect(() => {
    if (!builderPreview) return undefined
    const receivePreview = event => {
      if (event.source !== window.parent || event.data?.type !== 'wepzo:builder-preview') return
      const theme = event.data.theme
      if (!theme || typeof theme !== 'object') return
      setBranding(current => ({
        ...current,
        primaryColor: theme.primaryColor || current.primaryColor,
        themeColors: { ...current.themeColors, ...(theme.themeColors || {}) },
      }))
    }
    window.addEventListener('message', receivePreview)
    return () => window.removeEventListener('message', receivePreview)
  }, [])

  useEffect(() => {
    let active = true
    const headers = { 'X-Website-Module': 'marketing', ...(explicitWebsiteId ? { 'X-Website-Id': explicitWebsiteId } : {}), ...(moduleId ? { 'X-Website-Module-Id': moduleId } : {}) }
    fetch(`${API}/shop/home`, { headers, credentials: 'include' })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (active && data?.business) setBranding(current => ({
          ...current,
          businessName: current.siteContent?.brand?.name || data.business.businessName || 'Wepzo',
          businessLogo: current.siteContent?.brand?.logo || data.business.businessLogo || '',
          primaryColor: data.business.primaryColor || current.primaryColor || '',
          themeColors: data.business.themeColors || current.themeColors || {},
        }))
      })
      .catch(() => {})
    const refreshSiteContent = () => marketingPublicRequest('/marketing/public/site-content')
      .then(data => { if (active) setBranding(current => {
        const siteContent = mergeMarketingSiteContent(data?.content || {})
        return {
          ...current,
          siteContent,
          businessName: siteContent.brand.name || 'Wepzo',
          businessLogo: siteContent.brand.logo || '',
        }
      }) })
      .catch(() => {})
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') refreshSiteContent() }
    refreshSiteContent()
    const timer = window.setInterval(refreshSiteContent, 60000)
    window.addEventListener('focus', refreshWhenVisible)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refreshWhenVisible) }
  }, [])

  useEffect(() => {
    document.title = branding.businessName || 'Wepzo'
  }, [branding.businessName])

  useEffect(() => {
    const theme = branding.themeColors || {}
    const root = document.documentElement
    const primaryColor = branding.siteContent?.brand?.primaryColor || branding.primaryColor
    const validColor = value => /^#[0-9a-f]{6}$/i.test(String(value || ''))
    const brandColor = validColor(primaryColor) ? primaryColor : '#ff4b12'
    root.style.setProperty('--orange', brandColor)
    root.style.setProperty('--brand-color', brandColor)
    root.style.setProperty('--button-background', validColor(theme.buttonBackground) ? theme.buttonBackground : brandColor)
    root.style.setProperty('--button-text', theme.buttonText || '#ffffff')
    root.style.setProperty('--header-background', theme.headerBackground || '#ffffff')
    root.style.setProperty('--header-text', theme.headerText || '#172744')
    root.style.setProperty('--search-background', theme.searchBackground || '#f8f9fb')
    root.style.setProperty('--search-button', validColor(theme.searchButton) ? theme.searchButton : brandColor)
    root.style.setProperty('--footer-background', theme.footerBackground || '#10223b')
    root.style.setProperty('--footer-text', theme.footerText || '#ffffff')
    root.style.setProperty('--page-background', theme.pageBackground || '#ffffff')
    root.style.setProperty('--surface-background', theme.surfaceBackground || '#ffffff')
    const cardStyles = theme.storefrontCardStyles || {}
    for (const [type, fallback] of [['header', 12], ['product', 12], ['category', 12], ['promo', 12], ['account', 12], ['cart', 12], ['profile', 12], ['order', 12], ['support', 12], ['button', 6]]) {
      const radius = Math.max(0, Math.min(40, Number(cardStyles[type]?.borderRadius ?? fallback)))
      const width = Math.max(0, Math.min(8, Number(cardStyles[type]?.borderWidth ?? (type === 'button' ? 0 : 1))))
      root.style.setProperty(`--storefront-${type}-border-radius`, `${radius}px`)
      root.style.setProperty(`--storefront-${type}-border-width`, `${width}px`)
      root.style.setProperty(`--storefront-${type}-border-color`, cardStyles[type]?.borderColor || '#e2e8f0')
      root.style.setProperty(`--storefront-${type}-background`, cardStyles[type]?.backgroundColor || (type === 'header' ? theme.headerBackground : type === 'product' ? theme.productCardBackground : type === 'button' ? theme.buttonBackground : theme.surfaceBackground) || '#ffffff')
      if (type === 'button') root.style.setProperty('--storefront-button-text-color', cardStyles[type]?.textColor || theme.buttonText || '#ffffff')
    }
  }, [branding.primaryColor, branding.themeColors, branding.siteContent?.brand?.primaryColor])

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>
}

export function useBranding() {
  return useContext(BrandingContext)
}

export function resolveLogo(source) {
  if (!source || /^(https?:|data:|blob:)/i.test(source)) return source
  const origin = API.replace(/\/api\/?$/, '')
  return `${origin}${source.startsWith('/') ? source : `/${source}`}`
}
