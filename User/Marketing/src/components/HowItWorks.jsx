import React from 'react'
import { useBranding } from '../BrandingContext.jsx'

const steps = [['♟', '1. Register', 'Create your account in just a few minutes.'], ['↗', '2. Connect', 'Connect your social media, Google and other accounts.'], ['▶', '3. Choose Plan', 'Select the best plan for your business.'], ['▥', '4. Start Marketing', 'Create campaigns and get real results.']]
export default function HowItWorks() {
  const { businessName } = useBranding()
  return <section className="how-section" id="how-it-works"><div className="how-title"><h2>How It Works?</h2><span /></div><div className="steps-list">{steps.map(([icon, title, text]) => <article className="step" key={title}><div className="step-icon">{icon}</div><h3>{title}</h3><p>{text}</p></article>)}</div><a className="video-card" href="#contact"><div className="video-image"><span className="play-button">▶</span></div><div><h3>See How {businessName}<br />Helps Your Business</h3><p>Watch our 2-minute video and learn how to grow with digital marketing.</p><span className="watch-link">Watch Video →</span></div></a></section>
}
