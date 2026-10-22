import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, ChevronLeft, ChevronRight, MapPin,
} from 'lucide-react';
import { shop } from '../api';
import ProductCard from '../components/ProductCard';
import PromotionBannerRail from '../components/PromotionBannerRail';
import { useLocationStore } from '../store/location';

const asList = value => Array.isArray(value) ? value : value ? [value] : [];
const normalizeModuleValue = value => String(value ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');
const bannerTargets = banner => [
  banner?.moduleSlug, banner?.moduleId,
  banner?.module?.slug, banner?.module?._id, banner?.module?.id,
  typeof banner?.module === 'string' ? banner.module : '',
  ...asList(banner?.modules).flatMap(module => [module?.slug, module?._id, module?.id, typeof module === 'string' ? module : '']),
].filter(Boolean).map(value => String(value).trim().toLowerCase());

function Rail({ children, className = '' }) {
  const ref = useRef(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });
  const [canScroll, setCanScroll] = useState(false);
  const scroll = direction => ref.current?.scrollBy({ left: direction * 280, behavior: 'smooth' });

  useEffect(() => {
    const rail = ref.current;
    if (!rail) return undefined;
    const updateScrollState = () => setCanScroll(rail.scrollWidth > rail.clientWidth + 1);
    updateScrollState();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null;
    observer?.observe(rail);
    Array.from(rail.children).forEach(child => observer?.observe(child));
    window.addEventListener('resize', updateScrollState);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [children]);

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
      {canScroll && <button type="button" onClick={() => scroll(-1)} aria-label="Scroll left" title="Scroll left"
        className="qc-rail-arrow absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-md hover:text-brand-600">
        <ChevronLeft size={18} />
      </button>}
      {canScroll && <button type="button" onClick={() => scroll(1)} aria-label="Scroll right" title="Scroll right"
        className="qc-rail-arrow absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-md hover:text-brand-600">
        <ChevronRight size={18} />
      </button>}
    </div>
  );
}

