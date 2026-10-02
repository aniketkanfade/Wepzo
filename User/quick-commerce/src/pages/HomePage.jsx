import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, ChevronLeft, ChevronRight, MapPin,
} from 'lucide-react';
import { shop } from '../api';
import ProductCard from '../components/ProductCard';
import { useLocationStore } from '../store/location';

function Rail({ children, className = '' }) {
  const ref = useRef(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });
  const scroll = direction => ref.current?.scrollBy({ left: direction * 280, behavior: 'smooth' });

  useEffect(() => {
    const handleMouseMove = event => {
      if (!drag.current.active || !ref.current) return;
      const delta = event.clientX - drag.current.startX;
      if (Math.abs(delta) > 4) drag.current.moved = true;
      if (drag.current.moved) ref.current.scrollLeft = drag.current.startLeft - delta;
    };
    const stopDragging = () => {
      drag.current.active = false;
      window.setTimeout(() => { drag.current.moved = false; }, 0);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopDragging);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopDragging);
    };
  }, []);

  return (
    <div className="relative">
      <div
        ref={ref}
        onMouseDown={event => {
          if (event.button !== 0) return;
          drag.current = { active: true, startX: event.clientX, startLeft: ref.current?.scrollLeft || 0, moved: false };
        }}
        onClickCapture={event => {
          if (!drag.current.moved) return;
          event.preventDefault();
          event.stopPropagation();
          drag.current.moved = false;
        }}
        className={'qc-scroll-rail flex gap-3 overflow-x-auto overflow-y-hidden px-10 pb-2 no-scrollbar scroll-smooth cursor-grab active:cursor-grabbing select-none ' + className}
      >
        {children}
      </div>
      <button type="button" onClick={() => scroll(-1)} aria-label="Scroll left" title="Scroll left"
        className="qc-rail-arrow absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-md hover:text-brand-600">
        <ChevronLeft size={18} />
      </button>
      <button type="button" onClick={() => scroll(1)} aria-label="Scroll right" title="Scroll right"
        className="qc-rail-arrow absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-md hover:text-brand-600">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function ProductGridCarousel({ products }) {
  const ref = useRef(null);
  const pages = [];
  for (let index = 0; index < products.length; index += 9) {
    pages.push(products.slice(index, index + 9));
  }

  return (
    <div className="qc-product-mobile-carousel">
      <div ref={ref} className="qc-product-carousel-track no-scrollbar">
        {pages.map((page, pageIndex) => (
          <div className="qc-product-carousel-page" key={pageIndex}>
            {page.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage({ componentEnabled = () => true, builderPreview = false, templatePreview = false }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [searchParams] = useSearchParams();
  const moduleSlug = searchParams.get('module') || '';
  const currentLocation = useLocationStore(s => s.current)
    || (templatePreview ? { lat: 21.1458, lng: 79.0882, city: 'Nagpur' } : null);
  const city = currentLocation?.city || data?.city || '';
  const activeModule = data?.modules?.find(m => m.slug === moduleSlug);
  const catalogPath = moduleSlug ? `/c?module=${encodeURIComponent(moduleSlug)}` : '/c';
  const visibleCategories = (data?.categories || []).filter(c => c.status !== false && (!moduleSlug || c.moduleId === activeModule?._id));
  const productGridItems = [...new Map(
    [...(data?.bestsellers || []), ...(data?.newest || [])].map(product => [product.id, product])
  ).values()].slice(0, 27);
  const trendyProduct = [...(data?.flash || []), ...productGridItems].find(product =>
    String(product.store || '').trim().toLowerCase().includes('trendy')
  );
  const trendyStoreName = trendyProduct?.store?.trim().replace(/^./, letter => letter.toUpperCase()) || "Trendy's";
  const trendyBanner = trendyProduct && {
    id: `trendy-product-${trendyProduct.id}`,
    title: `${trendyStoreName} Store`,
    subtitle: `${trendyProduct.name} and more, delivered to your door.`,
    image: trendyProduct.image,
    link: `/p/${trendyProduct.id}`,
    cta: 'Shop now',
  };
  const configuredBanners = data?.banners || [];
  const matchingTrendyBanner = configuredBanners.find(banner => String(banner.title || '').toLowerCase().includes('trendy'));
  const banners = trendyBanner
    ? [matchingTrendyBanner || trendyBanner, ...configuredBanners.filter(banner => banner !== matchingTrendyBanner)]
    : configuredBanners.length ? configuredBanners : builderPreview ? [{
      id: 'preview-promo',
      title: 'Good food, right on time.',
      subtitle: 'Everyday essentials delivered to your door in minutes.',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&auto=format&fit=crop',
      link: '/c',
      cta: 'Shop groceries',
    }] : [];
  const bestDealProducts = trendyProduct
    ? [trendyProduct, ...(data?.flash || []).filter(product => product.id !== trendyProduct.id)].slice(0, 6)
    : data?.flash || [];
  const dealItems = [...new Map(
    [...bestDealProducts, ...productGridItems].map(product => [product.id, product])
  ).values()].slice(0, 9);

  useEffect(() => {
    shop.home({ lat: currentLocation?.lat, lng: currentLocation?.lng, module: moduleSlug || undefined }).then(setData).catch(() => setErr('Catalog load nahi hua. Backend (port 5000) start karein.'));
  }, [currentLocation?.lat, currentLocation?.lng, moduleSlug]);


  if (err) return <p className="max-w-[1280px] mx-auto px-4 py-16 text-center text-rose-600">{err}</p>;
  if (!data) return <p className="max-w-[1280px] mx-auto px-4 py-16 text-center text-slate-400">Loading store</p>;

  return (
    <div className="qc-home max-w-[1280px] mx-auto px-4 py-4 space-y-5">
      {componentEnabled('quick-commerce-offer-banner') && banners.map(banner => <section key={banner.id} className="qc-hero relative overflow-hidden rounded-2xl px-8 py-9 md:py-11" style={{ backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.96) 0%, rgba(255,255,255,.76) 45%, rgba(255,255,255,.12) 100%), url(${JSON.stringify(banner.image)})`, backgroundPosition: 'center', backgroundSize: 'cover' }}>
        <div className="relative z-10 max-w-lg">
          {city && <span className="mb-3 inline-flex items-center gap-1 rounded-full border border-white bg-white/85 px-2.5 py-1 text-[12px] font-medium text-slate-600"><MapPin size={13} className="text-rose-500" />{city}</span>}
          {banner.title && <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-[2.15rem]">{banner.title}</h1>}
          {banner.subtitle && <p className="mt-3 max-w-md text-sm text-slate-700">{banner.subtitle}</p>}
          {banner.link && <div className="mt-6">{banner.link.startsWith('/') ? <Link to={banner.link} className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600">{banner.cta || 'Shop'} <ArrowRight size={16} /></Link> : <a href={banner.link} className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600">{banner.cta || 'Shop'} <ArrowRight size={16} /></a>}</div>}
        </div>
      </section>)}

      {componentEnabled('quick-commerce-category-tiles') && visibleCategories.length > 0 && <section>
        <h2 className="mb-2 text-lg font-bold text-slate-900">{activeModule ? `${activeModule.name} Categories` : 'Shop by Category'}</h2>
        <Rail className="qc-categories">
        {visibleCategories.map(c => {
          const query = new URLSearchParams();
          if (moduleSlug) query.set('module', moduleSlug);
          query.set('categoryId', c._id);
          query.set('category', c.name);
          return <Link key={c._id} to={'/c?' + query.toString()} className="qc-category-card w-28 shrink-0">
            {c.image && <img src={c.image} alt="" />}
            <span>{c.name}</span>
          </Link>;
        })}
        </Rail>
      </section>}

      {componentEnabled('quick-commerce-flash-deals') && (data.flash || []).length > 0 && <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900">Best Deals for You</h2>
          <Link to={catalogPath} className="qc-home-view-all text-sm font-semibold text-brand-600 inline-flex items-center gap-0.5">
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <Rail className="qc-deal-desktop-rail">
          {bestDealProducts.map(p => <ProductCard key={p.id} product={p} compact />)}
        </Rail>
        <div className="qc-deal-mobile-grid">
          {dealItems.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>}

      {componentEnabled('quick-commerce-nearby-stores') && (data.stores || []).length > 0 && <section>
        <div className="flex items-center justify-between mb-3"><h2 className="text-lg font-bold text-slate-900">Popular Stores Near You</h2><Link to={catalogPath} className="qc-home-view-all text-sm text-brand-600">View All</Link></div>
        <div className="qc-store-grid">{data.stores.map(store=><Link to={catalogPath} className="qc-store-card" key={store.id}>
          {store.image && <img src={store.image} alt={store.name}/>}
          <b>{store.name}</b>
          <span>{[store.area, store.deliveryMin && store.deliveryMax ? `${store.deliveryMin}-${store.deliveryMax} min` : ''].filter(Boolean).join(' | ')}</span>
        </Link>)}</div>
      </section>}
      {componentEnabled('quick-commerce-brand-section') && (data.brands || []).length > 0 && <section className="qc-brand-section"><div className="flex items-center justify-between mb-3"><h2 className="text-lg font-bold text-slate-900">Top Brands</h2><Link to={catalogPath} className="qc-home-view-all text-sm text-brand-600">View All</Link></div>
        <div className="qc-brand-grid">{data.brands.map(brand=><Link to={catalogPath} key={brand.id} className="qc-brand">
          <span className="qc-brand-logo">{brand.image ? <img src={brand.image} alt={`${brand.name} logo`} /> : <span>{String(brand.name || 'B').slice(0, 1).toUpperCase()}</span>}</span>
          <span className="qc-brand-name">{brand.name}</span>
        </Link>)}</div>
      </section>}

      {componentEnabled('quick-commerce-product-grid') && (data.bestsellers || []).length > 0 && <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900">Popular products</h2>
          <Link to={catalogPath} className="qc-home-view-all text-sm font-semibold text-brand-600">View All</Link>
        </div>
        <div className="qc-product-desktop-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(data.bestsellers || []).slice(0, 8).map(product => <ProductCard key={product.id} product={product} />)}
        </div>
        <ProductGridCarousel products={productGridItems} />
      </section>}

    </div>
  );
}
