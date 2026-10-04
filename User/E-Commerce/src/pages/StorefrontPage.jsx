import CartDrawer from '../components/CartDrawer'
import CategoryGrid from '../components/CategoryGrid'
import CustomerAuthModal from '../components/CustomerAuthModal'
import HeroSection from '../components/HeroSection'
import LocationModal from '../components/LocationModal'
import ProductDetailsModal from '../components/ProductDetailsModal'
import PromotionBanners from '../components/PromotionBanners'
import {
  FlashDealsSection,
  ProductGridSection,
  TrendingProductsSection,
} from '../components/ProductSections'
import StoreFooter from '../components/StoreFooter'
import StoreHeader from '../components/StoreHeader'
import StoreNavigation from '../components/StoreNavigation'
import { CookieNotice, MaintenancePage, Toast } from '../components/StoreNotices'
import { ADMIN_PREVIEW, money } from '../lib/storefront'
import useStorefront from '../hooks/useStorefront'

export default function StorefrontPage() {
  const store = useStorefront()
  const {
    home, products, loading, error, load, business, selectedComponentData, customer,
    category, setCategory, subCategory, setSubCategory, childCategory, setChildCategory,
    selectedModule, setSelectedModule, query, setQuery,
    cart, favorites, cartOpen, setCartOpen, selected, setSelected,
    locationOpen, setLocationOpen, location, setLocation, authOpen, setAuthOpen,
    authMode, setAuthMode, message, setMessage, checkout, setCheckout, address,
    setAddress, phone, setPhone, busy, cookieAccepted, setCookieAccepted,
    categories, subCategories, childCategories, modules, shown, deals, bestsellers, heroBanner, categoryProduct, count, subtotal,
    cartItem, changeQty, toggleFavorite, calculateQuote, submitAuth, placeOrder,
  } = store

  const mainAdminWebsite = home?.isMainWebsite === true
  const showDefaultStorefront = mainAdminWebsite || (ADMIN_PREVIEW && selectedComponentData.length === 0)
  const hasComponent = (...slugs) => selectedComponentData.some(component => slugs.includes(String(component.slug || '').toLowerCase()))
  const hasComponentType = (...types) => selectedComponentData.some(component => types.includes(String(component.type || '').toLowerCase().replace(/-/g, '_')))
  const componentEnabled = (slugs, types = []) => hasComponent(...slugs) || (types.length > 0 && hasComponentType(...types))

  const showLogo = showDefaultStorefront || componentEnabled(['logo', 'quick-commerce-header'], ['header', 'logo'])
  const showSearch = showDefaultStorefront || hasComponent('quick-commerce-search') || hasComponentType('search')
  const showLocation = showDefaultStorefront || hasComponent('quick-commerce-location') || hasComponentType('location')
  const showProfile = showDefaultStorefront || hasComponent('quick-commerce-profile', 'quick-commerce-account') || hasComponentType('profile', 'account')
  const showCartButton = showDefaultStorefront || hasComponent('quick-commerce-cart', 'quick-commerce-cart-page', 'quick-commerce-checkout') || hasComponentType('cart', 'cart_page', 'checkout')
  const showFavorites = showDefaultStorefront || hasComponent('quick-commerce-favorites') || hasComponentType('favorites')
  const showNavigation = showDefaultStorefront || componentEnabled(['quick-commerce-categories'], ['navbar', 'categories'])
  const showHero = showDefaultStorefront || componentEnabled(['quick-commerce-offer-banner'], ['hero', 'banner'])
  const showCategories = showDefaultStorefront || hasComponent('quick-commerce-category-tiles') || hasComponentType('category_tiles')
  const showDeals = showDefaultStorefront || hasComponent('quick-commerce-flash-deals') || hasComponentType('flash_deals')
  const showProductGrid = showDefaultStorefront || componentEnabled(['quick-commerce-product-grid', 'quick-commerce-product-listing'], ['product_grid', 'product_listing'])
  const showFooter = showDefaultStorefront || componentEnabled(['quick-commerce-footer'], ['footer'])
  const showProductDetails = showDefaultStorefront || hasComponent('quick-commerce-product-details') || hasComponentType('product_details')
  const productSectionProps = {
    loading, error, onRetry: load, business, showFavorites, showCart: showCartButton,
    favorites, cartItem, toggleFavorite, changeQty, setMessage,
    canOpenDetails: showProductDetails, setSelected,
  }

  if (business.maintenanceMode) return <MaintenancePage business={business} />
  if (loading && !home) return <main className="loading storefront-loading">Loading store...</main>
  if (error && !home) return <main className="error-box storefront-error"><span>{error}</span><button onClick={load}>Try again</button></main>

  return <div className="storefront mx-auto min-h-screen max-w-[1600px] bg-white text-slate-800" style={{ '--brand-color': business.primaryColor || business.accentColor || '#f45b15' }}>
    <StoreHeader
      business={business} customer={customer} category={category} categories={categories} query={query}
      setCategory={setCategory} setQuery={setQuery} location={location}
      onOpenLocation={() => setLocationOpen(true)} onOpenAccount={() => setAuthOpen(true)}
      onOpenCart={() => setCartOpen(true)} count={count}
      onSearch={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}
      showLogo={showLogo} showSearch={showSearch} showLocation={showLocation}
      showProfile={showProfile} showCart={showCartButton} showFavorites={showFavorites}
    />
    <StoreNavigation {...{ modules, category, selectedModule, setSelectedModule, setCategory, setSubCategory, setChildCategory }} visible={showNavigation} />

    <main id="top" className="mx-auto w-full">
      <HeroSection banner={heroBanner} deals={deals} visible={showHero && !selectedModule} />
      <CategoryGrid
        categories={childCategory ? [] : subCategory ? childCategories : category ? subCategories : categories}
        categoryProduct={categoryProduct}
        onSelect={name => {
          if (subCategory) setChildCategory(name)
          else if (category) setSubCategory(name)
          else setCategory(name)
          document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })
        }}
        title=""
        onBack={childCategory ? () => setChildCategory('') : subCategory ? () => { setSubCategory(''); setChildCategory('') } : category ? () => setCategory('') : null}
        visible={showCategories && Boolean(selectedModule)}
      />
      {showDeals && !selectedModule && <FlashDealsSection {...productSectionProps} products={deals} prefix="deal" />}
      {mainAdminWebsite
        ? selectedModule
          ? <ProductGridSection {...productSectionProps} products={shown} prefix="catalog" />
          : <>
            <PromotionBanners banners={home?.promotionalBanners || []} />
            <TrendingProductsSection {...productSectionProps} products={bestsellers} city={home?.city} />
          </>
        : (showProductGrid || selectedModule) && <ProductGridSection {...productSectionProps} products={shown} prefix="catalog" />}
    </main>

    <StoreFooter business={business} visible={showFooter} />
    <Toast message={message} clear={() => setMessage('')} />
    <CookieNotice business={business} enabled={selectedComponentData.length > 0} accepted={cookieAccepted} accept={() => setCookieAccepted(true)} />

    <CartDrawer
      open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} count={count} subtotal={subtotal} business={business}
      changeQty={changeQty} checkout={checkout} setCheckout={setCheckout} address={address} setAddress={setAddress}
      phone={phone} setPhone={setPhone} location={location} setLocationOpen={setLocationOpen} busy={busy}
      placeOrder={placeOrder} calculateQuote={calculateQuote}
    />
    <LocationModal open={locationOpen} onClose={() => setLocationOpen(false)} location={location} setLocation={setLocation} setMessage={setMessage} />
    <ProductDetailsModal product={selected} onClose={() => setSelected(null)} business={business} changeQty={changeQty} setMessage={setMessage} />
    <CustomerAuthModal open={authOpen} onClose={() => setAuthOpen(false)} mode={authMode} setMode={setAuthMode} submitAuth={submitAuth} busy={busy} />
  </div>
}
