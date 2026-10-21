import { useState } from 'react'
import { createPortal } from 'react-dom'
import { imageOf, money } from '../lib/storefront'

export default function ProductCard({ product, index, prefix, business, showFavorites, showCart, favorites = [], cartItem, toggleFavorite, changeQty, setMessage, canOpenDetails, setSelected }) {
  const productId = product._id || product.id
  const itemInCart = cartItem(productId)
  const variants = Array.isArray(product.variants) ? product.variants.filter(Boolean) : []
  const [variantPickerOpen, setVariantPickerOpen] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const salePrice = Number(product.salePrice ?? product.price ?? 0)
  const discountRate = Number(product.discount) || 0
  const recordedRegularPrice = Number(product.mrp ?? product.originalPrice ?? product.regularPrice ?? 0)
  const regularPrice = recordedRegularPrice || (discountRate > 0 && discountRate < 100 ? Math.round(salePrice / (1 - discountRate / 100)) : 0)
  const hasDiscount = regularPrice > salePrice
  const discountPercent = hasDiscount ? Math.round((regularPrice - salePrice) * 100 / regularPrice) : discountRate
  const getVariantId = (variant, variantIndex) => variant.id || variant._id || `v-${variantIndex}`
  const getVariantLabel = variant => {
    const attributes = Object.entries(variant.attributes || {}).filter(([, value]) => value != null && value !== '')
    if (attributes.length) return attributes.map(([key, value]) => `${key}: ${value}`).join(' · ')
    return variant.color || variant.size || variant.label || variant.name || variant.sku || 'Option'
  }
  const selectedVariantIndex = variants.findIndex((variant, variantIndex) => getVariantId(variant, variantIndex) === selectedVariantId)
  const selectedVariant = selectedVariantIndex >= 0 ? variants[selectedVariantIndex] : null
  const variantImage = variant => variant.image || variant.imageUrl || variant.thumbnail || variant.images?.[0] || ''
  const addProduct = variant => {
    const variantIndex = variant ? variants.indexOf(variant) : -1
    const variantId = variant ? getVariantId(variant, variantIndex) : ''
    const variantLabel = variant ? getVariantLabel(variant) : ''
    const price = Number(variant?.price ?? variant?.salePrice ?? salePrice)
    const image = variantImage(variant || {})
    changeQty({
      ...product,
      price,
      salePrice: price,
      image: image ? imageOf({ image }) : imageOf(product),
      variantId: variantId || null,
      variantLabel,
    }, 1)
    setMessage(variantLabel ? `Added to cart · ${variantLabel}` : 'Added to cart.')
    setVariantPickerOpen(false)
    setSelectedVariantId('')
  }
  const openVariantPicker = () => {
    setSelectedVariantId('')
    setVariantPickerOpen(true)
  }
  const isFavorite = favorites.includes(String(productId ?? ''))
  const configuredCartButtonStyle = business?.themeColors?.productCartButtonStyle
  const cartButtonStyle = configuredCartButtonStyle === 'quantity' || configuredCartButtonStyle === 'bottom-quantity' ? 'image' : configuredCartButtonStyle || 'image'
  const imageButtonLabel = business?.themeColors?.productImageButtonLabel === 'plus' ? '+' : 'Add'

  return <article className={`product-card overflow-hidden rounded-lg border border-slate-200 bg-white p-2 shadow-sm${cartButtonStyle === 'image' ? ' product-card-add-below-image' : ''}`} key={`${prefix}-${productId || index}`}>
    <div className="product-image-wrap">
      <button type="button" className="product-image" aria-label={`View ${product.name}`} disabled={!canOpenDetails} onClick={() => setSelected(product)}>
        {imageOf(product)
          ? <img src={imageOf(product)} alt={product.name} />
          : <div className={`product-placeholder tone-${index % 5}`}><span>{product.name?.slice(0, 1)}</span></div>}
        {discountPercent > 0 && <span className="sale-badge">{discountPercent}% <span className="sale-badge-label">OFF</span></span>}
      </button>
      {showFavorites && <button type="button" className={`favorite-toggle${isFavorite ? ' active' : ''}`} aria-label={isFavorite ? `Remove ${product.name} from saved items` : `Save ${product.name}`} aria-pressed={isFavorite} onClick={() => toggleFavorite(product)}>{isFavorite ? '♥' : '♡'}</button>}
      {showCart && cartButtonStyle === 'image' && (itemInCart
        ? <div className="product-image-quantity" aria-label={`${itemInCart.qty} in cart`} onClick={event => event.stopPropagation()}>
          <button type="button" aria-label={`Remove one ${product.name}`} onClick={() => changeQty({ ...product, variantId: itemInCart.variantId }, -1)}>−</button>
          <span>{itemInCart.qty}</span>
          <button type="button" aria-label={`Add one ${product.name}`} onClick={() => variants.length ? openVariantPicker() : addProduct(null)}>+</button>
        </div>
        : <button type="button" className={`product-image-add${imageButtonLabel === '+' ? ' product-image-add--plus' : ''}`} aria-label={`Add ${product.name} to cart`} onClick={event => { event.stopPropagation(); variants.length ? openVariantPicker() : addProduct(null) }}>{imageButtonLabel}</button>)}
    </div>
    <div className="product-meta">
      <div className="product-name">
        <h3>{product.name}</h3>
        <div className="product-prices">
          {hasDiscount && <del>{money(regularPrice, business)}</del>}
          <b>{money(salePrice, business)}</b>
        </div>
        {hasDiscount && <small className="product-savings">Save {money(regularPrice - salePrice, business)} ({discountPercent}% off)</small>}
      </div>
    </div>
    {showCart && cartButtonStyle === 'image' && (itemInCart
      ? <div className="product-image-quantity" aria-label={`${itemInCart.qty} in cart`}>
        <button type="button" aria-label={`Remove one ${product.name}`} onClick={() => changeQty({ ...product, variantId: itemInCart.variantId }, -1)}>−</button>
        <span>{itemInCart.qty}</span>
        <button type="button" aria-label={`Add one ${product.name}`} onClick={() => variants.length ? openVariantPicker() : addProduct(null)}>+</button>
      </div>
      : <button type="button" className="product-image-add" aria-label={`Add ${product.name} to cart`} onClick={() => variants.length ? openVariantPicker() : addProduct(null)}>Add</button>)}
    {showCart && cartButtonStyle === 'bottom' && (itemInCart
      ? <div className="product-cart-quantity" aria-label={`${itemInCart.qty} in cart`}>
        <button type="button" aria-label={`Remove one ${product.name}`} onClick={() => changeQty({ ...product, variantId: itemInCart.variantId }, -1)}>−</button>
        <span>{itemInCart.qty}</span>
        {variants.length
          ? <button type="button" aria-label={`Choose another option for ${product.name}`} onClick={openVariantPicker}>+</button>
          : <button type="button" aria-label={`Add one ${product.name}`} onClick={() => addProduct(null)}>+</button>}
      </div>
      : <button type="button" className="add-button w-full rounded bg-orange-600 font-semibold text-white" onClick={() => variants.length ? openVariantPicker() : addProduct(null)}>Add to Cart</button>)}
    {variantPickerOpen && createPortal(<div className="variant-picker-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setVariantPickerOpen(false) }}>
      <section className="variant-picker-dialog" role="dialog" aria-modal="true" aria-labelledby={`variant-title-${productId}`}>
        <div className="variant-picker-heading">
          <div><span className="eyebrow">Select an option</span><h2 id={`variant-title-${productId}`}>{product.name}</h2></div>
          <button type="button" className="close" aria-label="Close option picker" onClick={() => setVariantPickerOpen(false)}>×</button>
        </div>
        <div className="variant-picker-options">
          {variants.map((variant, variantIndex) => {
            const id = getVariantId(variant, variantIndex)
            const thumbnail = variantImage(variant)
            const outOfStock = variant.stock != null && Number(variant.stock) <= 0
            return <button
              type="button"
              key={id}
              className={`variant-picker-option${selectedVariantId === id ? ' active' : ''}`}
              aria-pressed={selectedVariantId === id}
              disabled={outOfStock}
              onClick={() => setSelectedVariantId(id)}
            >
              {thumbnail && <img src={imageOf({ image: thumbnail })} alt="" />}
              <span>{getVariantLabel(variant)}</span>
              {outOfStock && <small>Out of stock</small>}
            </button>
          })}
        </div>
        <div className="variant-picker-footer">
          {selectedVariant
            ? <span>{money(selectedVariant.price ?? selectedVariant.salePrice ?? salePrice, business)}</span>
            : <span>Choose a size or color to continue</span>}
          <button type="button" className="button button-orange" disabled={!selectedVariant} onClick={() => selectedVariant && addProduct(selectedVariant)}>Add selected</button>
        </div>
      </section>
    </div>, document.body)}
  </article>
}
