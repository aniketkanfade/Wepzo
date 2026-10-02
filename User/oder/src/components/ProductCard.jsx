import { formatINR, photo } from '../data/store.js'
import { getProductQuantityLimit } from '../utils/productLimits.js'

export default function ProductCard({ product, index, quantity, onQuantityChange }) {
  const quantityLimit = getProductQuantityLimit(product)
  const canAdd = quantity < quantityLimit
  const soldOut = quantityLimit === 0
  const optionDetail = product.size ? `Size: ${product.size}` : product.weight ? `Weight: ${product.weight}` : ''
  return <article className="product-card" key={product.id}>
    <div className={'product-image image-' + (index % 4)}><img src={photo(product.image)} alt={product.name} loading={index < 2 ? 'eager' : 'lazy'}/>{(soldOut || product.offerLabel || product.tag) && <span className="product-tag">{soldOut ? 'Sold out' : product.offerLabel || product.tag}</span>}<button className="quick-add" disabled={!canAdd} onClick={() => onQuantityChange(product, 1)} aria-label={'Add ' + product.name + ' to bag'}>+</button></div>
    <div className="product-info"><div className="product-title-line"><h3>{product.name}</h3><span className="price">{product.oldPrice && <del>{formatINR(product.oldPrice)}</del>}{formatINR(product.price)}</span></div><p>{product.category} <span>&middot;</span> {product.color}{optionDetail && <span> · {optionDetail}</span>}</p>{quantity > 0 ? <div className="quantity-control" aria-label={product.name + ' quantity'}><button className="quantity-minus" type="button" onClick={() => onQuantityChange(product, -1)} aria-label={'Remove one ' + product.name}>-</button><output className="quantity-value" aria-live="polite">{quantity}</output><button className="quantity-plus" type="button" disabled={!canAdd} onClick={() => onQuantityChange(product, 1)} aria-label={'Add one ' + product.name}>+</button></div> : <button className="add-button" disabled={!canAdd} onClick={() => onQuantityChange(product, 1)}>{soldOut ? 'Sold out' : <>Add to bag <span>+</span></>}</button>}</div>
  </article>
}
