import React from 'react'
import { useBranding } from '../BrandingContext.jsx'

export default function ServiceCards() {
  const { businessName, siteContent } = useBranding()
  const content = siteContent?.services || {}
  if (content.enabled === false) return null
  const readyDescription = String(content.readyDescription || '').replaceAll('{businessName}', businessName)
  return <section className="services-row" id="services" aria-label="Our marketing services">{(content.items || []).map((service, index) => <a className="service-card" href={service.href || '#pricing'} key={`${service.title}-${index}`}><div className={`service-symbol ${service.type || ''}`}>{service.icon}</div><h2>{service.title}</h2><p>{service.text}</p><span className="service-arrow">→</span></a>)}<div className="ready-card"><span className="trust-pill">✦ &nbsp;{content.trustLabel}</span><h2>{content.readyTitle}</h2><p>{readyDescription}</p><a className="button button-primary" href={content.readyHref}>{content.readyButton} <span>→</span></a></div></section>
}
