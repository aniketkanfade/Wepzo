import { useEffect } from 'react'
import { imageOf, storageKey } from '../lib/storefront'

export function Toast({ message, clear }) {
  useEffect(() => {
    if (!message) return undefined
    const timeout = window.setTimeout(clear, 2800)
    return () => window.clearTimeout(timeout)
  }, [message, clear])

  if (!message) return null
  const isCartSuccess = /^Added to (cart|your bag)/i.test(message)
  return <div className={`toast${isCartSuccess ? ' toast-success' : ''}`} role="status" aria-live="polite">
    {isCartSuccess && <span className="toast-check" aria-hidden="true">✓</span>}
    <span>{message}</span>
  </div>
}

export function CookieNotice({ business, accepted, enabled, accept }) {
  if (!enabled || !business.cookiesText || accepted) return null
  return <aside className="cookie-notice" role="dialog" aria-label="Cookie notice">
    <p>{business.cookiesText}</p>
    <button onClick={() => {
      localStorage.setItem(storageKey('wepzo-cookie-consent'), 'accepted')
      accept()
    }}>Accept</button>
  </aside>
}

export function MaintenancePage({ business }) {
  const logo = business.businessLogo
    ? imageOf({ image: business.businessLogo })
    : String(business.businessName || 'WEPZO').trim().toLowerCase() === 'wepzo' ? '/wepzo-logo.svg' : ''
  return <main className="maintenance-screen">
    <img src={logo} alt={business.businessName || 'Logo'} />
    <h1>{business.businessName || 'Store'} is under maintenance</h1>
    <p>We’ll be back soon. Please check again later.</p>
  </main>
}
