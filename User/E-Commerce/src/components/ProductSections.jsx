import ProductCard from './ProductCard'
import { imageOf } from '../lib/storefront'

function ProductSection({ title, products, prefix, loading, error, onRetry, business, showFavorites, showCart, favorites, cartItem, toggleFavorite, changeQty, setMessage, canOpenDetails, setSelected, className = '', sectionId, gridClassName = 'product-grid grid grid-cols-6 gap-2' }) {
  return <section id={sectionId} className={`product-section ${className}`}>
    <div className="section-heading"><h2>{title}</h2></div>
    {loading
      ? <div className="loading">Loading {title.toLowerCase()}...</div>
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

export function FlashDealsSection(props) {
  return <ProductSection {...props} title="Flash Deals" sectionId="collection" gridClassName="product-grid deal-grid grid grid-cols-6 gap-2" />
}

export function ProductGridSection(props) {
  return <ProductSection {...props} title="Products" sectionId="collection" />
}

export function TrendingProductsSection({ city, ...props }) {
  return <ProductSection {...props} title={`Trending Products${city ? ` in ${city}` : ''}`} prefix="trending" sectionId="collection" />
}

export function WishlistSection({ products, favorites, ...props }) {
  return <ProductSection {...props} title="Wishlist" prefix="wishlist" sectionId="wishlist" products={products.filter(product => favorites.includes(product._id || product.id))} />
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
