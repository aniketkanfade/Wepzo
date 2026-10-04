import React from 'react'
import { resolveLogo, useBranding } from '../BrandingContext.jsx'

export default function Brand({ href = '#home' }) {
  const { businessName, businessLogo } = useBranding()
  return <a className="brand" href={href} aria-label={`${businessName} home`}>
    {businessLogo ? <img className="brand-image" src={resolveLogo(businessLogo)} alt="" /> : <span className="brand-icon">W</span>}
    <span>{businessName || 'Wepzo'}</span>
  </a>
}
