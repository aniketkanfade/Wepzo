import React from 'react'
import { useBranding } from '../BrandingContext.jsx'

function AnalyticsCard() {
  const { businessName } = useBranding()
  return <div className="analytics-card"><div className="analytics-top"><span><b className="mini-logo">{(businessName || 'W')[0]}</b> {businessName} <span className="muted">/ Overview</span></span><span className="live"><i /> Live</span></div>
    <div className="analytics-stats"><div><small>Total leads</small><strong>5,240</strong><em>↑ 32%</em><div className="bars">{[24,34,29,45,40,60,52,70,58,82,67,95].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div></div><div><small>Website traffic</small><strong>18,920</strong><em>↑ 45%</em><svg viewBox="0 0 150 50" preserveAspectRatio="none" aria-label="Traffic growth chart"><path d="M3 43 L28 37 L47 39 L68 25 L85 29 L101 17 L120 23 L145 5" fill="none" stroke="#4389ef" strokeWidth="3"/></svg></div></div>
    <div className="analytics-footer"><span>◧ Social media</span><span>◧ Google Ads</span><span>◧ SEO tools</span><span>◧ Email marketing</span></div></div>
}

export default function Hero() {
  const { businessName } = useBranding()
  return <section className="hero" id="home"><div className="hero-copy"><div className="eyebrow"><span>✦</span> All Your Marketing in One Platform</div>
    <h1>Grow Your Business<br />with <span>Digital Marketing</span></h1><p className="hero-sub">Social Media · Google Ads · SEO · Email Marketing<br />Everything you need to attract, engage and grow customers.</p>
    <div className="hero-benefits"><span><i>↗</i> Easy<br />Registration</span><span><i>♟</i> Connect<br />Your Accounts</span><span><i>▥</i> Manage<br />Campaigns</span><span><i>⌁</i> Get<br />Real Results</span></div>
    <div className="hero-actions"><a className="button button-primary button-large" href="#pricing">Start Free Trial <span>→</span></a><a className="button button-outline button-large" href="#pricing">View Pricing</a></div>
    <div className="reassurance"><span>✓ &nbsp;No Credit Card Required</span><span>✓ &nbsp;Free Setup Support</span><span>✓ &nbsp;Cancel Anytime</span></div></div>
    <div className="hero-art" aria-label={`${businessName} marketing dashboard and campaign results`}><div className="hero-glow"/><div className="hero-portrait"/><div className="social-bubble bubble-facebook">f</div><div className="social-bubble bubble-instagram">◎</div><div className="social-bubble bubble-google">G</div><div className="campaign-note"><span className="megaphone">◀</span><span>Run<br />Campaigns</span></div><AnalyticsCard/><div className="send-bubble">➤</div><div className="plant"><i/><i/><i/><i/><b/></div></div>
  </section>
}
