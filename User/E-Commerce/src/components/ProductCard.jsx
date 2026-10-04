import { imageOf, money } from '../lib/storefront'

export default function ProductCard({ product, index, prefix, business, showFavorites, showCart, favorites, cartItem, toggleFavorite, changeQty, setMessage, canOpenDetails, setSelected }) {
  const productId = product._id || product.id
  const itemInCart = cartItem(productId)

  return <article className="product-card overflow-hidden rounded-lg border border-slate-200 bg-white p-2 shadow-sm" key={`${prefix}-${productId || index}`}>
    <button className="product-image" onClick={() => canOpenDetails && setSelected(product)}>
      {imageOf(product)
        ? <img src={imageOf(product)} alt={product.name} />
        : <div className={`product-placeholder tone-${index % 5}`}><span>{product.name?.slice(0, 1)}</span></div>}
      {Number(product.discount) > 0 && <span className="sale-badge">{Math.round(product.discount)}% OFF</span>}
    </button>
    <div className="product-meta"><div><h3>{product.name}</h3></div><b>{money(product.price, business)}</b></div>
    {showFavorites && <button type="button" className="favorite-toggle" onClick={() => toggleFavorite(product)}>
      {favorites.includes(productId) ? 'Saved' : 'Save'}
    </button>}
    {showCart && <button className="add-button w-full rounded bg-orange-600 font-semibold text-white" onClick={() => {
      changeQty(product, 1)
      setMessage('Added to cart.')
    }}>{itemInCart ? `Added Â· ${itemInCart.qty} +` : 'Add to Cart'}</button>}
  </article>
}
