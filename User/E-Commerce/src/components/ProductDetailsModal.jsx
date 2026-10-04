import { useEffect, useState } from 'react'
import { imageOf, money } from '../lib/storefront'

export default function ProductDetailsModal({ product, onClose, business, changeQty, setMessage }) {
  const [activeImage, setActiveImage] = useState(0)
  useEffect(() => setActiveImage(0), [product?.id])
  if (!product) return null

  const images = [...new Set([product.image, ...(product.images || []), ...(product.gallery || [])].filter(Boolean))]
  const specs = product.specs || product.specifications || {}
  const showVideo = activeImage === images.length && Boolean(product.video)

  return <div className="modal-backdrop fixed inset-0 z-30 flex items-center justify-center bg-slate-900/70 p-4" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <div className="product-modal">
      <button className="close modal-close" onClick={onClose}>×</button>
      <div className="detail-media-column">
        <div className="detail-art">
          {showVideo
            ? <video src={product.video} controls playsInline poster={images[0] ? imageOf({ image: images[0] }) : undefined} />
            : images[activeImage]
              ? <img src={imageOf({ image: images[activeImage] })} alt={`${product.name} view ${activeImage + 1}`} />
              : <div className="product-placeholder"><span>{product.name?.slice(0, 1)}</span><small>{product.category}</small></div>}
        </div>
        {(images.length > 1 || product.video) && <div className="detail-thumbnails">
          {images.map((image, index) => <button type="button" key={`${image}-${index}`} className={activeImage === index ? 'active' : ''} onClick={() => setActiveImage(index)} aria-label={`View image ${index + 1}`}>
            <img src={imageOf({ image })} alt="" />
          </button>)}
          {product.video && <button type="button" className={showVideo ? 'active video-thumb' : 'video-thumb'} onClick={() => setActiveImage(images.length)} aria-label="Play product video">▶ Video</button>}
        </div>}
      </div>
      <div className="detail-copy">
        <span className="eyebrow">{product.brand || product.category || 'THE EVERYDAY EDIT'}</span>
        <h2>{product.name}</h2>
        <strong>{money(product.price || product.salePrice, business)}</strong>
        {product.unit && <small className="detail-unit">Unit: {product.unit}</small>}
        <p>{product.description || product.shortDescription || 'Thoughtfully chosen for the little moments that make a home.'}</p>
        {product.variants?.length > 0 && <div className="detail-variants"><b>Available options</b><div>{product.variants.map(variant => <span key={variant.id}>{Object.values(variant.attributes || {}).join(' / ') || variant.sku}</span>)}</div></div>}
        {Object.keys(specs).length > 0 && <div className="detail-specs"><h3>Product specifications</h3><dl>{Object.entries(specs).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>)}</dl></div>}
        <button className="button button-dark wide" onClick={() => {
          changeQty(product, 1)
          onClose()
          setMessage('Added to your bag.')
        }}>Add to bag <span>&rarr;</span></button>
      </div>
    </div>
  </div>
}
