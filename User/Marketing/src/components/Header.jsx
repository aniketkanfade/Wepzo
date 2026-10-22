import React, { useState } from 'react'
import Brand from './Brand.jsx'
import { clearMarketingSession, useBranding } from '../BrandingContext.jsx'

export default function Header({ user = null }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { siteContent } = useBranding()
  const headerContent = siteContent?.header || {}
  const links = [[headerContent.homeLabel || 'Home', '#home'], ...((headerContent.links || []).map(link => [link.label, link.href]))]

  if (headerContent.enabled === false) return null

  const logout = async () => {
    clearMarketingSession()
    setProfileOpen(false)
    window.dispatchEvent(new Event('wepzo-auth-changed'))
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
