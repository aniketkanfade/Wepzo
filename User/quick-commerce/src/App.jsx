import { useEffect } from 'react';
import { ClipboardList, Home, ShoppingCart, UserRound } from 'lucide-react';
import { Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import ProductPage from './pages/ProductPage';
import CheckoutPage from './pages/CheckoutPage';
import TrackPage from './pages/TrackPage';
import LoginPage from './pages/LoginPage';
import AccountPage from './pages/AccountPage';
import { useSiteSettings } from './store/siteSettings';
import { useCart } from './store/cart';
import CartDrawer from './components/CartDrawer';

function UnavailableFeature() {
  return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-slate-500">This feature is not included in this website.</div>;
}

function MobileAppNavigation({ componentEnabled, pathname, onOpenCart }) {
  const count = useCart(state => state.items.reduce((total, item) => total + item.qty, 0));
  return (
    <nav className="qc-mobile-app-nav" aria-label="Store navigation">
      <Link to="/" className={pathname === '/' ? 'active' : ''}><Home /><span>Home</span></Link>
      {componentEnabled('quick-commerce-order-tracking') && <Link to="/track" className={pathname.startsWith('/track') ? 'active' : ''}><ClipboardList /><span>Orders</span></Link>}
      {componentEnabled('quick-commerce-cart') && <button type="button" onClick={onOpenCart} className={`${pathname === '/cart' ? 'active ' : ''}qc-mobile-cart-link`}><ShoppingCart /><span>Cart</span>{count > 0 && <b className="qc-mobile-cart-count">{count}</b>}</button>}
      {componentEnabled('quick-commerce-account') && <Link to="/account/profile" className={pathname.startsWith('/account') || pathname === '/login' ? 'active' : ''}><UserRound /><span>Account</span></Link>}
    </nav>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const cartRoute = location.pathname === '/cart';
  const checkoutRoute = location.pathname === '/checkout';
  const backgroundLocation = cartRoute || checkoutRoute
    ? location.state?.backgroundLocation || { pathname: '/', search: location.search, hash: '' }
    : null;
  const business = useSiteSettings(state => state.business);
  const searchParams = new URLSearchParams(location.search);
  const builderPreview = searchParams.get('builderPreview') === '1';
  const templatePreview = searchParams.get('templatePreview') === '1';
  const publishedPreview = searchParams.get('published') === '1';
  const savedContext = (() => {
    try { return JSON.parse(sessionStorage.getItem('wepzo-website-context') || 'null'); } catch { return null; }
  })();
  const activeWebsiteMode = publishedPreview || builderPreview ? (publishedPreview ? 'published' : 'builder') : savedContext?.mode;
  const websiteContextActive = !templatePreview && (activeWebsiteMode === 'published' || activeWebsiteMode === 'builder');
  const selectedComponents = new Set((searchParams.get('components') || savedContext?.components?.join(',') || '').split(',').filter(Boolean));
  const componentEnabled = slug => (!websiteContextActive || selectedComponents.has(slug))
    && !(templatePreview && ['quick-commerce-profile', 'quick-commerce-account'].includes(slug));

  useEffect(() => {
    const contextKey = 'wepzo-website-context';
    if (!templatePreview && (publishedPreview || builderPreview) && searchParams.get('websiteId')) {
      sessionStorage.setItem(contextKey, JSON.stringify({
        mode: publishedPreview ? 'published' : 'builder',
        websiteId: searchParams.get('websiteId'),
        websiteModuleId: searchParams.get('websiteModuleId') || '',
        components: [...selectedComponents],
      }));
      return;
    }
    if (templatePreview || !savedContext?.websiteId || !savedContext?.mode) return;
    const params = new URLSearchParams(location.search);
    params.set(savedContext.mode, '1');
    params.set('websiteId', savedContext.websiteId);
    if (savedContext.websiteModuleId) params.set('websiteModuleId', savedContext.websiteModuleId);
    params.set('components', (savedContext.components || []).join(','));
    navigate({ pathname: location.pathname, search: params.toString(), hash: location.hash }, { replace: true });
  }, [builderPreview, location.hash, location.pathname, location.search, navigate, publishedPreview, savedContext?.websiteId, templatePreview]);

  const featureRoute = (slug, page) => componentEnabled(slug) ? page : <UnavailableFeature />;

  return (
    <div className={`min-h-screen flex flex-col${templatePreview ? ' qc-template-preview' : ''}`} style={{
      '--brand-color': business.primaryColor || '#f4510b',
      '--price-color': business.themeColors?.priceColor || '#e94a0b',
      '--button-background': business.themeColors?.buttonBackground || business.primaryColor || '#f4510b',
      '--button-text': business.themeColors?.buttonText || '#ffffff',
      '--header-background': business.themeColors?.headerBackground || '#ffffff',
      '--header-text': business.themeColors?.headerText || '#172744',
      '--search-background': business.themeColors?.searchBackground || '#f8f9fb',
      '--search-button': business.themeColors?.searchButton || business.primaryColor || '#304ca3',
      '--footer-background': business.themeColors?.footerBackground || '#10223b',
      '--footer-text': business.themeColors?.footerText || '#ffffff',
      '--page-background': business.themeColors?.pageBackground || '#f4f7fb',
      '--surface-background': business.themeColors?.surfaceBackground || '#ffffff',
    }}>
      <Header componentEnabled={componentEnabled} />
      <main className="flex-1">
        <Routes location={backgroundLocation || location}>
          <Route path="/" element={<HomePage componentEnabled={componentEnabled} builderPreview={builderPreview} templatePreview={templatePreview} />} />
          <Route path="/c" element={searchParams.get('wishlist') === '1'
            ? featureRoute('quick-commerce-wishlist', <CategoryPage />)
            : featureRoute('quick-commerce-product-listing', <CategoryPage />)} />
          <Route path="/p/:id" element={featureRoute('quick-commerce-product-details', <ProductPage />)} />
          <Route path="/login" element={featureRoute('quick-commerce-account', <LoginPage />)} />
          <Route path="/account" element={featureRoute('quick-commerce-account', <AccountPage />)} />
          <Route path="/account/:section" element={featureRoute('quick-commerce-account', <AccountPage />)} />
          <Route path="/track/:orderNo" element={featureRoute('quick-commerce-order-tracking', <TrackPage />)} />
          <Route path="/track" element={featureRoute('quick-commerce-order-tracking', <TrackPage />)} />
        </Routes>
      </main>
      {componentEnabled('quick-commerce-footer') && <Footer componentEnabled={componentEnabled} />}
      <MobileAppNavigation componentEnabled={componentEnabled} pathname={location.pathname} onOpenCart={() => window.dispatchEvent(new Event('wepzo:open-cart'))} />
      {cartRoute && featureRoute('quick-commerce-cart-page', <CartDrawer backgroundLocation={backgroundLocation} onClose={() => navigate(backgroundLocation, { replace: true })} />)}
      {checkoutRoute && featureRoute('quick-commerce-checkout', <CheckoutPage backgroundLocation={backgroundLocation} />)}
    </div>
  );
}
