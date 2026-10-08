import React from 'react'
import { resolveLogo, useBranding } from '../BrandingContext.jsx'

export default function HowItWorks() {
  const { businessName, siteContent } = useBranding()
  const content = siteContent?.process || {}
  if (content.enabled === false) return null
  const videoTitle = String(content.videoTitle || '').replaceAll('{businessName}', businessName)
  return <section className="how-section" id="how-it-works"><div className="how-title"><h2>{content.title}</h2><span /></div><div className="steps-list">{(content.steps || []).map((step, index) => <article className="step" key={`${step.title}-${index}`}><div className="step-icon">{step.icon}</div><h3>{step.title}</h3><p>{step.text}</p></article>)}</div><a className="video-card" href={content.videoHref || '#contact'}><div className="video-image" style={content.videoImage?{backgroundImage:`url("${resolveLogo(content.videoImage)}")`}:undefined}><span className="play-button">▶</span></div><div><h3>{videoTitle}</h3><p>{content.videoDescription}</p><span className="watch-link">{content.videoLabel} →</span></div></a></section>
}
