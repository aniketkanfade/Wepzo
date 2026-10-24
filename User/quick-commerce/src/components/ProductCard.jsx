import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useCart } from '../store/cart';
import { useWishlist } from '../store/wishlist';
import { formatMoney, useSiteSettings } from '../store/siteSettings';

function formatCardLabel(value) {
  const label = String(value || '').trim();
  if (!label || label !== label.toUpperCase()) return label;
  return label.toLowerCase().replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

export default function ProductCard({ product, compact, showWishlistRemove = false }) {
  const add = useCart(s => s.add);
  const setQty = useCart(s => s.setQty);
  const toggleWishlist = useWishlist(s => s.toggle);
  const cartKey = product.variantId ? `${product.id}::${product.variantId}` : String(product.id);
  const cartItem = useCart(s => s.items.find(item => String(item.cartKey || item.id) === cartKey));
  const [showAdded, setShowAdded] = useState(false);
  useEffect(() => {
    if (!showAdded) return undefined;
    const timer = window.setTimeout(() => setShowAdded(false), 1800);
    return () => window.clearTimeout(timer);
  }, [showAdded]);
  const business = useSiteSettings(s => s.business);
  if (!product) return null;
  const name = formatCardLabel(product.name);
  const unit = formatCardLabel(product.unit);
  const hasDiscount = Number(product.mrp) > Number(product.price);
  const savings = hasDiscount ? Number(product.mrp) - Number(product.price) : 0;
  const cardControl = cartItem ? <div className="qc-card-quantity" aria-label={`${cartItem.qty} ${name} in cart`}>
    <button type="button" aria-label={`Decrease ${name} quantity`} onClick={() => setQty(cartKey, cartItem.qty - 1)}>-</button>
    <span>{cartItem.qty}</span>
    <button type="button" aria-label={`Increase ${name} quantity`} onClick={() => setQty(cartKey, cartItem.qty + 1)}>+</button>
  </div> : <button type="button" aria-label={'Add ' + name + ' to cart'} title="Add to cart" onClick={() => { if (add(product)) setShowAdded(true); }} className="qc-add-button shrink-0"><span aria-hidden="true">+</span><span className="qc-add-button-label">Add</span></button>;

  return (
    <div className={`qc-product-card bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col ${compact ? 'min-w-[160px] w-[160px]' : ''}`}>
      <div className="qc-product-image-wrap relative">
        <Link to={`/p/${product.id}`} className="relative aspect-square bg-white p-3 block overflow-hidden">
          {product.discount > 0 && <span className="qc-product-discount-badge absolute z-10">{product.discount}% <span className="qc-product-discount-off">OFF</span></span>}
          {Number.isFinite(Number(product.visualSimilarity)) && <span className="absolute bottom-2 left-2 z-10 rounded-md bg-emerald-700/90 px-1.5 py-1 text-[9px] font-bold text-white">{Math.round(product.visualSimilarity * 100)}% image match</span>}
          {product.image
            ? <img src={product.image} alt={name} loading="lazy" decoding="async" className="w-full h-full object-contain" />
            : <div role="img" aria-label={`${name} image unavailable`} className="grid h-full w-full place-items-center rounded-xl bg-slate-100 text-4xl font-semibold text-slate-400">{name.slice(0, 1)}</div>}
        </Link>
        {showWishlistRemove && <button type="button" onClick={() => toggleWishlist(product)} aria-label={`Remove ${name} from favorites`} title="Remove from favorites" className="qc-wishlist-remove absolute left-2 top-2 z-20 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-rose-600 shadow-sm hover:bg-rose-50">
          <Trash2 size={14} />
        </button>}
        <div className="qc-card-control qc-image-control">{cardControl}</div>
      </div>
      <div className="px-3 pb-3 flex-1 flex flex-col">
        {product.store && <span className="qc-product-store text-[10px] font-semibold text-slate-500 line-clamp-1">{product.store}</span>}
        <Link to={`/p/${product.id}`} title={name} className="qc-product-name text-[13px] font-medium text-slate-800 leading-snug">{name}</Link>
        <p className="qc-product-unit qc-product-unit-mobile text-[11px] text-slate-400 mt-0.5">{unit}</p>
        <div className="qc-product-card-footer mt-auto pt-2 flex items-center justify-between gap-1">
          <div className="qc-product-card-prices flex min-w-0 flex-col items-start gap-0.5">
            <span className="qc-product-unit qc-product-unit-desktop">{unit}</span>
            <div className="qc-product-card-price-line">
              <span className="qc-product-mrp text-[11px] text-slate-400 line-through">{hasDiscount ? formatMoney(product.mrp, business) : ''}</span>
              <span className="qc-product-price font-bold text-slate-900 text-sm">{formatMoney(product.price, business)}</span>
            </div>
            <span className="qc-product-savings" aria-hidden={!hasDiscount} style={hasDiscount ? undefined : { visibility: 'hidden' }}>
              {hasDiscount ? `Save ${formatMoney(savings, business)} off` : '\u00a0'}
            </span>
          </div>
        </div>
      </div>
      {showAdded && <div className="qc-card-added-toast" role="status" aria-live="polite">✓ Added to cart</div>}
    </div>
  );
}
