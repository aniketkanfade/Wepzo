import React from 'react'
import { useEffect, useState } from 'react'
import Home from './pages/Home.jsx'
import Workspace from './pages/Workspace.jsx'
import MarketingAuth from './pages/MarketingAuth.jsx'

export default function App() {
  const [route, setRoute] = useState(window.location.hash)
  const isWorkspaceRoute = route.startsWith('#/app') || route.startsWith('#/dashboard')
  let user = null
  try { user = JSON.parse(localStorage.getItem('user') || 'null') } catch { user = null }
  const moduleSlug = String(user?.selectedModuleSlug || user?.websiteModuleSlug || '').toLowerCase()
  const canEnterWorkspace = Boolean(localStorage.getItem('token') && user?.role === 'website_user' && ['marketing', 'promotion', 'promotions'].includes(moduleSlug))
  useEffect(() => {
    const update = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  useEffect(() => {
    if (!canEnterWorkspace && isWorkspaceRoute) window.location.hash = '/login'
    if (canEnterWorkspace && !isWorkspaceRoute) window.location.hash = '/app/dashboard'
  }, [isWorkspaceRoute, canEnterWorkspace, route])
  if (canEnterWorkspace && !isWorkspaceRoute) return <Workspace />
  if (route.startsWith('#/login')) return <MarketingAuth />
  if (route.startsWith('#/register')) return <MarketingAuth register />
  if (isWorkspaceRoute) return canEnterWorkspace ? <Workspace /> : <MarketingAuth />
  return <Home />
}
