import React from 'react'
import { useEffect, useState } from 'react'
import Home from './pages/Home.jsx'
import Workspace from './pages/Workspace.jsx'
import MarketingAuth from './pages/MarketingAuth.jsx'
import { BrandingProvider, marketingRequest, clearMarketingSession } from './BrandingContext.jsx'

function AppContent() {
  const [route, setRoute] = useState(window.location.hash)
  const [user, setUser] = useState(null)
  const [sessionReady, setSessionReady] = useState(false)
  const isWorkspaceRoute = route.startsWith('#/app') || route.startsWith('#/dashboard')
  const moduleSlug = String(user?.selectedModuleSlug || user?.websiteModuleSlug || '').toLowerCase()
  const canEnterWorkspace = Boolean(user?.role === 'website_user' && ['marketing', 'promotion', 'promotions'].includes(moduleSlug))
  useEffect(() => {
    const update = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  useEffect(() => {
    let active = true
    const loadSession = () => marketingRequest('/auth/me')
      .then(result => { if (active) setUser(result.user || null) })
      .catch(() => { clearMarketingSession(); if (active) setUser(null) })
      .finally(() => { if (active) setSessionReady(true) })
    const refresh = () => { setSessionReady(false); loadSession() }
    loadSession()
    window.addEventListener('wepzo-auth-changed', refresh)
    return () => { active = false; window.removeEventListener('wepzo-auth-changed', refresh) }
  }, [])
  useEffect(() => {
    if (!sessionReady) return
    if (!canEnterWorkspace && isWorkspaceRoute) window.location.hash = '/login'
    if (canEnterWorkspace && !isWorkspaceRoute) window.location.hash = '/app/dashboard'
  }, [isWorkspaceRoute, canEnterWorkspace, route, sessionReady])
  if (!sessionReady && isWorkspaceRoute) return <main className="marketing-auth-page"><section className="marketing-auth-card">Checking your Wepzo session…</section></main>
  if (canEnterWorkspace && !isWorkspaceRoute) return <Workspace user={user} />
  if (route.startsWith('#/login')) return <MarketingAuth />
  if (route.startsWith('#/register')) return <MarketingAuth register />
  if (isWorkspaceRoute) return canEnterWorkspace ? <Workspace user={user} /> : <MarketingAuth />
  return <Home user={user} />
}

export default function App() {
  return <BrandingProvider><AppContent /></BrandingProvider>
}
