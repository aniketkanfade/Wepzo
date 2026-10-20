import { useEffect } from 'react';
import { ClipboardList, Home, ShoppingCart, UserRound, X } from 'lucide-react';
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
  const pendingAdd = useCart(state => state.pendingAdd);
  const confirmPendingAdd = useCart(state => state.confirmPendingAdd);
  const cancelPendingAdd = useCart(state => state.cancelPendingAdd);
  const searchParams = new URLSearchParams(location.search);
  const adminPreview = searchParams.get('adminPreview') === '1';
  const builderPreview = searchParams.get('builderPreview') === '1';
  const templatePreview = searchParams.get('templatePreview') === '1';
  const publishedPreview = searchParams.get('published') === '1';
  const savedContext = (() => {
    try { return JSON.parse(sessionStorage.getItem('wepzo-website-context') || 'null'); } catch { return null; }
  })();
  const activeWebsiteMode = adminPreview ? null : publishedPreview || builderPreview ? (publishedPreview ? 'published' : 'builder') : savedContext?.mode;
  const websiteContextActive = activeWebsiteMode === 'published' || activeWebsiteMode === 'builder';
  const componentList = searchParams.has('components')
    ? searchParams.get('components')
    : savedContext?.components?.join(',') || '';
  const selectedComponents = new Set(componentList.split(',').filter(Boolean));
  const componentEnabled = slug => (adminPreview || !websiteContextActive || selectedComponents.has(slug))
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
    if (adminPreview || templatePreview || !savedContext?.websiteId || !savedContext?.mode) return;
    const params = new URLSearchParams(location.search);
    params.set(savedContext.mode, '1');
    params.set('websiteId', savedContext.websiteId);
    if (savedContext.websiteModuleId) params.set('websiteModuleId', savedContext.websiteModuleId);
    params.set('components', (savedContext.components || []).join(','));
    navigate({ pathname: location.pathname, search: params.toString(), hash: location.hash }, { replace: true });
  }, [adminPreview, builderPreview, location.hash, location.pathname, location.search, navigate, publishedPreview, savedContext?.websiteId, templatePreview]);

  const featureRoute = (slug, page) => componentEnabled(slug) ? page : <UnavailableFeature />;

  return (
    <div className={`min-h-screen flex flex-col${templatePreview ? ' qc-template-preview' : ''}`} style={{
      '--brand-color': business.primaryColor || '#f4510b',
      '--price-color': business.themeColors?.priceColor || '#e94a0b',
      '--button-background': business.themeColors?.buttonBackground || business.primaryColor || '#f4510b',
      '--button-text': business.themeColors?.buttonText || '#ffffff',
      '--header-background': business.themeColors?.headerBackground || '#ffffff',
      '--header-text': business.themeColors?.headerText || '#172744',
      '--header-icon-color': business.themeColors?.headerIconColor || business.themeColors?.headerText || '#172744',
      '--header-hover-background': business.themeColors?.headerHoverBackground || '#f1f5f9',
      '--header-hover-text': business.themeColors?.headerHoverText || business.themeColors?.headerText || '#172744',
      '--header-category-hover-background': business.themeColors?.headerCategoryHoverBackground || '#f1f5f9',
      '--delivery-time-text': business.themeColors?.deliveryTimeText || '#dc2626',
      '--delivery-time-icon': business.themeColors?.deliveryTimeIcon || '#dc2626',
      '--cart-count-background': business.themeColors?.cartCountBackground || business.themeColors?.buttonBackground || business.primaryColor || '#f4510b',
      '--favorites-count-background': business.themeColors?.favoritesCountBackground || '#f43f5e',
      '--search-background': business.themeColors?.searchBackground || '#f8f9fb',
      '--search-button': business.themeColors?.searchButton || business.primaryColor || '#304ca3',
      '--footer-background': business.themeColors?.footerBackground || '#10223b',
      '--footer-text': business.themeColors?.footerText || '#ffffff',
      '--page-background': business.themeColors?.pageBackground || '#f4f7fb',
      '--surface-background': business.themeColors?.surfaceBackground || '#ffffff',
      '--product-card-background': business.themeColors?.productCardBackground || business.themeColors?.surfaceBackground || '#ffffff',
      '--product-card-text': business.themeColors?.productCardText || '#1f2937',
      '--product-card-hover-background': business.themeColors?.productCardHoverBackground || '#fff7ed',
      '--product-card-hover-text': business.themeColors?.productCardHoverText || business.themeColors?.headerText || '#172744',
      '--product-card-hover-border': business.themeColors?.productCardHoverBorder || '#f2c9ad',
      '--button-hover-background': business.themeColors?.buttonHoverBackground || business.themeColors?.buttonBackground || business.primaryColor || '#f4510b',
      '--button-hover-text': business.themeColors?.buttonHoverText || business.themeColors?.buttonText || '#ffffff',
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
      {pendingAdd && <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) cancelPendingAdd(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="qc-store-change-title" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="qc-store-change-title" className="text-lg font-bold text-slate-900">Change store?</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Your cart has products from another store. Clear the current cart and add {pendingAdd.product.name} from {pendingAdd.product.storeName || (typeof pendingAdd.product.store === 'string' ? pendingAdd.product.store : pendingAdd.product.store?.name) || 'this store'}?
              </p>
            </div>
            <button type="button" onClick={cancelPendingAdd} aria-label="Keep current cart" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X size={18} /></button>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={cancelPendingAdd} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">No, keep cart</button>
            <button type="button" onClick={() => {
              const pending = confirmPendingAdd();
              if (pending?.checkout) navigate('/checkout', { state: { backgroundLocation: location } });
            }} className="rounded-xl px-4 py-2.5 text-sm font-bold" style={{ background: 'var(--button-background)', color: 'var(--button-text)' }}>Clear cart &amp; add</button>
          </div>
        </section>
      </div>}
    </div>
  );
}
