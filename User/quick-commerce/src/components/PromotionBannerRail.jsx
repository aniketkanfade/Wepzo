import { useEffect, useRef, useState } from 'react';

export default function PromotionBannerRail({ banners = [], label = 'Promotions' }) {
  const railRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 760);
  const visibleBanners = (Array.isArray(banners) ? banners : []).filter(banner => banner && (banner.image || banner.video || banner.title || banner.subtitle));
  const autoScroll = isMobile ? visibleBanners.length > 1 : visibleBanners.length > 3;

  useEffect(() => {
    const resize = () => setIsMobile(window.innerWidth <= 760);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (!autoScroll) return undefined;
    const timer = window.setInterval(() => {
      const rail = railRef.current;
      if (!rail || rail.dataset.paused === 'true') return;
      const card = rail.querySelector('.qc-promo-banner');
      if (!card) return;
      const gap = Number.parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap) || 0;
      const step = card.getBoundingClientRect().width + gap;
      if (rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8) rail.scrollTo({ left: 0, behavior: 'smooth' });
      else rail.scrollBy({ left: step, behavior: 'smooth' });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [autoScroll, visibleBanners.length]);

  if (!visibleBanners.length) return null;

  return <section
    ref={autoScroll ? railRef : undefined}
    className={`qc-promo-banners${autoScroll ? ' is-carousel' : ''}`}
    style={{ '--promo-count': Math.min(visibleBanners.length, 3) }}
    aria-label={label}
    onMouseEnter={() => { if (railRef.current) railRef.current.dataset.paused = 'true'; }}
    onMouseLeave={() => { if (railRef.current) railRef.current.dataset.paused = 'false'; }}
    onFocusCapture={() => { if (railRef.current) railRef.current.dataset.paused = 'true'; }}
    onBlurCapture={() => { if (railRef.current) railRef.current.dataset.paused = 'false'; }}
  >
    {visibleBanners.map((banner, index) => <a
      className="qc-promo-banner"
      key={banner.id || banner._id || `${banner.title || 'promo'}-${index}`}
      href={banner.link || banner.targetUrl || '#collection'}
      style={{ backgroundImage: banner.image ? `linear-gradient(90deg,rgba(255,255,255,.94),rgba(255,255,255,.2)),url(${JSON.stringify(banner.image)})` : 'linear-gradient(110deg,#fff3e5,#f4f7fc)' }}
    >
      {banner.video && <video src={banner.video} poster={banner.image || undefined} autoPlay muted loop playsInline aria-hidden="true" />}
      <span className="qc-promo-copy">
        {banner.eyebrow && <small>{banner.eyebrow}</small>}
        {banner.title && <strong>{banner.title}</strong>}
        {banner.subtitle && <span>{banner.subtitle}</span>}
        {(banner.cta || banner.buttonText) && <b>{banner.cta || banner.buttonText} <span aria-hidden="true">→</span></b>}
      </span>
    </a>)}
  </section>;
}
