import React, { createContext, useContext, useEffect, useState } from 'react'

const BrandingContext = createContext({ businessName: 'Wepzo', businessLogo: '' })
const API = (import.meta.env.VITE_MARKETING_API_URL || import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const params = new URLSearchParams(window.location.search)
const websiteId = import.meta.env.VITE_WEBSITE_ID || params.get('websiteId') || params.get('tenantId') || localStorage.getItem('wepzo-website-id') || ''
const moduleId = import.meta.env.VITE_WEBSITE_MODULE_ID || params.get('websiteModuleId') || params.get('moduleId') || ''
if (websiteId) localStorage.setItem('wepzo-website-id', websiteId)

export async function marketingRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(websiteId ? { 'X-Website-Id': websiteId } : {}),
    ...(moduleId ? { 'X-Website-Module-Id': moduleId } : {}),
    ...(options.headers || {}),
  }
  const token = localStorage.getItem('wepzo-shop-token')
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API}${path}`, { ...options, headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Request failed. Please try again.')
  return data
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({ businessName: 'Wepzo', businessLogo: '' })

  useEffect(() => {
    const headers = { ...(websiteId ? { 'X-Website-Id': websiteId } : {}), ...(moduleId ? { 'X-Website-Module-Id': moduleId } : {}) }
    fetch(`${API}/shop/home`, { headers })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (data?.business) setBranding({
          businessName: data.business.businessName || 'Wepzo',
          businessLogo: data.business.businessLogo || '',
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    document.title = branding.businessName || 'Wepzo'
  }, [branding.businessName])

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
