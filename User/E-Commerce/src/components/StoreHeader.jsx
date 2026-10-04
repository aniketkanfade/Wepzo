import { imageOf } from '../lib/storefront'
import { useEffect, useRef, useState } from 'react'
import './StoreHeader.css'

const Icon = ({ children }) => <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>

export default function StoreHeader({ business, customer, query, setQuery, location, onOpenLocation, onOpenAccount, onSignOut, onOpenCart, onSearch, count, showLogo, showSearch, showLocation, showProfile, showCart, showFavorites }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef(null)

  useEffect(() => {
    if (!accountOpen) return undefined
    const closeOnOutsideClick = event => {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false)
    }
    const closeOnEscape = event => {
      if (event.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [accountOpen])

  useEffect(() => setAccountOpen(false), [customer])

  if (!showLogo && !showSearch && !showLocation && !showProfile && !showCart && !showFavorites) return null

  return <header className="header sticky top-0 z-10 bg-white shadow-sm">
    {showLogo && <a className="brand" href="#top" aria-label={business.businessName || 'Home'}>
      {business.businessLogo
        ? <img className="brand-logo" src={imageOf({ image: business.businessLogo })} alt={business.businessName || 'Logo'} />
        : <><span className="brand-mark"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 14h20l2 20H8l2-20Z"/><path d="M14 15V9a6 6 0 0 1 12 0v6M14 23l5 5 9-10"/></svg></span><span>{business.businessName || 'WEPZO'}</span></>}
    </a>}
    {showLocation && <button className="location-button" onClick={onOpenLocation}>
      <Icon><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></Icon>
      <span>Deliver to <b>{location.pincode || 'Choose location'}</b></span>
    </button>}
    {showSearch && <label className="search flex items-center overflow-hidden rounded-md border border-slate-200 bg-slate-100 transition-colors focus-within:border-orange-500">
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search for products, brands and more..." />
      <button type="button" aria-label="Search" onClick={onSearch}><Icon><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2"/></Icon></button>
    </label>}
    <div className="header-actions">
      <a className="header-service" href={business.businessPhone ? `tel:${business.businessPhone}` : `mailto:${business.businessEmail || ''}`} aria-label="Contact support">
        <Icon><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="12" width="4" height="7" rx="2"/><rect x="17" y="12" width="4" height="7" rx="2"/><path d="M19 19a4 4 0 0 1-4 3h-2"/></Icon><span>Support</span>
      </a>
      <button className="header-service" onClick={onOpenAccount} aria-label="Orders">
        <Icon><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3M9 13h6"/></Icon><span>Orders</span>
      </button>
      {showFavorites && <button className="header-icon" onClick={() => document.getElementById('wishlist')?.scrollIntoView({ behavior: 'smooth' })} aria-label="Wishlist">
        <Icon><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></Icon><span>Wishlist</span>
      </button>}
      {showCart && <button className="cart-button" onClick={onOpenCart} aria-label={`Cart, ${count} items`}>
        <Icon><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 9H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></Icon><span>Cart</span><i>{count}</i>
      </button>}
      {showProfile && <div className="account-menu-wrap" ref={accountRef}>
        <button className="account-button" aria-haspopup="menu" aria-expanded={accountOpen} onClick={() => customer ? setAccountOpen(open => !open) : onOpenAccount()}>
          <Icon><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Icon>
          <span>{customer?.name || 'User'}</span>
        </button>
        {customer && accountOpen && <div className="account-dropdown" role="menu">
          <div className="account-dropdown-user"><strong>{customer.name || 'User'}</strong><span>{customer.email || ''}</span></div>
          <button role="menuitem" onClick={() => { setAccountOpen(false); onSignOut?.() }}>Sign out</button>
        </div>}
      </div>}
    </div>
  </header>
}
