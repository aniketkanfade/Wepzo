import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Heart, Search, ShoppingCart, User, Zap, Home } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '../store/cart';
import { useLocationStore } from '../store/location';
import { useAuthStore } from '../store/auth';
import { useWishlist } from '../store/wishlist';
import LocationModal from './LocationModal';
import { shop } from '../api';
import { nearestCity } from '../constants/geo';
import { etaMinutesFromKm, haversineKm } from '../utils/eta';
import CartDrawer from './CartDrawer';

function locationSubtitle(current) {
  if (!current) return 'Select location';
  const area = current.area || current.city || 'Location';
  const city = current.city || '';
  const state = current.state || nearestCity(current.lat, current.lng)?.state || 'Maharashtra';
  const place = [area, city, state].filter(Boolean).join(', ');
  return `${area} - ${place}`;
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const selectedModuleSlug = searchParams.get('module') || '';
  const selectedCategoryId = searchParams.get('categoryId') || '';
  const selectedSubCategoryId = searchParams.get('subCategoryId') || '';
  const productId = location.pathname.match(/^\/p\/([^/]+)/)?.[1] || '';
  const count = useCart(s => s.items.reduce((n, x) => n + x.qty, 0));
  const wishCount = useWishlist(s => s.items.length);
  const current = useLocationStore(s => s.current);
  const pickup = useLocationStore(s => s.pickup);
  const setPickup = useLocationStore(s => s.setPickup);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const [q, setQ] = useState('');
  const [catalog, setCatalog] = useState({ modules: [], categories: [], subCategories: [], childCategories: [] });
  const [productContext, setProductContext] = useState(null);
  const [open, setOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [suggests, setSuggests] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const boxRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const openLocation = () => setOpen(true);
    window.addEventListener('wepzo:open-location', openLocation);
    return () => window.removeEventListener('wepzo:open-location', openLocation);
  }, []);
  useEffect(() => {
    let previousY = window.scrollY;
    let directionDistance = 0;
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - previousY;
      if (currentY < 24) {
        directionDistance = 0;
        setIsScrolledDown(false);
      } else if (delta > 0) {
        directionDistance = directionDistance > 0 ? directionDistance + delta : delta;
        if (directionDistance >= 24) { setIsScrolledDown(true); directionDistance = 0; }
      } else if (delta < 0) {
        directionDistance = directionDistance < 0 ? directionDistance + delta : delta;
        if (directionDistance <= -24) { setIsScrolledDown(false); directionDistance = 0; }
      }
      previousY = currentY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    shop.home().then((d) => {
      if (!pickup?.lat && d?.pickup) setPickup(d.pickup);
      setCatalog({ modules: d?.modules || [], categories: d?.categories || [], subCategories: d?.subCategories || [], childCategories: d?.childCategories || [] });
    }).catch(() => {});
  }, [pickup, setPickup]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current?.contains(e.target)) setShowSuggest(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    const query = q.trim();
    if (query.length < 1) {
      setSuggests([]);
      setSuggesting(false);
      return;
    }
    setSuggesting(true);
    timerRef.current = setTimeout(() => {
      shop.products({ q: query })
        .then((list) => setSuggests(Array.isArray(list) ? list.slice(0, 8) : []))
        .catch(() => setSuggests([]))
        .finally(() => setSuggesting(false));
    }, 200);
    return () => clearTimeout(timerRef.current);
  }, [q]);

  const goSearch = (query) => {
    const term = (query ?? q).trim();
    setShowSuggest(false);
    navigate(term ? `/c?q=${encodeURIComponent(term)}` : '/c');
  };

  const submit = (e) => {
    e.preventDefault();
    goSearch();
  };


  useEffect(() => {
    let cancelled = false;
    setProductContext(null);
    if (!productId) return () => { cancelled = true; };
    shop.product(decodeURIComponent(productId))
      .then(product => { if (!cancelled) setProductContext(product); })
      .catch(() => { if (!cancelled) setProductContext(null); });
    return () => { cancelled = true; };
  }, [productId]);

  const queryCategoryName = searchParams.get('category') || '';
  const queryMatchesCategory = catalog.categories.some(item => item.name === queryCategoryName);
  const routeSubCategory = catalog.subCategories.find(item => String(item._id) === selectedSubCategoryId)
    || (!queryMatchesCategory ? catalog.subCategories.find(item => item.name === queryCategoryName) : undefined);
  const productSubCategory = catalog.subCategories.find(item => item.name === (productContext?.subCategory || ''));
  const activeSubCategory = routeSubCategory || productSubCategory;
  const activeCategory = catalog.categories.find(item => String(item._id) === selectedCategoryId)
    || catalog.categories.find(item => String(item._id) === String(activeSubCategory?.categoryId))
    || catalog.categories.find(item => item.name === (activeSubCategory?.mainCategory || queryCategoryName || productContext?.category || ''));
  const activeModule = catalog.modules.find(item => item.slug === selectedModuleSlug)
    || catalog.modules.find(item => String(item._id) === String(activeCategory?.moduleId));
  const isHomeRoute = location.pathname === '/';
  let navigationItems = catalog.modules;
  let navigationLevel = 'module';
  if (!isHomeRoute && activeSubCategory && activeCategory) {
    navigationItems = catalog.subCategories.filter(item => item.status !== false && (String(item.categoryId) === String(activeCategory._id) || item.mainCategory === activeCategory.name));
    navigationLevel = 'subcategory';
  } else if (!isHomeRoute && activeModule) {
    navigationItems = catalog.categories.filter(item => item.status !== false && String(item.moduleId) === String(activeModule._id));
    navigationLevel = 'category';
  } else if (!isHomeRoute) {
    navigationItems = catalog.categories.filter(item => item.status !== false);
    navigationLevel = 'category';
  }
  const moduleFallbackImages = {
    grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=80&fit=crop',
    food: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100&h=80&fit=crop',
    fashion: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=80&fit=crop',
    electronics: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=80&fit=crop',
    'ethnic-wear': 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=100&h=80&fit=crop',
  };
  const navigationHref = item => {
    const next = new URLSearchParams(location.search);
    if (navigationLevel === 'module') {
      next.set('module', item.slug);
      ['categoryId', 'subCategoryId', 'childCategoryId', 'category'].forEach(key => next.delete(key));
      return '/?' + next.toString();
    }
    const itemModule = catalog.modules.find(module => String(module._id) === String(item.moduleId));
    next.set('module', activeModule?.slug || itemModule?.slug || selectedModuleSlug);
    if (navigationLevel === 'category') {
      next.set('categoryId', item._id); next.set('category', item.name);
      ['subCategoryId', 'childCategoryId'].forEach(key => next.delete(key));
    } else if (navigationLevel === 'subcategory') {
      if (activeCategory) { next.set('categoryId', activeCategory._id); next.set('category', activeCategory.name); }
      next.set('subCategoryId', item._id); next.set('category', item.name); next.delete('childCategoryId');
    } else {
      next.set('childCategoryId', item._id); next.set('category', item.name);
    }
    return '/c?' + next.toString();
  };
  const isNavigationItemActive = item => {
    if (navigationLevel === 'module') return item.slug === selectedModuleSlug;
    if (navigationLevel === 'category') return String(item._id) === String(activeCategory?._id);
    return String(item._id) === String(activeSubCategory?._id);
  };  const placeLine = locationSubtitle(current);
  const fullLine = current?.line || placeLine;
  const storeLat = pickup?.lat ?? 21.1458;
  const storeLng = pickup?.lng ?? 79.0882;
  const km = haversineKm(storeLat, storeLng, current?.lat, current?.lng);
  const mins = etaMinutesFromKm(km);
  const etaLabel = mins != null ? `${mins} minutes` : '— minutes';
  const firstName = user?.name?.split(' ')[0] || user?.name;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-[0_1px_8px_rgba(15,23,42,0.04)]">
      <div className="max-w-[1280px] mx-auto px-4 min-h-[68px] py-2.5 flex items-center gap-3">
        <Link to="/" className="qc-header-logo shrink-0 font-extrabold text-xl tracking-tight text-slate-900"><span><ShoppingCart size={17}/></span> WEPZO</Link>
        <button type="button" onClick={() => setOpen(true)}
          title={fullLine}
          className="flex flex-col items-start text-left max-w-[min(100%,24rem)] hover:bg-slate-50 rounded-lg px-1 py-0.5">
          <span className="inline-flex items-center gap-0.5 text-[#dc2626] font-bold text-sm leading-tight">
            <Zap size={14} className="shrink-0 fill-[#dc2626]" strokeWidth={0} />
            {etaLabel}
          </span>
          <span className="inline-flex items-start gap-0.5 text-xs text-slate-700 leading-snug">
            <span className="whitespace-normal break-words font-medium">{placeLine}</span>
            <ChevronDown size={14} className="shrink-0 mt-0.5 text-slate-500" />
          </span>
        </button>

        <div ref={boxRef} className="flex-1 relative min-w-0">
          <form onSubmit={submit} className="flex items-center gap-2">
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setShowSuggest(true); }}
              onFocus={() => q.trim() && setShowSuggest(true)}
              placeholder="Search for products, brands and more..."
              className="flex-1 min-w-0 h-11 px-5 text-sm bg-slate-100 rounded-full outline-none border border-transparent focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
            />
            <button type="submit" aria-label="Search"
              className="h-11 w-11 shrink-0 rounded-lg bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center">
              <Search size={18} />
            </button>
          </form>
          {showSuggest && q.trim() && (
            <div className="absolute left-0 right-14 top-[calc(100%+6px)] z-50 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1">
              {suggests.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setShowSuggest(false);
                    setQ('');
                    navigate(`/p/${p.id}`);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left"
                >
                  <span className="h-10 w-10 rounded-md bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                    <img src={p.image} alt="" className="h-full w-full object-contain" />
                  </span>
                  <span className="text-sm font-bold text-slate-800 line-clamp-1">{p.name}</span>
                </button>
              ))}
              {suggests.length === 0 && (
                <p className="px-4 py-3 text-sm text-slate-400">{suggesting ? 'Searching…' : 'No matching products'}</p>
              )}
              <button
                type="button"
                onClick={() => goSearch(q)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-violet-50 text-left border-t border-slate-100"
              >
                <span className="h-9 w-9 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                  <Search size={16} />
                </span>
                <span className="flex-1 text-sm text-slate-700">
                  Show all results for <span className="font-semibold">{q.trim()}</span>
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </button>
            </div>
          )}
        </div>

        <Link to="/c?wishlist=1" className="hidden sm:inline-flex flex-col items-center gap-0.5 text-[11px] font-medium text-slate-500 hover:text-brand-600 px-1 relative">
          <Heart size={20} />
          Wishlist
          {wishCount > 0 && (
            <span className="absolute -top-1 right-0 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[9px] text-white flex items-center justify-center">
              {wishCount}
            </span>
          )}
        </Link>
        <button type="button" aria-label={`Open cart${count ? `, ${count} items` : ''}`} onClick={() => setCartOpen(true)} className="inline-flex flex-col items-center gap-0.5 text-[11px] font-medium text-slate-500 hover:text-brand-600 px-1 relative">
          <ShoppingCart size={20} />
          Cart
          {count > 0 && (
            <span className="absolute -top-1 right-0 min-w-[16px] h-4 px-1 rounded-full bg-brand-500 text-[9px] font-bold text-white flex items-center justify-center">
              {count}
            </span>
          )}
        </button>
        {user ? (
          <div className="relative hidden sm:block">
            <button type="button" onClick={() => setMenu(m => !m)}
              className="inline-flex items-center gap-1.5 text-sm text-slate-700 hover:text-brand-700">
              <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                <User size={16} />
              </span>
              <span className="font-medium max-w-[110px] truncate">Hi, {firstName}</span>
            </button>
            {menu && (
              <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
                <button type="button" onClick={() => { setMenu(false); logout(); }}
                  className="w-full text-left px-3 py-2 text-sm text-rose-500 hover:bg-rose-50">
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-700">
            <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
              <User size={16} />
            </span>
            Sign In
          </Link>
        )}
      </div>
<nav className={'qc-header-cats ' + (navigationLevel === 'module' ? 'is-module-nav ' : 'is-catalog-nav ') + (navigationLevel === 'module' && isScrolledDown ? 'is-compact' : '')}>
        <Link to="/" className={!selectedModuleSlug ? 'qc-header-module active' : 'qc-header-module'}>
          <span className="qc-header-all-icon"><Home size={22} strokeWidth={1.8} /></span>
          <span>Home</span>
        </Link>
        {navigationItems.map(item => {
          const image = item.image || moduleFallbackImages[item.slug] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=80&fit=crop';
          return <Link key={item._id || item.slug} to={navigationHref(item)} className={isNavigationItemActive(item) ? 'qc-header-module active' : 'qc-header-module'}>
            <img src={image} alt="" />
            <span>{item.name}</span>
          </Link>;
        })}
      </nav>
      {open && <LocationModal onClose={() => setOpen(false)} />}
      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
    </header>
  );
}
