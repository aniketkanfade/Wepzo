import React from 'react'
import { resolveLogo, useBranding } from '../BrandingContext.jsx'

function PreviewDashboard({ preview = {} }) {
  const metrics = preview.metrics || []
  const hasGreeting = preview.date || preview.title
  const hasCalendar = preview.calendarTitle || preview.calendarDate
  const hasPost = preview.postTitle || preview.postMeta || preview.postStatus
  const hasFooter = preview.contentReadyLabel || preview.footer
  return <div className="landing-preview">
    {(preview.label || preview.status) && <div className="preview-top"><span>{preview.label}</span>{preview.status && <b><i/> {preview.status}</b>}</div>}
    {hasGreeting && <div className="preview-greeting">{preview.date && <small>{preview.date}</small>}{preview.title && <strong>{preview.title}</strong>}</div>}
    {metrics.length > 0 && <div className="preview-metrics">{metrics.map((metric, index) => <div key={`${metric.label}-${index}`}><small>{metric.label}</small><b>{metric.value}</b><span>{metric.note}</span></div>)}</div>}
    {hasCalendar && <div className="preview-calendar"><div className="preview-calendar-title"><b>{preview.calendarTitle}</b><span>{preview.calendarDate}</span></div></div>}
    {hasPost && <div className="preview-post"><span>?</span><div>{preview.postTitle && <b>{preview.postTitle}</b>}{preview.postMeta && <small>{preview.postMeta}</small>}</div>{preview.postStatus && <i>{preview.postStatus}</i>}</div>}
    {hasFooter && <div className="preview-bottom">{preview.contentReadyLabel && <span>{preview.contentReadyLabel}</span>}{preview.footer && <small>{preview.footer}</small>}</div>}
  </div>
}

export default function Hero() {
  const { businessName, siteContent } = useBranding()
  const hero = siteContent?.hero || {}
  if (hero.enabled === false) return null
  return <section className="hero" id="home"><div className="hero-copy"><div className="eyebrow"><span>✦</span> {hero.eyebrow}</div>
    <h1>{hero.title}<br /><span>{hero.highlight}</span></h1><p className="hero-sub">{hero.description}</p>
    <div className="hero-benefits">{(hero.benefits || []).map((benefit, index) => <span key={`${benefit.text}-${index}`}><i>{benefit.icon}</i>{benefit.text}</span>)}</div>
    <div className="hero-actions"><a className="button button-primary button-large" href={hero.primaryHref}>{hero.primaryLabel} <span>→</span></a><a className="button button-outline button-large" href={hero.secondaryHref}>{hero.secondaryLabel}</a><a className="hero-demo" href={hero.demoHref}>{hero.demoLabel} →</a></div>
    <div className="reassurance">{(hero.reassurance || []).map((item, index) => <span key={`${item}-${index}`}>✓ &nbsp;{item}</span>)}</div></div>
    <div className="hero-art" aria-label={`${businessName} marketing`}><div className="hero-glow"/>{hero.image?<img className="hero-custom-image" src={resolveLogo(hero.image)} alt={businessName}/>:Object.keys(hero.preview || {}).length > 0 && <PreviewDashboard preview={hero.preview}/>}</div>
  </section>
}