function ProductGridCarousel({ products, rows = 3 }) {
  const ref = useRef(null);
  const pages = [];
  const pageSize = rows * 3;
  for (let index = 0; index < products.length; index += pageSize) {
    pages.push(products.slice(index, index + pageSize));
  }

  return (
    <div className="qc-product-mobile-carousel">
      <div ref={ref} className="qc-product-carousel-track no-scrollbar">
        {pages.map((page, pageIndex) => (
          <div className={`qc-product-carousel-page${rows === 2 ? ' qc-product-carousel-page-two-rows' : ''}`} key={pageIndex}>
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
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [searchParams] = useSearchParams();
  const moduleSlug = searchParams.get('module') || '';
  const moduleId = searchParams.get('moduleId') || '';
  const currentLocation = useLocationStore(s => s.current)
    || (templatePreview ? { lat: 21.1458, lng: 79.0882, city: 'Nagpur' } : null);
  const city = currentLocation?.city || data?.city || '';
  const activeModule = data?.modules?.find(m => String(m._id) === moduleId && m.slug === moduleSlug)
    || data?.modules?.find(m => m.slug === moduleSlug);
  const isAlternateGroceryModule = moduleSlug === 'grocery'
    && Boolean(moduleId)
    && data?.modules?.findIndex(module => String(module._id) === moduleId)
      !== data?.modules?.findIndex(module => module.slug === 'grocery');
  const activeModuleName = isAlternateGroceryModule ? 'Daily Needs' : activeModule?.name;
  const catalogPath = moduleSlug ? `/c?module=${encodeURIComponent(moduleSlug)}` : '/c';
  const brandPath = id => { const query = new URLSearchParams(); if (moduleSlug) query.set('module', moduleSlug); query.set('brand', id); return `/c?${query.toString()}`; };
  const visibleCategories = (data?.categories || []).filter(c => c.status !== false && (!moduleSlug || c.moduleId === activeModule?._id));
  const allHomeProducts = [...new Map(
    [...(data?.flash || []), ...(data?.bestsellers || []), ...(data?.newest || [])]
      .map(product => [String(product.id || product._id || product.productId || ''), product])
  ).values()];
  const allProducts = data?.allProducts || allHomeProducts;
  const productSections = (data?.modules || [])
    .filter((module, index, modules) => (!moduleSlug || module.slug === moduleSlug)
      && (!module.slug || modules.findIndex(candidate => candidate.slug === module.slug) === index))
    .map(module => ({
      ...module,
      name: isAlternateGroceryModule ? activeModuleName : module.name,
      products: allProducts.filter(product => {
        const moduleValues = [
          product.moduleSlug,
          product.module,
          product.moduleId,
          product.module?._id,
          product.module?.id,
          product.module?.slug,
          product.module?.name,
        ].map(normalizeModuleValue).filter(Boolean);
        const targetValues = [module.slug, module._id, module.id, module.name]
          .map(normalizeModuleValue).filter(Boolean);
        return moduleValues.some(value => targetValues.includes(value));
      }),
    }))
    .filter(section => section.products.length > 0);
  const productGridItems = [...new Map(
    [...(data?.bestsellers || []), ...(data?.newest || [])].map(product => [product.id, product])
  ).values()];
  const trendyProduct = [...(data?.flash || []), ...productGridItems].find(product =>
    String(product.store || '').trim().toLowerCase().includes('trendy')
  );
  const selectedModuleRecord = data?.modules?.find(module => String(module._id) === moduleId && module.slug === moduleSlug)
    || data?.modules?.find(module => module.slug === moduleSlug);
  const selectedModuleTargets = [moduleSlug, selectedModuleRecord?._id, selectedModuleRecord?.name]
    .filter(Boolean).map(value => String(value).trim().toLowerCase());
  const belongsToCurrentModule = banner => {
    const targets = bannerTargets(banner);
    return moduleSlug ? targets.some(target => selectedModuleTargets.includes(target)) : targets.length === 0;
  };
  const banners = [...(data?.banners || [])]
    .filter((banner, index, all) => all.findIndex(item => String(item.id || item._id) === String(banner.id || banner._id)) === index)
    .filter(banner => banner.active !== false && banner.isActive !== false && banner.status !== 'inactive' && belongsToCurrentModule(banner));
  const homeMidBanners = (data?.promotionalBanners || []).filter(banner => banner.active !== false && banner.isActive !== false && banner.status !== 'inactive' && belongsToCurrentModule(banner));
  const moduleCategoryBanners = moduleSlug
    ? (data?.categoryBanners || []).filter(banner => banner.active !== false && banner.isActive !== false && banner.status !== 'inactive' && belongsToCurrentModule(banner))
    : [];
  useEffect(() => {
    setActiveBannerIndex(0);
    if (banners.length < 2) return undefined;
    const timer = window.setInterval(() => setActiveBannerIndex(index => (index + 1) % banners.length), 5000);
    return () => window.clearInterval(timer);
  }, [moduleSlug, banners.length]);
  const bestDealProducts = trendyProduct
    ? [trendyProduct, ...(data?.flash || []).filter(product => product.id !== trendyProduct.id)].slice(0, 6)
    : data?.flash || [];
  const dealItems = [...new Map(
    [...bestDealProducts, ...productGridItems].map(product => [product.id, product])
  ).values()].slice(0, 9);

  useEffect(() => {
    shop.home({ lat: currentLocation?.lat, lng: currentLocation?.lng, module: moduleSlug || undefined })
      .then(home => shop.products({ lat: currentLocation?.lat, lng: currentLocation?.lng, module: moduleSlug || undefined, sort: 'rating' })
        .then(allProducts => ({ ...home, allProducts }))
        .catch(() => home))
      .then(setData)
      .catch(() => setErr('Catalog load nahi hua. Backend (port 5000) start karein.'));
  }, [currentLocation?.lat, currentLocation?.lng, moduleSlug]);


  if (err) return <p className="max-w-[1280px] mx-auto px-4 py-16 text-center text-rose-600">{err}</p>;
  if (!data) return <p className="max-w-[1280px] mx-auto px-4 py-16 text-center text-slate-400">Loading store</p>;

  return (
    <div className="qc-home max-w-[1280px] mx-auto px-4 py-4 space-y-5">
      {componentEnabled('quick-commerce-offer-banner') && banners.length > 0 && (() => { const banner = banners[activeBannerIndex % banners.length]; return <section key={banner.id} className="qc-hero relative overflow-hidden rounded-2xl px-8 py-9 md:py-11" style={{ backgroundImage: banner.video ? 'linear-gradient(90deg, rgba(255,255,255,.86), rgba(255,255,255,.25))' : banner.image ? `linear-gradient(90deg, rgba(255,255,255,.96) 0%, rgba(255,255,255,.76) 45%, rgba(255,255,255,.12) 100%), url(${JSON.stringify(banner.image)})` : undefined, backgroundPosition: 'center', backgroundSize: 'cover' }}>
        {banner.video && <video src={banner.video} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />}
        {banner.video && <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/60 to-white/10" />}
        <div className="relative z-10 max-w-lg">
          {city && <span className="mb-3 inline-flex items-center gap-1 rounded-full border border-white bg-white/85 px-2.5 py-1 text-[12px] font-medium text-slate-600"><MapPin size={13} className="text-rose-500" />{city}</span>}
          {banner.title && <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-[2.15rem]">{banner.title}</h1>}
          {banner.subtitle && <p className="mt-3 max-w-md text-sm text-slate-700">{banner.subtitle}</p>}
          {banner.link && <div className="mt-6">{banner.link.startsWith('/') ? <Link to={banner.link} className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600">{banner.cta || 'Shop'} <ArrowRight size={16} /></Link> : <a href={banner.link} className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600">{banner.cta || 'Shop'} <ArrowRight size={16} /></a>}</div>}
        </div>
        {banners.length > 1 && <><button type="button" aria-label="Previous banner" onClick={() => setActiveBannerIndex(index => (index + banners.length - 1) % banners.length)} className="absolute left-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow"><ChevronLeft size={20}/></button><button type="button" aria-label="Next banner" onClick={() => setActiveBannerIndex(index => (index + 1) % banners.length)} className="absolute right-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow"><ChevronRight size={20}/></button><div className="absolute bottom-3 right-4 z-20 flex gap-1.5">{banners.map((item,index)=><button key={item.id || index} type="button" aria-label={`Show banner ${index + 1}`} onClick={() => setActiveBannerIndex(index)} className={`h-2 w-2 rounded-full ${index === activeBannerIndex ? 'bg-brand-500' : 'bg-white/80'}`}/>)}</div></>}
      </section>; })()}

      {moduleSlug && componentEnabled('quick-commerce-category-tiles') && visibleCategories.length > 0 && <section>
        <h2 className="mb-2 text-lg font-bold text-slate-900">{activeModuleName ? `${activeModuleName} Categories` : 'Shop by Category'}</h2>
        <Rail className="qc-categories">
        {visibleCategories.map(c => {
          const query = new URLSearchParams();
          if (moduleSlug) query.set('module', moduleSlug);
          query.set('categoryId', c._id);
          query.set('category', c.name);
          return <Link key={c._id} to={'/c?' + query.toString()} className="qc-category-card w-28 shrink-0">
            <div className="qc-category-image-tile">{c.image && <img src={c.image} alt="" />}</div>
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
        <ProductGridCarousel products={dealItems} rows={2} />
      </section>}

      {componentEnabled('quick-commerce-product-grid') && (data.bestsellers || []).length > 0 && <section>
        <div className="flex items-center justify-between mb-3"><h2 className="text-lg font-bold text-slate-900">Popular products</h2><Link to={catalogPath} className="qc-home-view-all text-sm font-semibold text-brand-600">View All</Link></div>
        <Rail className="qc-deal-desktop-rail">{data.bestsellers.slice(0, 10).map(product => <ProductCard key={product.id} product={product} compact />)}</Rail>
        {productSections.length > 0 && <ProductGridCarousel products={data.bestsellers} />}
      </section>}

      {componentEnabled('quick-commerce-offer-banner') && homeMidBanners.length > 0 && <section className="space-y-3"><h2 className="text-lg font-bold text-slate-900">Offers and promotions</h2><PromotionBannerRail banners={homeMidBanners} label="Home middle banners"/></section>}
      {componentEnabled('quick-commerce-category-tiles') && moduleCategoryBanners.length > 0 && <section className="space-y-3"><h2 className="text-lg font-bold text-slate-900">Featured in {activeModuleName || 'this module'}</h2><PromotionBannerRail banners={moduleCategoryBanners} label="Module category banners"/></section>}

      {componentEnabled('quick-commerce-product-grid') && (
        productSections.length > 0 ? (
          <section className="space-y-5">
            {productSections.map(section => (
              <section key={section.slug || section._id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">{section.name}</h2>
                  <Link to={`/c?module=${encodeURIComponent(section.slug || '')}`} className="qc-home-view-all text-sm font-semibold text-brand-600 inline-flex items-center gap-0.5">
                    View All <ArrowRight size={14} />
                  </Link>
                </div>
                <Rail className="qc-deal-desktop-rail">
                  {section.products.map(product => <ProductCard key={product.id || product._id || product.productId} product={product} compact />)}
                </Rail>
                <ProductGridCarousel products={section.products} />
              </section>
            ))}
          </section>
        ) : (
          (data.bestsellers || []).length > 0 && <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900">Popular products</h2>
              <Link to={catalogPath} className="qc-home-view-all text-sm font-semibold text-brand-600">View All</Link>
            </div>
            <div className="qc-product-desktop-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {(data.bestsellers || []).slice(0, 8).map(product => <ProductCard key={product.id} product={product} />)}
            </div>
            <ProductGridCarousel products={productGridItems} />
          </section>
        )
      )}

      {componentEnabled('quick-commerce-nearby-stores') && (data.stores || []).length > 0 && <section>
        <div className="flex items-center justify-between mb-3"><h2 className="text-lg font-bold text-slate-900">{currentLocation ? 'Popular Stores Near You' : 'Available Stores'}</h2><Link to={catalogPath} className="qc-home-view-all text-sm text-brand-600">View All</Link></div>
        <Rail className="qc-store-grid">{data.stores.map(store=><Link to={catalogPath} className="qc-store-card" key={store.id}>
          {store.image && <img src={store.image} alt={store.name}/>}
          <b>{store.name}</b>
          <span>{[store.area, store.deliveryMin && store.deliveryMax ? `${store.deliveryMin}-${store.deliveryMax} min` : ''].filter(Boolean).join(' | ')}</span>
        </Link>)}</Rail>
      </section>}
      {componentEnabled('quick-commerce-brand-section') && (data.brands || []).length > 0 && <section className="qc-brand-section"><div className="flex items-center justify-between mb-3"><h2 className="text-lg font-bold text-slate-900">Top Brands</h2><Link to={catalogPath} className="qc-home-view-all text-sm text-brand-600">View All</Link></div>
        <div className="qc-brand-grid">{data.brands.map(brand=><Link to={brandPath(brand.id)} key={brand.id} className="qc-brand">
          <span className="qc-brand-logo">{brand.image ? <img src={brand.image} alt={`${brand.name} logo`} /> : <span>{String(brand.name || 'B').slice(0, 1).toUpperCase()}</span>}</span>
          <span className="qc-brand-name">{brand.name}</span>
        </Link>)}</div>
      </section>}

    </div>
  );
}
