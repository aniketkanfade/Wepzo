import React, { useState } from 'react'
import Brand from './Brand.jsx'
import CustomerAuth from './CustomerAuth.jsx'

function savedCustomer() {
  try { return localStorage.getItem('wepzo-shop-token') ? JSON.parse(localStorage.getItem('wepzo-shop-customer') || 'null') : null }
  catch { return null }
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [customer, setCustomer] = useState(savedCustomer)
  const links = [['Services', '#services'], ['Pricing', '#pricing'], ['Resources', '#how-it-works'], ['About Us', '#about'], ['Contact', '#contact']]
  return <header className="site-header"><div className="header-inner">
    <Brand />
    <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}>☰</button>
    <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation"><a className="active" href="#home" onClick={() => setMenuOpen(false)}>Home</a>{links.map(([label, href]) => <a href={href} key={label} onClick={() => setMenuOpen(false)}>{label}</a>)}<button className="mobile-login" type="button" onClick={() => { setMenuOpen(false); setAuthOpen(true) }}>{customer?.name ? 'My account' : 'Login'}</button></nav>
    <div className="header-actions"><button className="language">◎ <span>EN</span>⌄</button><button className="button button-outline" type="button" onClick={() => setAuthOpen(true)}>{customer?.name ? customer.name.split(' ')[0] : 'Login'}</button><a className="button button-primary" href="#pricing">Get Started <span>→</span></a></div>
  </div>{authOpen && <CustomerAuth customer={customer} onClose={() => setAuthOpen(false)} onSignedIn={user => { setCustomer(user); setAuthOpen(false) }} onSignedOut={() => { setCustomer(null); setAuthOpen(false) }} />}</header>
}
