export default function PromotionBanners({ banners = [] }) {
  if (!banners.length) return null

  return <section className="promotion-banners" aria-label="Featured promotions">
    {banners.slice(0, 2).map(banner => <a
      className="promotion-banner"
      key={banner.id}
      href={banner.link || '#collection'}
      style={{ backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.92), rgba(255,255,255,.2)), url("${banner.image}")` }}
    >
      <span className="promotion-copy">
        <strong>{banner.title}</strong>
        {banner.subtitle && <small>{banner.subtitle}</small>}
        {banner.cta && <b>{banner.cta} <span>→</span></b>}
      </span>
    </a>)}
  </section>
}
