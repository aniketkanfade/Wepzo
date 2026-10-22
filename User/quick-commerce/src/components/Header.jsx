import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Heart, Search, ShoppingCart, User, MapPin, Home, Mic, ClipboardList, Wallet, Tag, Award, Gift, Truck, Zap, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '../store/cart';
import { useLocationStore } from '../store/location';
import { useAuthStore } from '../store/auth';
import { useWishlist } from '../store/wishlist';
import LocationModal from './LocationModal';
import { shop } from '../api';
import { etaMinutesFromKm, haversineKm } from '../utils/eta';
import CartDrawer from './CartDrawer';
import { useSiteSettings } from '../store/siteSettings';
import googleLensIcon from '../assets/google-lens-icon.svg';
import { prepareVisualSearchImage, setVisualSearchImage } from '../utils/visualSearch';

function locationSubtitle(current) {
  if (!current) return 'Select location';
  const area = String(current.area || '').trim();
  const city = String(current.city || '').trim();
  const addressParts = String(current.line || current.address || '').split(',').map(part => part.trim()).filter(Boolean);
  const areaIndex = addressParts.findIndex(part => part.toLowerCase() === area.toLowerCase());
  const priorLocality = areaIndex > 0
    ? [...addressParts.slice(0, areaIndex)].reverse().find(part => !/\b(road|rd\.?|street|st\.?|highway|bypass|lane|marg)\b/i.test(part))
    : '';
  const exactArea = priorLocality && priorLocality.toLowerCase() !== city.toLowerCase() ? priorLocality : area;
  const areaIsAdministrative = /\b(taluka|tehsil|district|division|subdistrict)\b/i.test(exactArea);
  const parts = [!areaIsAdministrative && exactArea.toLowerCase() !== city.toLowerCase() ? exactArea : '', city].filter(Boolean);
  return parts.join(', ') || current.line || 'Location';
}

function productSuggestionName(product) {
  return [product?.name, product?.productName, product?.product?.name, product?.product?.productName, product?.title, product?.brand]
    .map(value => String(value || '').trim())
    .find(Boolean) || 'Product';
}

