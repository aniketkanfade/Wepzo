import React, { createContext, useContext, useEffect, useState } from 'react'
import { mergeMarketingSiteContent } from './siteDefaults.js'

const BrandingContext = createContext({ businessName: 'Wepzo', businessLogo: '', primaryColor: '', themeColors: {} })
const API = (import.meta.env.VITE_MARKETING_API_URL || import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const routeQuery = window.location.hash.includes('?') ? window.location.hash.slice(window.location.hash.indexOf('?') + 1) : ''
const params = new URLSearchParams(`${window.location.search.replace(/^\?/, '')}&${routeQuery}`)
const explicitWebsiteId = import.meta.env.VITE_WEBSITE_ID || params.get('websiteId') || params.get('tenantId') || ''
const websiteId = explicitWebsiteId || localStorage.getItem('wepzo-website-id') || ''
const moduleId = import.meta.env.VITE_WEBSITE_MODULE_ID || params.get('websiteModuleId') || params.get('moduleId') || ''
if (websiteId) localStorage.setItem('wepzo-website-id', websiteId)

export async function marketingRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Website-Module': 'marketing',
    ...(websiteId ? { 'X-Website-Id': websiteId } : {}),
    ...(moduleId ? { 'X-Website-Module-Id': moduleId } : {}),
    ...(options.headers || {}),
  }
  const token = localStorage.getItem('token')
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API}${path}`, { ...options, headers, cache: options.cache || 'no-store' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Request failed. Please try again.')
  return data
}

// Public website data resolves its tenant from this site's URL/host. Do not
// reuse a website ID left in localStorage by a different logged-in tenant.
export async function marketingPublicRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Website-Module': 'marketing',
    ...(explicitWebsiteId ? { 'X-Website-Id': explicitWebsiteId } : {}),
    ...(moduleId ? { 'X-Website-Module-Id': moduleId } : {}),
    ...(options.headers || {}),
  }
  const response = await fetch(`${API}${path}`, { ...options, headers, cache: options.cache || 'no-store' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Request failed. Please try again.')
  return data
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({ businessName: 'Wepzo', businessLogo: '', primaryColor: '', themeColors: {}, siteContent: mergeMarketingSiteContent() })

  useEffect(() => {
    let active = true
    const headers = { 'X-Website-Module': 'marketing', ...(explicitWebsiteId ? { 'X-Website-Id': explicitWebsiteId } : {}), ...(moduleId ? { 'X-Website-Module-Id': moduleId } : {}) }
    fetch(`${API}/shop/home`, { headers })
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
