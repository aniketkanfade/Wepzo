import React, { createContext, useContext, useEffect, useState } from 'react'
import { mergeMarketingSiteContent } from './siteDefaults.js'

const BrandingContext = createContext({ businessName: 'Wepzo', businessLogo: '' })
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
  const response = await fetch(`${API}${path}`, { ...options, headers })
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
  const response = await fetch(`${API}${path}`, { ...options, headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Request failed. Please try again.')
  return data
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({ businessName: 'Wepzo', businessLogo: '', siteContent: mergeMarketingSiteContent() })

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
    const color = branding.siteContent?.brand?.primaryColor
    document.documentElement.style.setProperty('--orange', /^#[0-9a-f]{6}$/i.test(String(color || '')) ? color : '#ff4b12')
  }, [branding.siteContent?.brand?.primaryColor])

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
