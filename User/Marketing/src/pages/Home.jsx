import React, { useState } from 'react'
import { BrandingProvider, useBranding } from '../BrandingContext.jsx'
import Header from '../components/Header.jsx'
import Hero from '../components/Hero.jsx'
import ServiceCards from '../components/ServiceCards.jsx'
import TrustedBrands from '../components/TrustedBrands.jsx'
import HowItWorks from '../components/HowItWorks.jsx'
import MarketingPromotions from '../components/MarketingPromotions.jsx'
import Footer from '../components/Footer.jsx'

function Pricing() {
  const [yearly, setYearly] = useState(false)
  const { siteContent } = useBranding()
  const content = siteContent?.pricing || {}
  const hasAccount = Boolean(localStorage.getItem('token'))
  if (content.enabled === false) return null
  return <section className="marketing-section pricing-section" id="pricing"><div className="section-heading"><span>{content.eyebrow}</span><h2>{content.title}</h2><p>{content.description}</p><div className="pricing-toggle"><button className={!yearly?'selected':''} onClick={()=>setYearly(false)}>{content.monthlyLabel}</button><button className={yearly?'selected':''} onClick={()=>setYearly(true)}>{content.yearlyLabel} <i>{content.savingsLabel}</i></button></div></div><div className="plan-grid">{(content.plans || []).map(plan => <article className={`plan-card${plan.featured ? ' featured' : ''}`} key={plan.name}>{plan.featured&&<span className="popular-badge">{content.popularLabel}</span>}<h3>{plan.name}</h3><p>{plan.detail}</p><strong>₹{Number(yearly?plan.yearly:plan.monthly).toLocaleString('en-IN')}<small> / {yearly?content.yearUnit:content.monthUnit}</small></strong><ul>{(plan.features || []).map((feature,index) => <li key={`${feature}-${index}`}>✓ &nbsp;{feature}</li>)}</ul><a className={`button ${plan.featured ? 'button-primary' : 'button-outline'}`} href={hasAccount?'#/app/subscription':'#/register'}>{hasAccount?content.manageLabel:content.chooseLabel} {plan.name} <span>→</span></a></article>)}</div><p className="pricing-footnote">{content.footnote}</p></section>
}

function FeatureHighlights() {
  const { siteContent } = useBranding()
  const content = siteContent?.features || {}
  if (content.enabled === false) return null
  return <section className="feature-highlights" id="features"><div className="section-heading"><span>{content.eyebrow}</span><h2>{content.title}</h2><p>{content.description}</p></div><div className="feature-grid">{(content.items || []).map((feature,index)=><article key={`${feature.title}-${index}`}><span>{feature.icon}</span><h3>{feature.title}</h3><p>{feature.text}</p></article>)}</div></section>
}

function TestimonialsAndFaq() {
  const { siteContent } = useBranding()
  const testimonials = siteContent?.testimonials || {}
  const faq = siteContent?.faq || {}
  return <>{testimonials.enabled!==false&&<section className="testimonial-section"><div className="section-heading"><span>{testimonials.eyebrow}</span><h2>{testimonials.title}</h2></div><div className="testimonial-grid">{(testimonials.items || []).map((item,index)=><article key={`${item.name}-${index}`}><div>★★★★★</div><p>“{item.quote}”</p><b>{item.name}</b><small>{item.role}</small></article>)}</div></section>}{faq.enabled!==false&&<section className="faq-section"><div className="section-heading"><span>{faq.eyebrow}</span><h2>{faq.title}</h2></div><div className="faq-list">{(faq.items || []).map((item,index)=><details key={`${item.question}-${index}`}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section>}</>
}

function About() {
  const { siteContent } = useBranding()
  const content = siteContent?.about || {}
  if (content.enabled === false) return null
  return <section className="marketing-section about-section" id="about"><div className="section-heading"><span>{content.eyebrow}</span><h2>{content.title}</h2><p>{content.description}</p><a className="button button-primary" href={content.href}>{content.button} <span>→</span></a></div><div className="about-stats">{(content.stats || []).map((stat,index)=><div key={`${stat.label}-${index}`}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</div></section>
}

function Contact() {
  const [submitted, setSubmitted] = useState(false)
  const { siteContent } = useBranding()
  const content = siteContent?.contact || {}
  if (content.enabled === false) return null
  function submit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const subject = encodeURIComponent(`${siteContent?.brand?.name || 'Wepzo'} enquiry from ${data.get('name')}`)
    const body = encodeURIComponent(`Name: ${data.get('name')}\nEmail: ${data.get('email')}\n\n${data.get('message')}`)
    window.location.href = `mailto:${content.email}?subject=${subject}&body=${body}`
    setSubmitted(true)
  }
  return <section className="marketing-section contact-section" id="contact"><div className="section-heading"><span>{content.eyebrow}</span><h2>{content.title}</h2><p>{content.description}</p><a className="contact-email" href={`mailto:${content.email}`}>{content.email}</a></div><form className="contact-form" onSubmit={submit}><label>{content.nameLabel}<input name="name" required placeholder={content.namePlaceholder} /></label><label>{content.emailLabel}<input name="email" type="email" required placeholder={content.emailPlaceholder} /></label><label>{content.messageLabel}<textarea name="message" required rows="4" placeholder={content.messagePlaceholder} /></label><button className="button button-primary" type="submit">{content.submitLabel} <span>→</span></button>{submitted && <p className="form-note" role="status">{content.successMessage}</p>}</form></section>
}

function FinalCta() {
  const { siteContent } = useBranding()
  const content = siteContent?.finalCta || {}
  if (content.enabled === false) return null
  return <section className="final-cta"><div><span>{content.eyebrow}</span><h2>{String(content.title || '').split('\n').map((line,index)=><React.Fragment key={`${line}-${index}`}>{index > 0 && <br/>}{line}</React.Fragment>)}</h2><p>{content.description}</p></div><a className="button button-primary button-large" href={content.href}>{content.button} <span>→</span></a></section>
}

export default function Home() {
  return <BrandingProvider><Header /><main><Hero /><MarketingPromotions /><FeatureHighlights /><ServiceCards /><HowItWorks /><Pricing /><TestimonialsAndFaq /><About /><Contact /><FinalCta /><TrustedBrands /></main><Footer /></BrandingProvider>
}
