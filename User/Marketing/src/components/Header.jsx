import React, { useEffect, useState } from 'react'
import Brand from './Brand.jsx'
import { useBranding } from '../BrandingContext.jsx'

function readUser() {
  try { return localStorage.getItem('token') ? JSON.parse(localStorage.getItem('user') || 'null') : null } catch { return null }
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [user, setUser] = useState(readUser)
  const { siteContent } = useBranding()
  const headerContent = siteContent?.header || {}
  const links = [[headerContent.homeLabel || 'Home', '#home'], ...((headerContent.links || []).map(link => [link.label, link.href]))]

  useEffect(() => {
    const refresh = () => setUser(readUser())
    window.addEventListener('storage', refresh)
    window.addEventListener('wepzo-auth-changed', refresh)
    window.addEventListener('hashchange', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('wepzo-auth-changed', refresh)
      window.removeEventListener('hashchange', refresh)
    }
  }, [])

  if (headerContent.enabled === false) return null

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('wepzo-website-id')
    setUser(null)
    setProfileOpen(false)
    window.location.hash = '/'
  }

  return <header className="site-header"><div className="header-inner">
    <Brand />
    <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}>☰</button>
    <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
      {links.map(([label, href], index) => <a className={index === 0 ? 'active' : ''} href={href} key={`${label}-${index}`} onClick={() => setMenuOpen(false)}>{label}</a>)}
      {user ? <a className="mobile-login" href="#/app/dashboard" onClick={() => setMenuOpen(false)}>My workspace</a> : <a className="mobile-login" href="#/login" onClick={() => setMenuOpen(false)}>Login</a>}
    </nav>
    <div className="header-actions">
      <span className="language" aria-label="Language">◎ <span>{headerContent.languageLabel || 'EN'}</span>⌄</span>
      {user ? <div className="header-profile-wrap">
        <button className="header-profile" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen}>
          <i>{user.name?.split(' ').map(part => part[0]).join('').slice(0, 2) || 'W'}</i>
          <span><b>{user.name || 'My profile'}</b><small>Marketing account</small></span><em>⌄</em>
        </button>
        {profileOpen && <div className="header-profile-menu">
          <a href="#/app/dashboard" onClick={() => setProfileOpen(false)}>My workspace</a>
          <a href="#/app/subscription" onClick={() => setProfileOpen(false)}>Subscription</a>
          <button onClick={logout}>Sign out</button>
        </div>}
      </div> : <>
        <a className="button button-outline" href="#/login">{headerContent.loginLabel || 'Login'}</a>
        <a className="button button-primary" href={headerContent.getStartedHref || '#/register'}>{headerContent.getStartedLabel || 'Get Started'} <span>→</span></a>
      </>}
    </div>
  </div></header>
}
