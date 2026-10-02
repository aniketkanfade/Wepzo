import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BadgeCheck, Check, ChevronRight, Heart, Image as ImageIcon, MapPin,
  Minus, PackageCheck, Plus, RotateCcw, ShieldCheck, ShoppingCart,
  Star, Store, Truck, Zap,
} from 'lucide-react';
import { shop } from '../api';
import { useCart } from '../store/cart';
import { useLocationStore } from '../store/location';
import { useWishlist } from '../store/wishlist';
import ProductCard from '../components/ProductCard';
import { formatMoney, useSiteSettings } from '../store/siteSettings';

function variantLabel(variant) {
  const attributes = variant.attributes || {};
  const parts = Object.entries(attributes).map(([key, value]) => `${key}: ${value}`);
  return parts.length ? parts.join(' � ') : (variant.sku || 'Option');
}

function compactCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0
    ? new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(count)
    : '0';
}

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const add = useCart(state => state.add);
  const location = useLocationStore(state => state.current);
  const toggleWishlist = useWishlist(state => state.toggle);
  const business = useSiteSettings(state => state.business);
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deliveryEta, setDeliveryEta] = useState('');
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('details');
  const [activeImg, setActiveImg] = useState('');
  const [showVideo, setShowVideo] = useState(false);
  const [variantId, setVariantId] = useState('');
  const [added, setAdded] = useState(false);
  const isWished = useWishlist(state => state.items.some(item => item.id === p?.id));

  useEffect(() => {
    let live = true;
    setLoading(true);
    setLoadError('');
    setQty(1);
    setTab('details');
    setShowVideo(false);
    shop.product(id, { lat: location?.lat, lng: location?.lng }).then(data => {
      if (!live) return;
      setP(data);
      const gallery = data.images?.length ? data.images : (data.image ? [data.image] : []);
      setActiveImg(gallery[0] || '');
      setVariantId(data.variants?.[0]?.id || '');
    }).catch(() => {
      if (live) {
        setP(null);
        setLoadError('Product details could not be loaded. Please try again.');
      }
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [id, location?.lat, location?.lng]);

  useEffect(() => {
    let live = true;
    shop.home({ lat: location?.lat, lng: location?.lng }).then(data => { if (live) setDeliveryEta(data.eta || ''); }).catch(() => {});
    return () => { live = false; };
  }, [location?.lat, location?.lng]);


  useEffect(() => {
    if (!added) return undefined;
    const timer = window.setTimeout(() => setAdded(false), 1800);
    return () => window.clearTimeout(timer);
  }, [added]);

  const variant = useMemo(
    () => (p?.variants || []).find(item => item.id === variantId) || null,
    [p, variantId]
  );

  if (loading) return <div className="mx-auto max-w-[1280px] px-4 py-16 text-center text-sm text-slate-400">Loading product details�</div>;
  if (loadError || !p) return (
    <div className="mx-auto max-w-[1280px] px-4 py-16 text-center">
      <p className="font-semibold text-slate-700">{loadError || 'Product not found.'}</p>
      <Link to="/" className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Back to home</Link>
    </div>
  );

  const images = [...new Set([...(p.images || []), p.image].filter(Boolean))];
  const displayImg = variant?.image || activeImg || images[0] || '';
  const displayPrice = Number(variant?.price ?? p.price) || 0;
  const displayMrp = Number(variant?.mrp ?? p.mrp) || displayPrice;
  const currentDiscount = displayMrp > displayPrice ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100) : Number(p.discount) || 0;
  const specs = Object.entries({ ...(p.specs || p.specifications || {}), ...(variant?.specifications || {}) });
  const rating = Number(p.rating) || 0;
  const reviewCount = Number(p.reviews) || 0;
  const stockValue = variant?.stock ?? p.stock;
  const stockKnown = stockValue !== null && stockValue !== undefined && Number.isFinite(Number(stockValue));
  const stock = stockKnown ? Math.max(0, Number(stockValue)) : null;
  const outOfStock = stockKnown && stock === 0;
  const cartProduct = {
    ...p,
    price: displayPrice,
    mrp: displayMrp,
    image: displayImg || p.image,
    unit: variant ? variantLabel(variant) : p.unit,
    variantId: variant?.id || null,
  };
  const deliveryAddress = [location?.area, location?.city].filter(Boolean).join(', ') || location?.line || 'Choose a delivery location';
  const benefits = [
    p.warranty && { icon: ShieldCheck, label: p.warranty },
    p.guarantee && { icon: BadgeCheck, label: 'Product guarantee available' },
    p.exchange && { icon: RotateCcw, label: 'Exchange available' },
    stockKnown && stock > 0 && { icon: PackageCheck, label: stock <= 5 ? `Only ${stock} left in stock` : 'In stock' },
  ].filter(Boolean);

  const addToCart = () => {
    if (outOfStock) return;
    add(cartProduct, qty);
    setAdded(true);
  };
  const buyNow = () => {
    if (outOfStock) return;
    add(cartProduct, qty);
    navigate('/checkout');
  };
  const updateQty = amount => {
    setQty(current => {
      const next = Math.max(1, current + amount);
      return stockKnown ? Math.min(next, Math.max(stock, 1)) : next;
    });
  };
  const selectVariant = selected => {
    setVariantId(selected.id);
    setShowVideo(false);
    if (selected.image) setActiveImg(selected.image);
  };
  const changeLocation = () => window.dispatchEvent(new Event('wepzo:open-location'));

  return (
    <div className="qc-product-page mx-auto max-w-[1280px] px-4 pb-10 pt-2">
      <nav className="qc-product-breadcrumb" aria-label="Product path">
        <Link to="/">Home</Link><ChevronRight size={14} />
        <Link to={`/c?category=${encodeURIComponent(p.category || '')}`}>{p.category || 'Products'}</Link>
        {p.subCategory && <><ChevronRight size={14} /><Link to={`/c?category=${encodeURIComponent(p.subCategory)}`}>{p.subCategory}</Link></>}
        {p.childCategory && <><ChevronRight size={14} /><Link to={`/c?category=${encodeURIComponent(p.childCategory)}`}>{p.childCategory}</Link></>}
        <ChevronRight size={14} /><span aria-current="page">{p.name}</span>
      </nav>

      <section className="qc-product-main-grid">
        <div className="qc-product-gallery">
          <div className="qc-product-thumbnails" aria-label="Product images">
            {images.map((src, index) => (
              <button key={`${src}-${index}`} type="button" onClick={() => { setActiveImg(src); setShowVideo(false); }}
                aria-label={`Show product image ${index + 1}`} aria-pressed={!showVideo && displayImg === src}
                className={!showVideo && displayImg === src ? 'active' : ''}>
                <img src={src} alt="" />
              </button>
            ))}
            {p.video && <button type="button" onClick={() => setShowVideo(true)} aria-label="Play product video" className={showVideo ? 'active' : ''}><span className="qc-video-thumb">?</span></button>}
          </div>
          <div className="qc-product-image-stage">
            {currentDiscount > 0 && <span className="qc-product-discount">{currentDiscount}% OFF</span>}
            <button type="button" onClick={() => toggleWishlist(p)} aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'} className={'qc-product-wishlist ' + (isWished ? 'wished' : '')}>
              <Heart size={20} fill={isWished ? 'currentColor' : 'none'} />
            </button>
            {showVideo && p.video ? <video src={p.video} controls autoPlay className="qc-product-main-media" /> : displayImg ? <img src={displayImg} alt={p.name} className="qc-product-main-media" /> : <div className="qc-product-no-image"><ImageIcon size={36} /><span>Image unavailable</span></div>}
          </div>
        </div>

        <div className="qc-product-information">
          <p className="qc-product-eyebrow">{[p.category, p.subCategory].filter(Boolean).join(' � ')}</p>
          <h1>{p.name}</h1>
          <div className="qc-product-meta">{p.unit && <span>{p.unit}</span>}{p.brand && <span>Brand: {p.brand}</span>}{p.productId && <span>Product ID: {p.productId}</span>}</div>
          {rating > 0 && <a href="#product-reviews" onClick={() => setTab('reviews')} className="qc-product-rating-link"><span><Star size={15} fill="currentColor" /> {rating.toFixed(1)}</span><b>{compactCount(reviewCount)} ratings</b></a>}

          <div className="qc-product-price-block">
            <div className="qc-product-price-line"><strong>{formatMoney(displayPrice, business)}</strong>{displayMrp > displayPrice && <del>{formatMoney(displayMrp, business)}</del>}{currentDiscount > 0 && <span>{currentDiscount}% OFF</span>}</div>
            <p>Inclusive of all taxes</p>
            {deliveryEta && <small><Truck size={14} /> Delivery in {deliveryEta}</small>}
          </div>

          {(p.variants || []).length > 0 && <div className="qc-product-variants">
            <h2>{Object.keys(variant?.attributes || {}).join(' / ') || 'Options'}</h2>
            <div>{p.variants.map(item => <button key={item.id} type="button" onClick={() => selectVariant(item)} className={variantId === item.id ? 'active' : ''}>
              <span>{variantLabel(item)}</span><small>{formatMoney(item.price, business)}</small>
            </button>)}</div>
          </div>}

          {stockKnown && <p className={'qc-product-stock ' + (outOfStock ? 'out' : '')}>{outOfStock ? 'Currently out of stock' : stock <= 5 ? `Only ${stock} left` : 'In stock'}</p>}
          <div className="qc-product-buy-row">
            <div className="qc-product-quantity" aria-label="Quantity selector">
              <button type="button" onClick={() => updateQty(-1)} disabled={qty <= 1} aria-label="Decrease quantity"><Minus size={16} /></button>
              <span>{qty}</span>
              <button type="button" onClick={() => updateQty(1)} disabled={stockKnown && qty >= stock} aria-label="Increase quantity"><Plus size={16} /></button>
            </div>
            <button type="button" onClick={addToCart} disabled={outOfStock} className="qc-product-add-button"><ShoppingCart size={18} />{added ? 'Added to Cart' : 'Add to Cart'}</button>
          </div>
          <button type="button" onClick={buyNow} disabled={outOfStock} className="qc-product-buy-now"><Zap size={17} fill="currentColor" /> Buy Now</button>
        </div>

        <aside className="qc-product-side-panel">
          <div className="qc-delivery-card">
            <div className="qc-delivery-address"><MapPin size={18} /><div><small>Deliver to</small><strong>{deliveryAddress}</strong></div><button type="button" onClick={changeLocation}>Change</button></div>
            {deliveryEta && <div className="qc-delivery-eta"><Truck size={22} /><div><strong>Delivery in {deliveryEta}</strong><span>Fast delivery to your location</span></div><ChevronRight size={17} /></div>}
          </div>
          {p.store && <div className="qc-product-store-card"><div className="qc-store-icon"><Store size={20} /></div><div><small>Sold by</small><strong>{p.store}</strong>{p.storeId && <span>Store ID: {p.storeId}</span>}</div></div>}
          {benefits.length > 0 && <div className="qc-product-benefits">{benefits.map(({ icon: Icon, label }) => <div key={label}><span><Icon size={15} /></span><p>{label}</p></div>)}</div>}
        </aside>
      </section>

      <section className="qc-product-lower">
        <div className="qc-product-tabs" role="tablist" aria-label="Product information">
          {[
            ['details', 'Product Details'],
            ['specs', 'Specifications'],
            ['reviews', `Reviews${reviewCount ? ` (${compactCount(reviewCount)})` : ''}`],
          ].map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={tab === key ? 'active' : ''}>{label}</button>)}
        </div>
        <div className="qc-product-tab-content">
          {tab === 'details' && <div className="qc-product-description"><h2>Product Details</h2>{p.shortDesc && <p className="lead">{p.shortDesc}</p>}{p.description && <p>{p.description}</p>}{!p.shortDesc && !p.description && <p>No product description is available.</p>}{p.tags?.length > 0 && <p className="qc-product-tags">{p.tags.map(tag => <span key={tag}>{tag}</span>)}</p>}</div>}
          {tab === 'specs' && <div className="qc-product-specifications"><h2>Specifications</h2>{specs.length ? <dl>{specs.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value == null ? '�' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl> : <p>No specifications have been added for this product.</p>}</div>}
          {tab === 'reviews' && <div id="product-reviews" className="qc-product-reviews"><h2>Customer Ratings</h2>{rating > 0 ? <div className="qc-review-summary"><strong><Star size={22} fill="currentColor" /> {rating.toFixed(1)}</strong><span>{compactCount(reviewCount)} ratings for {p.name}</span></div> : <p>No customer ratings are available for this product yet.</p>}</div>}
        </div>
      </section>

      {p.related?.length > 0 && <section className="qc-related-products"><div className="qc-related-heading"><h2>Related Products</h2><span>More from {p.category || 'this category'}</span></div><div>{p.related.map(product => <ProductCard key={product.id} product={product} />)}</div></section>}
    </div>
  );
}