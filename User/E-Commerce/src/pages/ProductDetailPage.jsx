import { useEffect, useState } from 'react'
import ProductCard from '../components/ProductCard'
import { imageOf, money, videoOf } from '../lib/storefront'

function DetailIcon({ name, size = 18 }) {
  const shared = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'chevron') return <svg {...shared}><path d="m6 9 6 6 6-6" /></svg>
  if (name === 'minus') return <svg {...shared}><path d="M5 12h14" /></svg>
  if (name === 'plus') return <svg {...shared}><path d="M12 5v14M5 12h14" /></svg>
  if (name === 'cart') return <svg {...shared}><path d="M3 4h2l2.2 11h11.4L21 8H6" /><circle cx="9" cy="19" r="1" /><circle cx="18" cy="19" r="1" /></svg>
  return <svg {...shared} fill="currentColor" stroke="none"><path d="M13.2 1.8 4.1 13h6.2l-.7 9.2L20 10.1h-6.3l-.5-8.3Z" /></svg>
}

function displayValue(value) {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) return value.join(', ')
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

const asList = value => Array.isArray(value) ? value : value ? [value] : []

export default function ProductDetailPage({ product, relatedProducts, business, onClose, productCardProps }) {
  const [activeImage, setActiveImage] = useState(0)
  const [zoomOrigin, setZoomOrigin] = useState('50% 50%')
  const [openSections, setOpenSections] = useState({ details: true })
  const [quantity, setQuantity] = useState(1)
  const [selectedVariantId, setSelectedVariantId] = useState('')
  useEffect(() => {
    setActiveImage(0)
    setZoomOrigin('50% 50%')
    setOpenSections({})
    setQuantity(1)
    const firstVisibleVariant = product?.variants?.find(variant => variant && (
      variant.name || variant.label || variant.color || variant.sku || Object.keys(variant.attributes || {}).length
    ))
    const firstIndex = firstVisibleVariant ? product.variants.indexOf(firstVisibleVariant) : -1
    setSelectedVariantId(firstVisibleVariant?.id || firstVisibleVariant?.sku || (firstIndex >= 0 ? `variant-${firstIndex}` : ''))
  }, [product?._id, product?.id])
  if (!product) return null

  const variants = (product.variants || []).filter(variant => variant && (
    variant.name || variant.label || variant.color || variant.sku || Object.keys(variant.attributes || {}).length
  ))
  const variantImage = variant => variant?.image || variant?.imageUrl || variant?.thumbnail || ''
  const images = [...new Set([
    product.image,
    ...asList(product.images),
    ...asList(product.gallery),
    ...variants.map(variantImage),
  ].map(image => imageOf({ image })).filter(Boolean))]
  const productVideo = videoOf(product)
  const hasThumbnailRail = images.length > 1 || Boolean(productVideo)
  const selectedVariant = variants.find(variant => (variant.id || variant.sku || `variant-${product.variants.indexOf(variant)}`) === selectedVariantId) || variants[0]
  const specs = {
    ...(product.specs || product.specifications || {}),
    ...(selectedVariant?.specs || selectedVariant?.specifications || {}),
  }
  const currentImage = images[activeImage] || images[0]
  const selectedReviews = selectedVariant?.reviews ?? product.reviews
  const reviewCount = Array.isArray(selectedReviews) ? selectedReviews.length : Number(selectedVariant?.reviewCount || selectedVariant?.reviewsCount || product.reviewCount || product.reviewsCount || selectedReviews || 0)
  const rating = Number(selectedVariant?.rating ?? product.rating ?? 0)
  const toggleSection = key => setOpenSections(current => ({ ...current, [key]: !current[key] }))
  const section = (key, title, content) => <section className="product-detail-accordion" key={key}>
    <button type="button" aria-expanded={Boolean(openSections[key])} onClick={() => toggleSection(key)}>
      <span>{title}</span><span className={`product-detail-chevron ${openSections[key] ? 'open' : ''}`}><DetailIcon name="chevron" size={18} /></span>
    </button>
    {openSections[key] && <div className="product-detail-accordion-content">{content}</div>}
  </section>
  const displayPrice = Number(selectedVariant?.price ?? product.price ?? product.salePrice) || 0
  const displayMrp = Number(selectedVariant?.mrp ?? product.mrp ?? product.originalPrice) || displayPrice
  const discount = displayMrp > displayPrice ? Math.round((displayMrp - displayPrice) * 100 / displayMrp) : Number(product.discount) || 0
  const stockValue = selectedVariant?.stock ?? product.stock
  const stockKnown = stockValue !== null && stockValue !== undefined && stockValue !== '' && Number.isFinite(Number(stockValue))
  const stock = stockKnown ? Math.max(0, Number(stockValue)) : null
  const outOfStock = stockKnown && stock === 0
  const displayBrand = selectedVariant?.brand || product.brand
  const displayUnit = selectedVariant?.unit || product.unit
  const variantLabel = variant => {
    const color = Object.entries(variant.attributes || {}).find(([key, value]) => /colou?r|shade/i.test(key) && value)
    return color?.[1] || variant.color || variant.label || variant.name || Object.values(variant.attributes || {}).filter(Boolean).join(' / ') || variant.sku || 'Option'
  }
  const cartProduct = {
    ...product,
    price: displayPrice,
    salePrice: displayPrice,
    image: variantImage(selectedVariant) ? imageOf({ image: variantImage(selectedVariant) }) : (currentImage ? imageOf({ image: currentImage }) : imageOf(product)),
    variantId: selectedVariant ? (selectedVariant.id || selectedVariant._id || `v-${product.variants.indexOf(selectedVariant)}`) : null,
    variantLabel: selectedVariant ? variantLabel(selectedVariant) : '',
  }
  const addToCart = () => {
    if (outOfStock) return
    productCardProps.changeQty(cartProduct, quantity)
    productCardProps.setMessage('Added to cart.')
  }
  const buyNow = () => {
    if (outOfStock) return
    productCardProps.changeQty(cartProduct, quantity)
    productCardProps.setCheckout(true)
    productCardProps.setCartOpen(true)
  }
  const variantHighlightEntries = selectedVariant?.highlights
    ? Array.isArray(selectedVariant.highlights)
      ? selectedVariant.highlights.map(item => Array.isArray(item) ? item : [item.label || item.name || '', item.value || item.description || ''])
      : Object.entries(selectedVariant.highlights)
    : []
  const variantAttributeEntries = Object.entries(selectedVariant?.attributes || {})
  const productHighlightEntries = product.highlights
    ? Array.isArray(product.highlights)
      ? product.highlights.map(item => Array.isArray(item) ? item : [item.label || item.name || '', item.value || item.description || ''])
      : Object.entries(product.highlights)
    : []
  const highlightMap = new Map()
  const addHighlights = entries => entries.forEach(([key, value]) => {
    const label = String(key || '').trim()
    if (label && value != null && value !== '') highlightMap.set(label.toLowerCase(), [label, value])
  })
  addHighlights([
    ['Brand', product.brand],
    ['Product Type', product.category || product.mainCategory],
    ['Unit', product.unit],
    ['Material', product.material],
    ['Color', product.color],
    ...Object.entries(product.attributes || {}),
    ...productHighlightEntries,
  ])
  addHighlights([
    ['Brand', selectedVariant?.brand],
    ['Product Type', selectedVariant?.category],
    ['Unit', selectedVariant?.unit],
    ['Material', selectedVariant?.material],
    ['Color', selectedVariant?.color],
    ...variantAttributeEntries,
    ...variantHighlightEntries,
  ])
  const highlights = [...highlightMap.values()]
  const detailText = selectedVariant?.description || selectedVariant?.shortDescription || selectedVariant?.shortDesc || product.description || product.shortDescription || product.shortDesc
  const warrantyText = selectedVariant?.warranty || selectedVariant?.guarantee || selectedVariant?.returnPolicy || product.warranty || product.guarantee || product.returnPolicy

  return <main className="product-detail-page mx-auto w-full max-w-[1800px] px-3 py-5 sm:px-5 md:px-8 md:py-8">
    <div className="mb-5 flex items-center justify-between gap-3 text-sm">
      <div className="text-slate-500"><a href={`/${window.location.search}`} className="hover:text-orange-600">Home</a><span className="px-2">/</span><span className="text-slate-800">{product.name}</span></div>
      <button type="button" onClick={onClose} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50">Back to products</button>
    </div>

    <section className="product-detail-layout grid items-start gap-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-2 md:gap-10 md:p-7">
      <div className={`product-detail-gallery min-w-0 ${hasThumbnailRail ? 'has-thumbnails' : ''}`}>
        {hasThumbnailRail && <div className="product-detail-thumbnails" aria-label="Product images">
          {images.map((image, index) => <button type="button" key={`${image}-${index}`} onClick={() => setActiveImage(index)} aria-label={`View image ${index + 1}`} aria-pressed={activeImage === index} className={activeImage === index ? 'active' : ''}><img src={imageOf({ image })} alt="" /></button>)}
          {productVideo && <button type="button" onClick={() => setActiveImage(images.length)} aria-label="View product video" aria-pressed={activeImage === images.length} className={`product-detail-video-thumb ${activeImage === images.length ? 'active' : ''}`}>Video</button>}
        </div>}
        <div className="product-detail-main-image grid place-items-center overflow-hidden rounded-xl bg-white" onMouseMove={event => {
          const bounds = event.currentTarget.getBoundingClientRect()
          setZoomOrigin(`${((event.clientX - bounds.left) / bounds.width) * 100}% ${((event.clientY - bounds.top) / bounds.height) * 100}%`)
        }} onMouseLeave={() => setZoomOrigin('50% 50%')}>
          {productVideo && activeImage === images.length
            ? <video src={productVideo} controls playsInline poster={images[0] || undefined} />
            : currentImage ? <img src={currentImage} alt={product.name} style={{ transformOrigin: zoomOrigin }} /> : <div className="product-placeholder"><span>{product.name?.slice(0, 1)}</span></div>}
        </div>
      </div>

      <div className="product-detail-copy min-w-0 self-start">
        <span className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{product.category || product.mainCategory || 'Featured product'}</span>
        <h1 className="mt-2 text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">{product.name}</h1>
        {(displayBrand || displayUnit) && <p className="product-detail-meta">{displayBrand && <span>Brand: {displayBrand}</span>}{displayUnit && <span>Unit: {displayValue(displayUnit)}</span>}</p>}
        <div className="product-detail-price-line">
          <strong>{money(displayPrice, business)}</strong>
          {displayMrp > displayPrice && <del>{money(displayMrp, business)}</del>}
          {discount > 0 && <span>{discount}% OFF</span>}
        </div>
        <p className="product-detail-tax">Inclusive of all taxes</p>
        {(product.deliveryEta || product.deliveryTime) && <p className="product-detail-delivery">{product.deliveryEta || product.deliveryTime}</p>}
        {stockKnown && <p className={`product-detail-stock ${outOfStock ? 'out' : ''}`}>{outOfStock ? 'Out of stock' : stock <= 5 ? `Only ${stock} left in stock` : 'In stock'}</p>}

        {variants.length > 0 && <div className="product-detail-variants">
          <h2>{product.variantLabel || 'Available options'}</h2>
          <div>{variants.map(variant => {
            const id = variant.id || variant.sku || `variant-${product.variants.indexOf(variant)}`
            const selected = id === selectedVariantId
            const thumbnail = variantImage(variant)
            const thumbnailSrc = thumbnail ? imageOf({ image: thumbnail }) : ''
            return <button type="button" key={id} onClick={() => { setSelectedVariantId(id); if (thumbnailSrc) { const imageIndex = images.indexOf(thumbnailSrc); if (imageIndex >= 0) setActiveImage(imageIndex) } }} className={selected ? 'active' : ''} aria-pressed={selected}>
              {thumbnailSrc && <img src={thumbnailSrc} alt="" />}
              <span>{variantLabel(variant)}</span>
            </button>
          })}</div>
        </div>}

        <div className="product-detail-buy-row">
          <div className="product-detail-quantity" aria-label="Quantity selector">
            <button type="button" onClick={() => setQuantity(value => Math.max(1, value - 1))} disabled={quantity <= 1} aria-label="Decrease quantity"><DetailIcon name="minus" size={16} /></button>
            <span>{quantity}</span>
            <button type="button" onClick={() => setQuantity(value => stockKnown ? Math.min(value + 1, Math.max(stock, 1)) : value + 1)} disabled={stockKnown && quantity >= stock} aria-label="Increase quantity"><DetailIcon name="plus" size={16} /></button>
          </div>
          <button type="button" onClick={addToCart} disabled={outOfStock} className="product-detail-add-button"><DetailIcon name="cart" size={18} /> Add to Cart</button>
        </div>
        <button type="button" onClick={buyNow} disabled={outOfStock} className="product-detail-buy-now"><DetailIcon name="zap" size={17} /> Buy Now</button>

        {highlights.length > 0 && section('highlights', 'Highlights', <dl className="product-detail-spec-list">{highlights.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{displayValue(value)}</dd></div>)}</dl>)}
        {detailText && section('details', 'Product Details', <p className="product-detail-description">{detailText}</p>)}
        {Object.keys(specs).length > 0 && section('specs', 'Specifications', <dl className="product-detail-spec-list">{Object.entries(specs).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{displayValue(value)}</dd></div>)}</dl>)}
        {warrantyText && section('warranty', 'Warranty & Returns', <p className="product-detail-description">{warrantyText}</p>)}
        {(rating > 0 || reviewCount > 0) && section('reviews', `Reviews${reviewCount ? ` (${reviewCount})` : ''}`, <div className="product-detail-description"><p><strong>{rating > 0 ? `${rating.toFixed(1)} / 5` : ''}</strong>{reviewCount ? `${rating > 0 ? ' · ' : ''}${reviewCount} reviews` : ''}</p></div>)}
      </div>
    </section>

    {relatedProducts.length > 0 && <section className="mt-10">
      <div className="mb-4"><h2 className="text-xl font-bold text-slate-900">Related products</h2><p className="mt-1 text-sm text-slate-500">More products you may like</p></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">{relatedProducts.map((item, index) => <ProductCard key={`related-${item._id || item.id}`} product={item} index={index} prefix="related" {...productCardProps} />)}</div>
    </section>}
  </main>
}
