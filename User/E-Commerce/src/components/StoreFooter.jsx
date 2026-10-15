import { imageOf } from '../lib/storefront'

export default function StoreFooter({ business, visible, onOpenSupport }) {
  const isWepzo = String(business.businessName || 'WEPZO').trim().toLowerCase() === 'wepzo'
  if (!visible) return null
  return <footer className="footer">
    <a className="brand" href="#top" aria-label={business.businessName || 'Home'}>
      {business.businessLogo
        ? <img className="brand-logo" src={imageOf({ image: business.businessLogo })} alt={business.businessName || 'Logo'} />
        : isWepzo ? <img className="brand-logo" src="/wepzo-logo.svg" alt="WEPZO" />
        : <><span className="brand-mark">w</span><span>{business.businessName || 'wepzo'}<small>{business.businessAddress || 'Store'}</small></span></>}
    </a>
    <span>{business.copyrightText || `Â© ${new Date().getFullYear()} ${business.businessName || 'wepzo'}`}</span>
    <div className="footer-links">
      <button type="button" onClick={onOpenSupport}>Support</button>
      {business.businessPhone && <a href={`tel:${business.businessPhone}`}>{business.businessPhone}</a>}
      {business.businessEmail && <a href={`mailto:${business.businessEmail}`}>{business.businessEmail}</a>}
    </div>
  </footer>
}
