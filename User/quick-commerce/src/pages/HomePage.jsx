import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, Check, ChevronLeft, ChevronRight, Clock, LayoutGrid, MapPin, Star, Zap,
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
        className={'flex gap-3 overflow-x-auto overflow-y-hidden px-10 pb-2 no-scrollbar scroll-smooth cursor-grab active:cursor-grabbing select-none ' + className}
      >
        {children}
      </div>
      <button type="button" onClick={() => scroll(-1)} aria-label="Scroll left" title="Scroll left"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-white/95 shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:text-brand-600">
        <ChevronLeft size={18} />
      </button>
      <button type="button" onClick={() => scroll(1)} aria-label="Scroll right" title="Scroll right"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-white/95 shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:text-brand-600">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
export default function HomePage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [searchParams] = useSearchParams();
  const moduleSlug = searchParams.get('module') || '';
  const city = useLocationStore(s => s.current?.city) || data?.city || 'Nagpur';
  const activeModule = data?.modules?.find(m => m.slug === moduleSlug);
  const visibleCategories = (data?.categories || []).filter(c => c.status !== false && (!moduleSlug || c.moduleId === activeModule?._id));

  useEffect(() => {
    shop.home().then(setData).catch(() => setErr('Catalog load nahi hua. Backend (port 5000) start karein.'));
  }, []);


  if (err) return <p className="max-w-[1280px] mx-auto px-4 py-16 text-center text-rose-600">{err}</p>;
  if (!data) return <p className="max-w-[1280px] mx-auto px-4 py-16 text-center text-slate-400">Loading store</p>;

  return (
    <div className="qc-home max-w-[1280px] mx-auto px-4 py-4 space-y-5">
      <section className="qc-hero relative overflow-hidden rounded-3xl px-8 py-9 md:py-11 min-h-[240px]">
        <div className="relative z-10 max-w-lg">
          <h1 className="text-3xl md:text-[2.15rem] font-extrabold text-slate-900 leading-tight">
            Everything You Need<br />Delivered in <span className="text-brand-500">30 Minutes</span>
          </h1>
          <div className="mt-4 flex flex-wrap gap-2 text-[12px] font-medium text-slate-600">
            <span className="inline-flex items-center gap-1 bg-white/80 rounded-full px-2.5 py-1 border border-white">
              <Zap size={13} className="text-amber-500 fill-amber-400" /> 30 Min Delivery
            </span>
            <span className="inline-flex items-center gap-1 bg-white/80 rounded-full px-2.5 py-1 border border-white">
              <MapPin size={13} className="text-rose-500" /> {city}
            </span>
            <span className="inline-flex items-center gap-1 bg-white/80 rounded-full px-2.5 py-1 border border-white">
              <Check size={13} className="text-emerald-500" /> Wide Range
            </span>
            <span className="inline-flex items-center gap-1 bg-white/80 rounded-full px-2.5 py-1 border border-white">
              <Star size={13} className="text-amber-500 fill-amber-400" /> Best Prices
            </span>
          </div>
          <Link to="/c" className="inline-flex items-center gap-1.5 mt-6 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-full text-sm shadow-sm">
            Shop Now <ArrowRight size={16} />
          </Link>
        </div>

        <div className="hidden md:flex absolute right-28 top-1/2 -translate-y-1/2 items-end gap-2 pointer-events-none">
          <img src="https://images.unsplash.com/photo-1566478989034-cb23b8b2d132?w=160&h=200&fit=crop" alt="" className="h-28 w-20 object-cover rounded-xl shadow-md rotate-[-6deg]" />
          <div className="h-36 w-28 bg-amber-100 rounded-2xl shadow-lg flex items-center justify-center font-extrabold text-slate-700 text-sm border border-amber-200">
            WEPZO
          </div>
          <img src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=220&h=180&fit=crop" alt="" className="h-32 w-36 object-cover rounded-2xl shadow-md" />
          <img src="https://images.unsplash.com/photo-1563636619-e9143da7973b?w=140&h=180&fit=crop" alt="" className="h-28 w-20 object-cover rounded-xl shadow-md rotate-[8deg]" />
          <img src="https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=120&h=180&fit=crop" alt="" className="h-32 w-16 object-cover rounded-xl shadow-md" />
        </div>

        <div className="absolute right-6 top-8 hidden sm:block">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-orange-500 shadow-lg flex flex-col items-center justify-center text-white">
              <Clock size={18} className="mb-0.5" />
              <span className="text-[11px] font-bold leading-tight text-center px-1">15-20<br />Minutes</span>
            </div>
            <div className="mx-auto w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-orange-500 -mt-0.5" />
          </div>
        </div>
      </section>

      <section><div className="flex items-center justify-between mb-2"><h2 className="text-lg font-bold text-slate-900">{activeModule ? activeModule.name + ' Categories' : 'Shop by Category'}</h2></div></section>

      <section><Rail className="qc-categories">
        {visibleCategories.map(c => {
          const query = new URLSearchParams();
          if (moduleSlug) query.set('module', moduleSlug);
          query.set('categoryId', c._id);
          query.set('category', c.name);
          return <Link key={c._id} to={'/c?' + query.toString()} className="qc-category-card w-28 shrink-0">
            <img src={c.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=180&h=140&fit=crop"} alt="" />
            <span>{c.name}</span>
          </Link>;
        })}
        {visibleCategories.length === 0 && <p className="col-span-full rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No categories assigned to this module yet.</p>}</Rail></section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900">Best Deals for You</h2>
          <Link to="/c" className="text-sm font-semibold text-brand-600 inline-flex items-center gap-0.5">
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <Rail>
          {(data.flash || []).map(p => <ProductCard key={p.id} product={p} compact />)}
        </Rail>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3"><h2 className="text-lg font-bold text-slate-900">Popular Stores Near You</h2><Link to="/c" className="text-sm text-brand-600">View All</Link></div>
        <div className="qc-store-grid">{[['Sharma General Store','4.5','1.2 km','10-15 min','https://images.unsplash.com/photo-1604719312566-8912e9c8a213?w=500&h=180&fit=crop'],['FreshMart','4.6','1.8 km','15-20 min','https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&h=180&fit=crop'],['City Electronics','4.4','2.1 km','15-20 min','https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?w=500&h=180&fit=crop'],['Home Needs','4.3','2.4 km','20-25 min','https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=500&h=180&fit=crop']].map(([name,rating,distance,eta,image])=><Link to="/c" className="qc-store-card" key={name}><img src={image} alt={name}/><b>{name}</b><span>{rating} | {distance} | {eta}</span></Link>)}</div>
      </section>
      <section className="qc-promo-grid">
        {[['Fresh Fruits & Vegetables','Farm Fresh to Your Home','Fruits%20%26%20Vegetables','https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300&h=220&fit=crop','green'],['Personal Care','Top Brands & Best Prices','Personal%20Care','https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=220&fit=crop','blue'],['Electronics','Gadgets for Everyday Life','Electronics','https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=220&fit=crop','orange']].map(([title,subtitle,category,image,color])=><Link to={'/c?category='+category} className={'qc-promo-banner qc-'+color} key={title}><b>{title}</b><span>{subtitle}</span><i>Shop Now</i><img src={image} alt=""/></Link>)}
      </section>
      <section><div className="flex items-center justify-between mb-3"><h2 className="text-lg font-bold text-slate-900">Top Brands</h2><Link to="/c" className="text-sm text-brand-600">View All</Link></div>
        <div className="qc-brand-grid">{['Dove','Colgate','Dettol','Himalaya','Pampers','Huggies','SAMSUNG','LG','Prestige','Haldiram'].map((brand,i)=><Link to="/c" key={brand} className={'qc-brand brand-'+i}>{brand}</Link>)}</div>
      </section>

    </div>
  );
}
