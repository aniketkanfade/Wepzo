import { Link } from 'react-router-dom';
import { useCart } from '../store/cart';
import { formatMoney, useSiteSettings } from '../store/siteSettings';

function formatCardLabel(value) {
  const label = String(value || '').trim();
  if (!label || label !== label.toUpperCase()) return label;
  return label.toLowerCase().replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

export default function ProductCard({ product, compact }) {
  const add = useCart(s => s.add);
  const business = useSiteSettings(s => s.business);
  if (!product) return null;
  const name = formatCardLabel(product.name);
  const unit = formatCardLabel(product.unit);

  return (
    <div className={`qc-product-card bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-200 ${compact ? 'min-w-[160px] w-[160px]' : ''}`}>
      <Link to={`/p/${product.id}`} className="relative aspect-square bg-white p-3 block overflow-hidden">
        {product.discount > 0 && <span className="absolute top-2 right-2 z-10 text-[9px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-md">{product.discount}% OFF</span>}
        <img src={product.image} alt={name} className="w-full h-full object-contain" />
      </Link>
      <div className="px-3 pb-3 flex-1 flex flex-col">
        <Link to={`/p/${product.id}`} className="qc-product-name text-[13px] font-medium text-slate-800 line-clamp-2 leading-snug min-h-[2.2em]">{name}</Link>
        <p className="qc-product-unit text-[11px] text-slate-400 mt-0.5">{unit}</p>
        <p className="qc-product-rating"><span>&#9733;</span> {product.rating || '4.5'} <small>({product.reviewCount || '1.2k'})</small></p>
        <div className="mt-auto pt-2 flex items-center justify-between gap-1">
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="font-bold text-slate-900 text-sm">{formatMoney(product.price, business)}</span>
            {product.mrp > product.price && <span className="text-[11px] text-slate-400 line-through">{formatMoney(product.mrp, business)}</span>}
          </div>
          <button type="button" aria-label={'Add ' + name + ' to cart'} title="Add to cart" onClick={() => add(product)} className="qc-add-button shrink-0 text-white bg-brand-500 hover:bg-brand-600">+</button>
        </div>
      </div>
    </div>
  );
}