import { useEffect, useMemo, useRef, useState } from 'react'
import { imageOf, videoOf } from '../lib/storefront'

const AUTOPLAY_DELAY = 5000

export default function HeroSection({ banners = [], banner, deals = [], visible = true }) {
  const slides = useMemo(() => {
    const items = Array.isArray(banners) && banners.length ? banners : (banner ? [banner] : [])
    return items.filter(Boolean)
  }, [banner, banners])
  const [activeIndex, setActiveIndex] = useState(0)
  const gestureStart = useRef(null)

  useEffect(() => {
    setActiveIndex(index => slides.length ? index % slides.length : 0)
  }, [slides.length])

  useEffect(() => {
    if (!visible || slides.length < 2) return undefined
    const timer = window.setInterval(() => {
      setActiveIndex(index => (index + 1) % slides.length)
    }, AUTOPLAY_DELAY)
    return () => window.clearInterval(timer)
  }, [slides.length, visible])

  const hasSlides = slides.length > 0
  if (!visible || !hasSlides) return null

  const activeBanner = hasSlides ? slides[activeIndex] : null
  const image = activeBanner ? imageOf(activeBanner) : ''
  const video = activeBanner ? videoOf(activeBanner) : ''
  const title = activeBanner?.title || activeBanner?.heading
  const eyebrow = activeBanner?.eyebrow || activeBanner?.kicker || activeBanner?.tagline
  const subtitle = activeBanner?.subtitle || activeBanner?.description
  const cta = activeBanner?.cta || activeBanner?.buttonText || activeBanner?.ctaText || ''
  const target = activeBanner?.link || activeBanner?.targetUrl || activeBanner?.linkUrl || '#collection'

  const moveTo = index => {
    if (!slides.length) return
    setActiveIndex((index + slides.length) % slides.length)
  }
  const onPointerDown = event => {
    if (event.target.closest('a, button, video')) return
    gestureStart.current = { x: event.clientX, y: event.clientY }
  }
  const onPointerUp = event => {
    const start = gestureStart.current
    gestureStart.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy)) return
    moveTo(activeIndex + (dx < 0 ? 1 : -1))
  }

  return <div className="hero-carousel">
    <section
      className={`hero${image || video ? ' hero-has-image' : ''}`}
      style={image ? { backgroundImage: `linear-gradient(90deg, rgba(255,246,237,.96) 0%, rgba(255,246,237,.82) 38%, rgba(255,246,237,0) 78%), url(${JSON.stringify(image)})` } : undefined}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { gestureStart.current = null }}
      aria-roledescription={hasSlides ? 'carousel' : undefined}
      aria-label={hasSlides ? 'Featured banners' : undefined}
    >
      {video && <video className="hero-banner-video" src={video} poster={image || undefined} autoPlay muted loop playsInline aria-hidden="true" />}
      {video && <span className="hero-video-overlay" aria-hidden="true" />}
      <div className="hero-copy" key={activeBanner?.id || activeBanner?._id || activeIndex}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        {title && <h1>{title}</h1>}
        {subtitle && <p>{subtitle}</p>}
        {cta && <a href={target} className="button button-orange">
          {cta} <span aria-hidden="true">→</span>
        </a>}
      </div>
      {!image && !video && <div className="hero-products" aria-hidden="true">
        {(Array.isArray(deals) ? deals : []).slice(0, 3).map((item, index) => item && <div key={item._id || item.id || index} className={`hero-product hero-product-${index}`}>
          {imageOf(item) ? <img src={imageOf(item)} alt="" /> : <span>{item.name?.slice(0, 1)}</span>}
        </div>)}
        <div className="hero-plant">✦</div>
      </div>}
      {slides.length > 1 && <>
        <button type="button" className="hero-arrow hero-prev" aria-label="Previous banner" onClick={() => moveTo(activeIndex - 1)}>‹</button>
        <button type="button" className="hero-arrow hero-next" aria-label="Next banner" onClick={() => moveTo(activeIndex + 1)}>›</button>
      </>}
    </section>
    {hasSlides && <nav className="hero-dots" aria-label="Choose banner">
      {slides.map((item, index) => <button
        type="button"
        key={item.id || item._id || `banner-${index}`}
        className={index === activeIndex ? 'active' : ''}
        aria-label={`Show banner ${index + 1} of ${slides.length}`}
        aria-current={index === activeIndex ? 'true' : undefined}
        onClick={() => moveTo(index)}
      />)}
    </nav>}
  </div>
}
