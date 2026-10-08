import { useEffect, useState } from 'react'
import { marketingPublicRequest, resolveLogo, useBranding } from '../BrandingContext.jsx'

function PromotionLink({ href, children, className }) {
  if (!href) return null
  const external = /^https?:\/\//i.test(href)
  return <a className={className} href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>{children}</a>
}

function PromotionCard({ item, eyebrow, className = '', defaultButton }) {
  return <article className={`promotion-card ${className}`}>
    {item.image && <img src={resolveLogo(item.image)} alt="" loading="lazy" />}
    <div className="promotion-card-copy">
      {eyebrow && <span className="promotion-eyebrow">{eyebrow}</span>}
      <h3>{item.title}</h3>
      {(item.subtitle || item.description) && <p>{item.subtitle || item.description}</p>}
      <PromotionLink href={item.link} className="promotion-link">{item.cta || defaultButton} <span>→</span></PromotionLink>
    </div>
  </article>
}

export default function MarketingPromotions() {
  const { siteContent } = useBranding()
  const labels = siteContent?.promotions || {}
  const [promotions, setPromotions] = useState(null)

  useEffect(() => {
    let active = true
    const refresh = () => marketingPublicRequest('/marketing/public/promotions')
      .then(data => { if (active) setPromotions(data) })
      .catch(() => { if (active) setPromotions(current => current || {}) })
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') refresh() }
    refresh()
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refreshWhenVisible)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshWhenVisible)
    }
  }, [])

  if (!promotions || labels.enabled === false) return null
  const banners = [...(promotions.banners || []), ...(promotions.otherBanners || [])]
  const campaigns = promotions.campaigns || []
  const coupons = promotions.coupons || []
  const ads = promotions.advertisements || []
  const announcements = promotions.announcements || []
  if (!banners.length && !campaigns.length && !coupons.length && !ads.length && !announcements.length) return null

  return <section className="marketing-promotions" aria-label="Current promotions">
    {announcements.map(item => <aside className="promotion-announcement" key={item.id}><strong>{item.title}</strong><span>{item.message}</span></aside>)}
    {banners.length > 0 && <div className="promotion-banner-grid">{banners.map(item => <PromotionCard item={item} eyebrow={item.placement || item.section} defaultButton={labels.defaultButton} key={item.id} />)}</div>}
    {(campaigns.length > 0 || coupons.length > 0 || ads.length > 0) && <div className="promotion-offers">
      <div className="promotion-heading"><span>{labels.eyebrow}</span><h2>{labels.title}</h2></div>
      <div className="promotion-offer-grid">
        {campaigns.map(item => <PromotionCard item={item} eyebrow={item.type || 'Campaign'} defaultButton={labels.defaultButton} key={item.id} />)}
        {coupons.map(item => <article className="promotion-coupon" key={item.id}><span className="promotion-eyebrow">{labels.couponLabel}</span><h3>{item.title || 'Special discount'}</h3><p>{item.description || (item.discount ? `Save ${item.discount}` : 'Use this code at checkout.')}</p><div className="coupon-code"><span>{item.code}</span><button type="button" onClick={() => navigator.clipboard?.writeText(item.code)}> {labels.copyLabel}</button></div></article>)}
        {ads.map(item => <PromotionCard item={item} eyebrow={item.platform || 'Featured'} defaultButton={labels.defaultButton} key={item.id} />)}
      </div>
    </div>}
  </section>
}
