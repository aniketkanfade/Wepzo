import React from 'react'
import { useBranding } from '../BrandingContext.jsx'

export default function TrustedBrands() {
  const { siteContent } = useBranding()
  const content = siteContent?.trusted || {}
  if (content.enabled === false) return null
  return <section className="trusted-brands" id="trusted"><h2>{content.title}</h2><div className="brand-list">{(content.brands || []).map((brand, index) => <span key={`${brand}-${index}`}>{brand}</span>)}</div></section>
}
