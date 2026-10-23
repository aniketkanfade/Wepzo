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
  return <ProductSection {...props} title="Products" hideTitle sectionId="collection" />
}

export function TrendingProductsSection({ city, ...props }) {
  return <ProductSection {...props} title={`Trending Products${city ? ` in ${city}` : ''}`} prefix="trending" sectionId="collection" />
}

const metric = (product, keys) => {
  for (const key of keys) {
    const value = Number(product?.[key])
    if (Number.isFinite(value) && value > 0) return value
  }
  return 0
}

export function CategoryRecommendationsSection({ products = [], categoryLabel, moduleSlug, interactions = {}, ...props }) {
  if (!products.length) return null
  const salesKeys = ['salesCount', 'soldCount', 'totalSold', 'unitsSold', 'orderCount', 'ordersCount', 'purchaseCount', 'purchases', 'sales']
  const reviewKeys = ['reviewCount', 'reviewsCount', 'totalReviews']
  const ratingOf = product => Number(product.rating || product.averageRating || 0)
  const reviewCountOf = product => metric(product, reviewKeys)
    || (Array.isArray(product.reviews) ? product.reviews.length : Number(product.reviews) || 0)
  const popular = [...products].sort((a, b) =>
    metric(b, salesKeys) - metric(a, salesKeys)
    || ratingOf(b) - ratingOf(a)
    || reviewCountOf(b) - reviewCountOf(a)
  ).slice(0, 6)
  const popularIds = new Set(popular.map(product => String(product._id || product.id || '')))
  const normalizeScope = value => String(value || '').trim().toLowerCase().replace(/\s*\/\s*/g, '/')
  const scopedInteractions = Object.fromEntries(Object.entries(interactions).filter(([, entry]) => categoryLabel
    ? normalizeScope(entry.categoryPath) === normalizeScope(categoryLabel)
      || normalizeScope(entry.categoryPath).startsWith(`${normalizeScope(categoryLabel)}/`)
    : moduleSlug
      ? String(entry.moduleSlug || '').toLowerCase() === String(moduleSlug).toLowerCase()
      : true
  ))
  const seenIds = new Set(Object.keys(scopedInteractions))
  const unseen = products.filter(product => !seenIds.has(String(product._id || product.id || '')))
  const distinctProducts = products.filter(product => !popularIds.has(String(product._id || product.id || '')))
  const unseenDistinct = unseen.filter(product => !popularIds.has(String(product._id || product.id || '')))
  const recommendationPool = unseenDistinct.length ? unseenDistinct : distinctProducts
  const recentInteractions = Object.values(scopedInteractions)
    .filter(entry => entry && (entry.categoryPath || entry.moduleSlug))
    .sort((a, b) => (Number(b.lastViewed) || 0) - (Number(a.lastViewed) || 0))
    .slice(0, 5)
  const productCategoryPath = product => [product.mainCategory || product.category, product.subCategory, product.childCategory]
    .filter(Boolean).join(' / ')
  const productModuleSlug = product => String(product.moduleSlug || product.module?.slug || (typeof product.module === 'string' ? product.module : ''))
    .trim().toLowerCase()
  const suitabilityScore = product => {
    const path = normalizeScope(productCategoryPath(product))
    const module = productModuleSlug(product)
    const affinity = recentInteractions.reduce((score, interaction, index) => {
      const weight = 1 / (index + 1)
      const previousPath = normalizeScope(interaction.categoryPath)
      const categoryMatch = path && previousPath && (path === previousPath || path.startsWith(`${previousPath}/`) || previousPath.startsWith(`${path}/`))
      const moduleMatch = module && String(interaction.moduleSlug || '').trim().toLowerCase() === module
      return score + (categoryMatch ? 3 * weight : 0) + (moduleMatch ? 2 * weight : 0)
    }, 0)
    return affinity * 4
      + ratingOf(product)
      + Math.log1p(metric(product, salesKeys)) * 0.6
      + Math.log1p(reviewCountOf(product)) * 0.5
  }
  const suitable = [...recommendationPool].sort((a, b) => {
    return suitabilityScore(b) - suitabilityScore(a)
  }).slice(0, 6)

  return <>
    <ProductSection {...props} title="Popular Products" products={popular} prefix="category-popular" />
    {suitable.length > 0 && <ProductSection {...props} title="Recommended for You" products={suitable} prefix="category-suitable" />}
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
