import { useEffect, useMemo, useState } from 'react'
import ProductCard from './ProductCard'
import { imageOf } from '../lib/storefront'

function ProductSection({ title, products, prefix, loading, error, onRetry, business, showFavorites, showCart, favorites, cartItem, toggleFavorite, changeQty, setMessage, canOpenDetails, setSelected, className = '', sectionId, hideTitle = false, gridClassName = 'product-grid grid grid-cols-6 gap-2' }) {
  return <section id={sectionId} className={`product-section ${className}`}>
    {!hideTitle && <div className="section-heading"><h2>{title}</h2></div>}
    {loading
      ? <div className="loading">Loading {hideTitle ? 'items' : title.toLowerCase()}...</div>
      : error
        ? <div className="error-box"><span>{error}</span><button onClick={onRetry}>Try again</button></div>
        : <div className={gridClassName}>
          {products.map((product, index) => <ProductCard key={`${prefix}-${product._id || product.id || index}`} {...{
            product, index, prefix, business, showFavorites, showCart, favorites, cartItem, toggleFavorite,
            changeQty, setMessage, canOpenDetails, setSelected,
          }} />)}
        </div>}
  </section>
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [days ? `${days}d` : '', `${String(hours).padStart(2, '0')}h`, `${String(minutes).padStart(2, '0')}m`, `${String(seconds).padStart(2, '0')}s`]
    .filter(Boolean).join(' ')
}

export function FlashDealsSection({ sales = [], products = [], ...props }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const deals = useMemo(() => sales.map(sale => {
    const start = sale.startDate ? new Date(sale.startDate).getTime() : null
    const end = sale.endDate ? new Date(sale.endDate).getTime() : null
    if (sale.status?.toLowerCase() === 'ended' || (end != null && (!Number.isFinite(end) || end <= now))) return null
    if (start != null && !Number.isFinite(start)) return null
    const upcoming = start != null && start > now
    if (upcoming && sale.status?.toLowerCase() !== 'active' && sale.status?.toLowerCase() !== 'scheduled') return null
    if (upcoming && end != null && end <= start) return null
    const saleProducts = (Array.isArray(sale.productItems) ? sale.productItems : []).map(item => {
      const key = String(item.productId || '')
      const product = products.find(entry => [entry.id, entry._id, entry.productId].some(id => id != null && String(id) === key))
      if (!product) return null
      const regularPrice = Number(item.price) || Number(product.mrp) || Number(product.price) || 0
      const salePrice = Number(item.salePrice) || regularPrice * (1 - (Number(item.discountPercent) || 0) / 100)
      return { ...product, mrp: regularPrice, salePrice, discount: Number(item.discountPercent) || 0 }
    }).filter(Boolean)
    if (!saleProducts.length) return null
    return { ...sale, start, end, upcoming, saleProducts }
  }).filter(Boolean), [sales, products, now])

  if (!deals.length) return null
  const activeDeals = deals.filter(deal => !deal.upcoming)
  const countdownDeal = (activeDeals.length ? activeDeals : deals)
    .filter(deal => activeDeals.length ? deal.end != null : deal.start != null)
    .sort((a, b) => (activeDeals.length ? a.end - b.end : a.start - b.start))[0]
  const visibleProducts = activeDeals.flatMap(deal => deal.saleProducts)
    .filter((product, index, list) => list.findIndex(entry => String(entry.id || entry._id || entry.productId) === String(product.id || product._id || product.productId)) === index)

  return <section id="collection" className="product-section">
    <div className="section-heading flex flex-wrap items-center justify-between gap-2">
      <h2>Flash Deals</h2>
      <span className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-semibold tabular-nums text-red-700" aria-live="off">
        {countdownDeal
          ? `${countdownDeal.upcoming ? 'Starts in' : 'Ends in'} ${formatCountdown((countdownDeal.upcoming ? countdownDeal.start : countdownDeal.end) - now)}`
          : 'Live now'}
      </span>
    </div>
    {activeDeals.length > 0 && (props.loading
      ? <div className="loading">Loading flash deals...</div>
      : props.error
        ? <div className="error-box"><span>{props.error}</span><button onClick={props.onRetry}>Try again</button></div>
        : <div className="product-grid deal-grid grid grid-cols-6 gap-2">
          {visibleProducts.map((product, index) => <ProductCard key={`deal-${product.id || product._id || product.productId || index}`} {...{
            product, index, prefix: 'deal', business: props.business, showFavorites: props.showFavorites, showCart: props.showCart,
            favorites: props.favorites, cartItem: props.cartItem, toggleFavorite: props.toggleFavorite, changeQty: props.changeQty,
            setMessage: props.setMessage, canOpenDetails: props.canOpenDetails, setSelected: props.setSelected,
          }} />)}
        </div>)}
  </section>
}

