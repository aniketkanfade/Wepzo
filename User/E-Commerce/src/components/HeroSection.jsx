import { imageOf } from '../lib/storefront'

export default function HeroSection({ banner, deals, visible }) {
  if (!visible) return null

  return <section className={`hero ${banner?.image ? 'hero-has-image' : ''}`} style={banner?.image ? {
    backgroundImage: `linear-gradient(90deg, rgba(255,246,237,.96) 0%, rgba(255,246,237,.82) 38%, rgba(255,246,237,0) 68%), url("${imageOf(banner)}")`,
  } : undefined}>
    <button className="hero-arrow hero-prev" aria-label="Previous banner">â€¹</button>
    <div className="hero-copy relative z-10">
      <span className="eyebrow">{banner?.subtitle || 'TOP BRANDS  |  BEST PRICES  |  FAST DELIVERY'}</span>
      <h1>{banner?.title || <>Upgrade Your <em>Lifestyle</em></>}</h1>
      <p>{banner?.subtitle ? 'Find everyday favourites at prices you will love.' : 'Top Brands  |  Best Prices  |  Fast Delivery'}</p>
      <a href="#collection" className="button button-orange inline-flex items-center justify-center rounded bg-orange-600 px-5 font-semibold text-white transition hover:bg-orange-700">
        {banner?.cta || 'Shop Now'} <span>â†’</span>
      </a>
    </div>
    {!banner?.image && <div className="hero-products" aria-hidden="true">
      {deals.slice(0, 3).map((item, index) => item && <div key={item._id || index} className={`hero-product hero-product-${index}`}>
        {imageOf(item) ? <img src={imageOf(item)} alt="" /> : <span>{item.name?.slice(0, 1)}</span>}
      </div>)}
      <div className="hero-plant">âœ¦</div>
    </div>}
    <button className="hero-arrow hero-next" aria-label="Next banner">â€º</button>
    <div className="hero-dots"><i className="active"/><i/><i/></div>
  </section>
}
