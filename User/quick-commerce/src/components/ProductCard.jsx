import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useCart } from '../store/cart';
import { useWishlist } from '../store/wishlist';

export default function ProductCard({ product, compact }) {
  const add = useCart(s => s.add);
  const wished = useWishlist(s => s.has(product?.id));
  const toggle = useWishlist(s => s.toggle);
  if (!product) return null;

  return (
    <div className={`qc-product-card bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition ${compact ? 'min-w-[160px] w-[160px]' : ''}`}>
      <Link to={`/p/${product.id}`} className="relative aspect-square bg-white p-3 block overflow-hidden">
        {product.discount > 0 && <span className="absolute top-2 left-2 z-10 text-[10px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-md">{product.discount}% OFF</span>}
        <button type="button" aria-label="Wishlist" onClick={e => { e.preventDefault(); e.stopPropagation(); toggle(product); }} className="absolute top-2 right-2 z-10 p-1 rounded-full bg-white/90 hover:bg-white shadow-sm">
          <Heart size={15} className={wished ? 'fill-rose-500 text-rose-500' : 'text-slate-300'} />
        </button>
        <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
      </Link>
      <div className="px-3 pb-3 flex-1 flex flex-col">
        <Link to={`/p/${product.id}`} className="text-[13px] font-medium text-slate-800 line-clamp-2 leading-snug min-h-[2.2em]">{product.name}</Link>
        <p className="text-[11px] text-slate-400 mt-0.5">{product.unit}</p>
        <p className="qc-product-rating"><span>&#9733;</span> {product.rating || '4.5'} <small>({product.reviewCount || '1.2k'})</small></p>
        <div className="mt-auto pt-2 flex items-center justify-between gap-1">
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="font-bold text-slate-900 text-sm">&#8377;{product.price}</span>
            {product.mrp > product.price && <span className="text-[11px] text-slate-400 line-through">&#8377;{product.mrp}</span>}
          </div>
          <button type="button" aria-label={'Add ' + product.name + ' to cart'} title="Add to cart" onClick={() => add(product)} className="qc-add-button shrink-0 text-white bg-brand-500 hover:bg-brand-600">+</button>
        </div>
      </div>
    </div>
  );
}