export function ProductGridSection(props) {
  return <ProductSection {...props} title="Products" hideTitle sectionId={props.sectionId ?? 'collection'} />
}

export function TrendingProductsSection({ city, ...props }) {
  return <ProductSection {...props} title={`Trending Products${city ? ` in ${city}` : ''}`} prefix="trending" sectionId="collection" />
}

export function CategoryRecommendationsSection({
  popularProducts = [], popularSections = [], recommendedProducts = [], recentlyViewedProducts = [], moduleLabel = '', categoryLabel = '', ...props
}) {
  if (!popularProducts.length && !popularSections.length && !recommendedProducts.length && !recentlyViewedProducts.length) return null
  const scope = categoryLabel || moduleLabel
  return <>
    {popularSections.length > 0
      ? popularSections.map(section => <ProductSection
        {...props}
        key={section.slug || section.id || section.name}
        title={`Popular in ${scope || section.name}`}
        products={section.products}
        prefix={`for-you-popular-${section.slug || section.id || section.name}`}
      />)
      : popularProducts.length > 0 && <ProductSection {...props} title={scope ? `Popular in ${scope}` : 'Popular Products'} products={popularProducts} prefix="for-you-popular" />}
    {recommendedProducts.length > 0 && <ProductSection {...props} title="Recommended for You" products={recommendedProducts} prefix="for-you-recommended" />}
    {recentlyViewedProducts.length > 0 && <ProductSection {...props} title="Recently Viewed" products={recentlyViewedProducts} prefix="for-you-recently-viewed" />}
  </>
}

export function WishlistSection({ products, favorites, ...props }) {
  const savedIds = new Set(favorites.map(String))
  return <ProductSection {...props} favorites={favorites} title="Wishlist" prefix="wishlist" sectionId="wishlist" products={products.filter(product => savedIds.has(String(product._id || product.id || '')))} />
}

export function StoresSection({ stores, visible }) {
  if (!visible) return null
  return <section className="product-section"><h2>Stores</h2><div className="product-grid grid grid-cols-4 gap-3">
    {stores.map(store => <article className="product-card" key={store.id}><h3>{store.name}</h3><p>{store.area}</p></article>)}
  </div></section>
}

export function BrandsSection({ brands, visible }) {
  if (!visible) return null
  return <section className="product-section"><h2>Brands</h2><div className="product-grid grid grid-cols-4 gap-3">
    {brands.map(brand => <article className="product-card" key={brand.id}>
      {brand.image && <img className="brand-logo" src={imageOf(brand)} alt="" />}<h3>{brand.name}</h3>
    </article>)}
  </div></section>
}

export function CartPageSection({ count, subtotal, money, business, onOpenCart, visible }) {
  if (!visible) return null
  return <section className="product-section"><h2>Your Cart</h2><p>{count} items · {money(subtotal, business)}</p>
    <button className="button button-orange" onClick={onOpenCart}>View cart</button>
  </section>
}

export function CheckoutSection({ onCheckout, visible }) {
  if (!visible) return null
  return <section className="product-section"><h2>Checkout</h2>
    <button className="button button-orange" onClick={onCheckout}>Continue to checkout</button>
  </section>
}

export function OrderTrackingSection({ onSignIn, visible }) {
  if (!visible) return null
  return <section className="product-section"><h2>Track your order</h2><p>Sign in to view your orders and delivery status.</p>
    <button className="button button-orange" onClick={onSignIn}>Sign in</button>
  </section>
}

export function GenericComponentSections({ components, products }) {
  return components.map((component, index) => <section className="product-section" key={component._id || component.slug || index}>
    <h2>{component.name || 'Website section'}</h2>
    {component.description && <p>{component.description}</p>}
    {component.type === 'gallery' && <div className="product-grid grid grid-cols-4 gap-3">
      {products.slice(0, 4).map(product => <img className="product-image" key={product._id || product.id} src={imageOf(product)} alt={product.name} />)}
    </div>}
  </section>)
}