export default function Header({ componentEnabled = () => true }) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const selectedModuleSlug = searchParams.get('module') || '';
  const selectedModuleId = searchParams.get('moduleId') || '';
  const selectedCategoryId = searchParams.get('categoryId') || '';
  const selectedSubCategoryId = searchParams.get('subCategoryId') || '';
  const productId = location.pathname.match(/^\/p\/([^/]+)/)?.[1] || '';
  const count = useCart(s => s.items.reduce((n, x) => n + x.qty, 0));
  const wishCount = useWishlist(s => s.items.length);
  const current = useLocationStore(s => s.current);
  const savedLocations = useLocationStore(s => s.saved);
  const pickup = useLocationStore(s => s.pickup);
  const setPickup = useLocationStore(s => s.setPickup);
  const business = useSiteSettings(s => s.business);
  const setBusiness = useSiteSettings(s => s.setBusiness);
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
  const profileRef = useRef(null);
  const timerRef = useRef(null);
  const imageInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const [searchNotice, setSearchNotice] = useState('');
  const [imageSearching, setImageSearching] = useState(false);

  useEffect(() => {
    const openLocation = () => setOpen(true);
    window.addEventListener('wepzo:open-location', openLocation);
    return () => window.removeEventListener('wepzo:open-location', openLocation);
  }, []);
  useEffect(() => {
    const openCart = () => {
      if (!['/cart', '/checkout'].includes(window.location.pathname)) setCartOpen(true);
    };
    window.addEventListener('wepzo:open-cart', openCart);
    return () => window.removeEventListener('wepzo:open-cart', openCart);
  }, []);
  useEffect(() => {
    let previousY = window.scrollY;
    let directionDistance = 0;
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - previousY;
      if (window.matchMedia('(max-width: 640px)').matches) {
        setIsScrolledDown(currentY >= 24);
      } else if (currentY < 24) {
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
    shop.home({ lat: current?.lat, lng: current?.lng }).then((d) => {
      setBusiness(d?.business || {});
      if (!pickup?.lat && d?.pickup) setPickup(d.pickup);
      setCatalog({ modules: d?.modules || [], categories: d?.categories || [], subCategories: d?.subCategories || [], childCategories: d?.childCategories || [] });
    }).catch(() => {});
  }, [current?.lat, current?.lng, pickup, setPickup, setBusiness]);

  useEffect(() => {
    const name = business.businessName || 'WEPZO';
    document.title = name;
    let icon = document.querySelector('link[rel~="icon"]');
    if (!icon) {
      icon = document.createElement('link');
      icon.rel = 'icon';
      document.head.appendChild(icon);
    }
    if (business.favicon) icon.href = business.favicon;
  }, [business.businessName, business.favicon]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current?.contains(e.target)) setShowSuggest(false);
      if (!profileRef.current?.contains(e.target)) setMenu(false);
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
      shop.products({ q: query, lat: current?.lat, lng: current?.lng })
        .then((list) => setSuggests(Array.isArray(list) ? list.slice(0, 8) : []))
        .catch(() => setSuggests([]))
        .finally(() => setSuggesting(false));
    }, 200);
    return () => clearTimeout(timerRef.current);
  }, [q, current?.lat, current?.lng]);

  const goSearch = (query) => {
    const term = (query ?? q).trim();
    setShowSuggest(false);
    navigate(term ? `/c?q=${encodeURIComponent(term)}` : '/c');
  };

  const submit = (e) => {
    e.preventDefault();
    goSearch();
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSearchNotice('Voice search is not supported in this browser.');
      window.setTimeout(() => setSearchNotice(''), 2800);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    recognition.onstart = () => setSearchNotice('Listening...');
    recognition.onresult = event => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      setSearchNotice('');
      if (transcript) { setQ(transcript); goSearch(transcript); }
    };
    recognition.onend = () => setSearchNotice(currentNotice => currentNotice === 'Listening...' ? '' : currentNotice);
    recognition.onerror = () => {
      setSearchNotice('Could not hear that. Please try again.');
      window.setTimeout(() => setSearchNotice(''), 2800);
    };
    recognition.start();
  };

  const searchFromImage = async file => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSearchNotice('Choose an image file to search visually.');
      window.setTimeout(() => setSearchNotice(''), 2800);
      return;
    }
    setImageSearching(true);
    setSearchNotice('Preparing your image...');
    try {
      const imageData = await prepareVisualSearchImage(file);
      setVisualSearchImage(imageData);
      const params = new URLSearchParams();
      params.set('visualSearch', '1');
      if (selectedModuleSlug) params.set('module', selectedModuleSlug);
      setQ('');
      setShowSuggest(false);
      navigate(`/c?${params.toString()}`);
      setSearchNotice('');
    } catch {
      setSearchNotice('Could not read that image. Please choose another photo.');
      window.setTimeout(() => setSearchNotice(''), 3000);
    } finally {
      setImageSearching(false);
    }
  };


  useEffect(() => {
    let cancelled = false;
    setProductContext(null);
    if (!productId) return () => { cancelled = true; };
    shop.product(decodeURIComponent(productId), { lat: current?.lat, lng: current?.lng })
      .then(product => { if (!cancelled) setProductContext(product); })
      .catch(() => { if (!cancelled) setProductContext(null); });
    return () => { cancelled = true; };
  }, [productId, current?.lat, current?.lng]);

  const queryCategoryName = searchParams.get('category') || '';
  const queryMatchesCategory = catalog.categories.some(item => item.name === queryCategoryName);
  const routeSubCategory = catalog.subCategories.find(item => String(item._id) === selectedSubCategoryId)
    || (!queryMatchesCategory ? catalog.subCategories.find(item => item.name === queryCategoryName) : undefined);
  const productSubCategory = catalog.subCategories.find(item => item.name === (productContext?.subCategory || ''));
  const activeSubCategory = routeSubCategory || productSubCategory;
  const activeCategory = catalog.categories.find(item => String(item._id) === selectedCategoryId)
    || catalog.categories.find(item => String(item._id) === String(activeSubCategory?.categoryId))
    || catalog.categories.find(item => item.name === (activeSubCategory?.mainCategory || queryCategoryName || productContext?.category || ''));
  const activeModule = catalog.modules.find(item => String(item._id) === selectedModuleId && item.slug === selectedModuleSlug)
    || catalog.modules.find(item => item.slug === selectedModuleSlug)
    || catalog.modules.find(item => String(item._id) === String(activeCategory?.moduleId));
  let navigationItems = catalog.modules;
  let navigationLevel = 'module';
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
      if (item._id) next.set('moduleId', item._id);
      else next.delete('moduleId');
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
    if (navigationLevel === 'module') {
      return String(item._id || item.slug) === String(activeModule?._id || activeModule?.slug);
    }
    if (navigationLevel === 'category') return String(item._id) === String(activeCategory?._id);
    return String(item._id) === String(activeSubCategory?._id);
  };
  const isHomeNavigationActive = location.pathname === '/'
    && !selectedModuleSlug
    && !selectedModuleId
    && !selectedCategoryId
    && !selectedSubCategoryId
    && !searchParams.has('childCategoryId')
    && !searchParams.has('category');
  const placeLine = locationSubtitle(current);
  const compactPlaceLine = placeLine;
  const matchingSavedLocation = current && (savedLocations || []).find(saved => {
    if (current.id && saved.id && String(current.id) === String(saved.id)) return true;
    const distance = haversineKm(current.lat, current.lng, saved.lat, saved.lng);
    if (distance != null && distance <= 0.1) return true;
    const currentAddress = String(current.line || current.address || '').trim().toLowerCase();
    const savedAddress = String(saved.line || saved.address || '').trim().toLowerCase();
    return Boolean(currentAddress && savedAddress && currentAddress === savedAddress);
  });
  const rawLocationLabel = String(matchingSavedLocation?.label || (current?.label === 'Current' ? 'Other' : current?.label || 'Other')).trim();
  const savedLocationLabel = /^(home|work|office|other)$/i.test(rawLocationLabel)
    ? (/^(work|office)$/i.test(rawLocationLabel) ? 'Office' : rawLocationLabel[0].toUpperCase() + rawLocationLabel.slice(1).toLowerCase())
    : '';
  const storeLat = pickup?.lat ?? 21.1458;
  const storeLng = pickup?.lng ?? 79.0882;
  const km = haversineKm(storeLat, storeLng, current?.lat, current?.lng);
  const mins = etaMinutesFromKm(km);
  const etaLabel = mins != null ? `Delivery in ${mins} mins` : 'Delivery time unavailable';
  const firstName = user?.name?.split(' ')[0] || user?.name;
  const hasHeaderComponents = [
    'quick-commerce-header', 'quick-commerce-location', 'quick-commerce-search',
    'quick-commerce-categories', 'quick-commerce-favorites', 'quick-commerce-cart', 'quick-commerce-profile',
  ].some(componentEnabled);
  const openCart = () => {
    if (!['/cart', '/checkout'].includes(location.pathname)) setCartOpen(true);
  };
  const profileItems = [
    [User, 'Profile Settings', '/account/profile'],
    [ClipboardList, 'My Orders', '/account/orders'],
    [Wallet, 'Wallet', '/account/wallet'],
    [Tag, 'Coupons', '/account/coupons'],
    [Award, 'Loyalty Points', '/account/loyalty'],
    [Gift, 'Referral Code', '/account/referral'],
  ];

  return (
    <>
    {hasHeaderComponents && <header className="qc-header sticky top-0 z-40 bg-white border-b border-slate-100 shadow-[0_1px_8px_rgba(15,23,42,0.04)]">
      <div className="qc-header-main max-w-[1280px] mx-auto px-4 min-h-[68px] py-2.5 flex items-center gap-3">
        {componentEnabled('quick-commerce-header') && <Link to="/" className="qc-header-logo shrink-0 font-extrabold text-xl tracking-tight text-slate-900" aria-label={business.businessName || 'WEPZO'}>
          {business.businessLogo && <img src={business.businessLogo} alt={business.businessName || 'Business logo'} className="qc-header-brand-image" />}
        </Link>}
        {componentEnabled('quick-commerce-location') && <button type="button" onClick={() => setOpen(true)}
          title={current?.line || current?.address || compactPlaceLine}
          className="qc-header-location flex flex-col items-start text-left max-w-[min(100%,24rem)] hover:bg-slate-50 rounded-lg px-1 py-0.5">
          <span className="qc-location-delivery inline-flex items-center gap-1 font-bold text-sm leading-tight">
            <Truck size={14} aria-hidden="true" />
            {etaLabel}
          </span>
          <span className="qc-location-mobile-eta hidden items-center gap-1 font-bold" aria-label={etaLabel}>
            <Zap size={13} aria-hidden="true" />
            {mins != null ? `${mins} minutes` : 'Time unavailable'}
          </span>
          <span className="qc-location-line inline-flex items-start gap-1 text-sm text-slate-700 leading-snug">
            <MapPin size={14} className="qc-location-pin shrink-0 mt-0.5 text-violet-600" />
            {savedLocationLabel && <span className="qc-location-saved-label">{savedLocationLabel}</span>}
            <span className="qc-location-compact font-medium">{compactPlaceLine}</span>
            <ChevronDown size={14} className="shrink-0 mt-0.5 text-slate-500" />
          </span>
        </button>}

        {componentEnabled('quick-commerce-search') && <div ref={boxRef} className={'qc-header-search flex-1 relative min-w-0' + (isScrolledDown ? ' is-mobile-sticky' : '')}>
          <form onSubmit={submit} className="flex items-center gap-2">
            <button type="submit" className="qc-search-submit-icon" aria-label="Search products">
              <Search size={20} />
            </button>
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setShowSuggest(true); }}
              onFocus={() => q.trim() && setShowSuggest(true)}
              placeholder="Search for products, brands and more..."
              className="flex-1 min-w-0 h-11 px-5 text-sm bg-slate-100 rounded-full outline-none border border-transparent focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
            />
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" aria-label="Choose an image to search products" onChange={event => { searchFromImage(event.target.files?.[0]); event.target.value = ''; }} />
            <button type="button" disabled={imageSearching} onClick={() => imageInputRef.current?.click()} aria-label="Search using an image" title="Search using an image" className="qc-search-tool h-10 w-9 shrink-0 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center disabled:opacity-50">
              <img src={googleLensIcon} alt="" className="h-6 w-6" />
            </button>
            <button type="button" onClick={startVoiceSearch} aria-label="Search by voice" title="Search by voice" className="qc-search-tool qc-search-tool-mic h-10 w-9 shrink-0 rounded-lg text-white hover:brightness-95 flex items-center justify-center">
              <Mic size={19} />
            </button>
          </form>
          {searchNotice && <p role="status" className="absolute left-0 right-0 top-[calc(100%+5px)] z-50 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg">{searchNotice}</p>}
          {showSuggest && q.trim() && (
            <div className="qc-search-suggestions absolute left-0 right-14 top-[calc(100%+6px)] z-50 rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1" style={{ backgroundColor: '#e9edf2' }}>
              {suggests.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setShowSuggest(false);
                    setQ('');
                    navigate(`/p/${p.id}`);
                  }}
                  className="qc-search-suggestion-item w-full items-center gap-2 px-2 py-1 hover:bg-slate-50 text-left"
                  style={{ display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr)', width: '100%', minHeight: 42, padding: '4px 8px', textAlign: 'left' }}
                >
                  <span className="qc-search-suggestion-image h-9 w-9 rounded-md bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                    <img src={p.image} alt="" className="h-full w-full object-contain" />
                  </span>
                  <div className="qc-search-suggestion-name" style={{ display: 'block', gridColumn: 2, minWidth: 0, color: '#1f2937', fontSize: 12, fontWeight: 650, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{productSuggestionName(p)}</div>
                </button>
              ))}
              {suggests.length === 0 && (
                <p className="px-4 py-3 text-sm text-slate-400">{suggesting ? 'Searching…' : 'No matching products'}</p>
              )}
            </div>
          )}
        </div>}

        {componentEnabled('quick-commerce-favorites') && <Link to="/c?wishlist=1" className="qc-header-favorites hidden sm:inline-flex flex-col items-center gap-0.5 text-[11px] font-medium text-slate-500 hover:text-brand-600 px-1 relative">
          <Heart size={20} />
          Wishlist
          {wishCount > 0 && (
            <span className="qc-header-favorites-count absolute -top-1 right-0 min-w-[16px] h-4 px-1 rounded-full text-[9px] text-white flex items-center justify-center">
              {wishCount}
            </span>
          )}
        </Link>}
        {componentEnabled('quick-commerce-cart') && <button type="button" aria-label={`Open cart${count ? `, ${count} items` : ''}`} onClick={openCart} className="qc-header-cart inline-flex flex-col items-center gap-0.5 text-[11px] font-medium text-slate-500 hover:text-brand-600 px-1 relative">
          <ShoppingCart size={20} />
          Cart
          {count > 0 && (
            <span className="qc-header-cart-count absolute -top-1 right-0 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
              {count}
            </span>
          )}
        </button>}
        {componentEnabled('quick-commerce-profile') && <div className="qc-header-profile relative" ref={profileRef}>
          <button type="button" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(value => !value)} className="qc-header-profile-trigger inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-violet-100">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-600 text-white"><User size={18}/></span>
            <span className="hidden lg:block max-w-[100px] truncate">{user ? firstName : 'Sign In'}</span>
            <ChevronDown size={15} className="text-slate-500" />
          </button>
          {menu && <div role="menu" className="absolute right-0 top-full z-[70] mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {user ? <>
              {profileItems.map(([Icon, label, href]) => <Link key={href} role="menuitem" to={href} onClick={() => setMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-800 hover:bg-violet-50"><Icon size={17} className="shrink-0 text-slate-500"/><span>{label}</span></Link>)}
              {componentEnabled('quick-commerce-favorites') && <Link role="menuitem" to="/c?wishlist=1" onClick={() => setMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-800 hover:bg-violet-50"><Heart size={17} className="shrink-0 text-slate-500"/><span>Favorites</span>{wishCount > 0 && <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600">{wishCount}</span>}</Link>}
              <Link role="menuitem" to="/track" onClick={() => setMenu(false)} className="mt-1 flex items-center gap-3 border-t border-slate-200 px-4 py-2.5 text-sm text-slate-800 hover:bg-violet-50"><Truck size={17} className="text-slate-500"/><span>Track Order</span></Link>
              <button type="button" role="menuitem" onClick={() => { setMenu(false); logout(); navigate('/'); }} className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-violet-50"><LogOut size={17} className="text-slate-500"/><span>Logout</span></button>
            </> : <>
              {componentEnabled('quick-commerce-favorites') && <Link role="menuitem" to="/c?wishlist=1" onClick={() => setMenu(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-800 hover:bg-violet-50"><Heart size={17}/><span>Favorites</span>{wishCount > 0 && <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600">{wishCount}</span>}</Link>}
              <Link role="menuitem" to="/login" onClick={() => setMenu(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-800 hover:bg-violet-50"><User size={17}/><span>Sign In / Create Account</span></Link>
              <Link role="menuitem" to="/track" onClick={() => setMenu(false)} className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-800 hover:bg-violet-50"><Truck size={17}/><span>Track Order</span></Link>
            </>}
          </div>}
        </div>}
      </div>
      {componentEnabled('quick-commerce-categories') && <nav className={'qc-header-cats ' + (navigationLevel === 'module' ? 'is-module-nav ' : 'is-catalog-nav ') + (navigationLevel === 'module' && isScrolledDown ? 'is-compact' : '')}>
        <Link to="/" className={isHomeNavigationActive ? 'qc-header-module active' : 'qc-header-module'}>
          <span className="qc-header-all-icon"><Home size={22} strokeWidth={1.8} /></span>
          <span>Home</span>
        </Link>
        {navigationItems.map((item, index) => {
          const image = item.image || moduleFallbackImages[item.slug] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=80&fit=crop';
          const isDuplicateGrocery = item.slug === 'grocery'
            && navigationItems.findIndex(module => module.slug === 'grocery') !== index;
          const label = isDuplicateGrocery ? 'Daily Needs' : item.name;
          return <Link key={item._id || item.slug} to={navigationHref(item)} className={isNavigationItemActive(item) ? 'qc-header-module active' : 'qc-header-module'}>
            <img src={image} alt="" />
            <span>{label}</span>
          </Link>;
        })}
      </nav>}
    </header>}
    {componentEnabled('quick-commerce-location') && open && <LocationModal onClose={() => setOpen(false)} />}
    {componentEnabled('quick-commerce-cart') && cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
    </>
  );
}
