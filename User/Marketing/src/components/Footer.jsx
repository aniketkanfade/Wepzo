import React from 'react'
import Brand from './Brand.jsx'
import { useBranding } from '../BrandingContext.jsx'

export default function Footer() {
  const { siteContent } = useBranding()
  const footer = siteContent?.footer || {}
  if (footer.enabled === false) return null
  const email = siteContent?.contact?.email || 'hello@wepzo.com'
  return <footer className="site-footer"><Brand /><p>{footer.tagline}</p><a href={`mailto:${email}`}>{footer.contactLabel} →</a></footer>
}
