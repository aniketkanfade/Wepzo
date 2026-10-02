import { useEffect } from 'react';
import { ClipboardList, Home, ShoppingCart, UserRound } from 'lucide-react';
import { Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import TrackPage from './pages/TrackPage';
import LoginPage from './pages/LoginPage';

function UnavailableFeature() {
  return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-slate-500">This feature is not included in this website.</div>;
}

function MobileAppNavigation({ componentEnabled, pathname }) {
  return (
    <nav className="qc-mobile-app-nav" aria-label="Store navigation">
      <Link to="/" className={pathname === '/' ? 'active' : ''}><Home /><span>Home</span></Link>
      {componentEnabled('quick-commerce-order-tracking') && <Link to="/track" className={pathname.startsWith('/track') ? 'active' : ''}><ClipboardList /><span>Orders</span></Link>}
      {componentEnabled('quick-commerce-cart') && <button type="button" onClick={() => window.dispatchEvent(new Event('wepzo:open-cart'))}><ShoppingCart /><span>Cart</span></button>}
      {componentEnabled('quick-commerce-account') && <Link to="/login" className={pathname === '/login' ? 'active' : ''}><UserRound /><span>Account</span></Link>}
    </nav>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const builderPreview = searchParams.get('builderPreview') === '1';
  const templatePreview = searchParams.get('templatePreview') === '1';
  const publishedPreview = searchParams.get('published') === '1';
  const savedContext = (() => {
    try { return JSON.parse(sessionStorage.getItem('wepzo-website-context') || 'null'); } catch { return null; }
  })();
  const activeWebsiteMode = publishedPreview || builderPreview ? (publishedPreview ? 'published' : 'builder') : savedContext?.mode;
  const websiteContextActive = activeWebsiteMode === 'published' || activeWebsiteMode === 'builder';
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
    <div className="min-h-screen flex flex-col">
      <Header componentEnabled={componentEnabled} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage componentEnabled={componentEnabled} builderPreview={builderPreview} templatePreview={templatePreview} />} />
          <Route path="/c" element={searchParams.get('wishlist') === '1'
            ? featureRoute('quick-commerce-wishlist', <CategoryPage />)
            : featureRoute('quick-commerce-product-listing', <CategoryPage />)} />
          <Route path="/p/:id" element={featureRoute('quick-commerce-product-details', <ProductPage />)} />
          <Route path="/cart" element={featureRoute('quick-commerce-cart-page', <CartPage />)} />
          <Route path="/login" element={featureRoute('quick-commerce-account', <LoginPage />)} />
          <Route path="/checkout" element={featureRoute('quick-commerce-checkout', <CheckoutPage />)} />
          <Route path="/track/:orderNo" element={featureRoute('quick-commerce-order-tracking', <TrackPage />)} />
          <Route path="/track" element={featureRoute('quick-commerce-order-tracking', <TrackPage />)} />
        </Routes>
      </main>
      {componentEnabled('quick-commerce-footer') && <Footer componentEnabled={componentEnabled} />}
      <MobileAppNavigation componentEnabled={componentEnabled} pathname={location.pathname} />
    </div>
  );
}
