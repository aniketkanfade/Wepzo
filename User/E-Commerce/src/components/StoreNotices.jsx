import { imageOf, storageKey } from '../lib/storefront'

export function Toast({ message, clear }) {
  if (!message) return null
  return <div className="toast" role="status"><span>{message}</span><button onClick={clear}>Ã—</button></div>
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
  return <main className="maintenance-screen">
    <img src={imageOf({ image: business.businessLogo })} alt={business.businessName || 'Logo'} />
    <h1>{business.businessName || 'Store'} is under maintenance</h1>
    <p>Weâ€™ll be back soon. Please check again later.</p>
  </main>
}
