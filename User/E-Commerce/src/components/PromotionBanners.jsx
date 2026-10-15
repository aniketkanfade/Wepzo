import { useEffect, useRef, useState } from 'react'
import { imageOf, videoOf } from '../lib/storefront'

export default function PromotionBanners({ banners = [] }) {
  const visibleBanners = (Array.isArray(banners) ? banners : []).filter(banner => banner && (imageOf(banner) || videoOf(banner) || banner.title || banner.subtitle))
  const [isMobile, setIsMobile] = useState(() => typeof window === 'undefined' ? false : window.innerWidth <= 760)
  const railRef = useRef(null)
  const pauseRef = useRef(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 760)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const shouldAutoScroll = isMobile ? visibleBanners.length > 1 : visibleBanners.length > 3
    if (!shouldAutoScroll) return undefined

    const timer = window.setInterval(() => {
      const rail = railRef.current
      if (!rail || pauseRef.current) return

      const lastPosition = rail.scrollWidth - rail.clientWidth
      if (rail.scrollLeft >= lastPosition - 8) {
        rail.scrollTo({ left: 0, behavior: 'smooth' })
        return
      }

      const firstBanner = rail.querySelector('.promotion-banner')
      const styles = window.getComputedStyle(rail)
      const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0
      const step = firstBanner ? firstBanner.getBoundingClientRect().width + gap : rail.clientWidth
      rail.scrollBy({ left: step, behavior: 'smooth' })
    }, 4500)

    return () => window.clearInterval(timer)
  }, [visibleBanners.length, isMobile])

  if (!visibleBanners.length) return null

  const isCarousel = isMobile ? visibleBanners.length > 1 : visibleBanners.length > 3

  return <section
    ref={isCarousel ? railRef : undefined}
    className={`promotion-banners${isCarousel ? ' promotion-banners-carousel' : ''}`}
    data-count={visibleBanners.length}
    aria-label="Featured promotions"
    aria-roledescription={isCarousel ? 'carousel' : undefined}
    onMouseEnter={() => { pauseRef.current = true }}
    onMouseLeave={() => { pauseRef.current = false }}
    onFocusCapture={() => { pauseRef.current = true }}
    onBlurCapture={() => { pauseRef.current = false }}
  >
    {visibleBanners.map((banner, index) => {
      const image = imageOf(banner)
      const video = videoOf(banner)
      const id = banner.id || banner._id || `${banner.title || 'promotion'}-${index}`
      const overlay = 'linear-gradient(90deg, rgba(255,255,255,.9), rgba(255,255,255,.18))'

      return <a
        className="promotion-banner"
        key={id}
        href={banner.link || banner.targetUrl || '#collection'}
        style={{ position: 'relative', backgroundImage: image ? `${overlay}, url(${JSON.stringify(image)})` : overlay }}
      >
        {video && <video src={video} poster={image || undefined} autoPlay muted loop playsInline aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        {video && <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: overlay }} />}
        <span className="promotion-copy" style={{ position: 'relative', zIndex: 1 }}>
          {banner.title && <strong>{banner.title}</strong>}
          {banner.subtitle && <small>{banner.subtitle}</small>}
          {(banner.cta || banner.buttonText) && <b>{banner.cta || banner.buttonText} <span aria-hidden="true">→</span></b>}
        </span>
      </a>
    })}
  </section>
}
