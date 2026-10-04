import React from 'react'
import { useBranding } from '../BrandingContext.jsx'

const services = [
  { icon: '◎', type: 'social', title: 'Social Media Marketing', text: 'Manage Facebook, Instagram and more. Create posts, run ads and grow your audience.' },
  { icon: '▲', type: 'google', title: 'Google Marketing', text: 'Run Google Ads and get more website traffic and customers.' },
  { icon: '⌕', type: 'seo', title: 'SEO Optimization', text: 'Improve your website ranking and get long term organic growth.' },
  { icon: '✉', type: 'email', title: 'Email Marketing', text: 'Send bulk emails and grow your customer base with engaging campaigns.' },
]
export default function ServiceCards() {
  const { businessName } = useBranding()
  return <section className="services-row" id="services" aria-label="Our marketing services">{services.map(service => <a className="service-card" href="#pricing" key={service.title}><div className={`service-symbol ${service.type}`}>{service.icon}</div><h2>{service.title}</h2><p>{service.text}</p><span className="service-arrow">→</span></a>)}<div className="ready-card" id="pricing"><span className="trust-pill">✦ &nbsp;Trusted by 1,000+ Businesses</span><h2>Ready to Grow<br />Your Business?</h2><p>Join {businessName} and start your marketing journey today. Simple, powerful and affordable.</p><a className="button button-primary" href="mailto:hello@wepzo.com">Get Started Now <span>→</span></a></div></section>
}
