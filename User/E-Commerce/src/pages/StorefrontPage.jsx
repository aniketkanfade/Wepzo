import { useMemo, useState } from 'react'
import CategoryGrid from '../components/CategoryGrid'
import CustomerAuthModal from '../components/CustomerAuthModal'
import DeliveryAddressModal from '../components/DeliveryAddressModal'
import HeroSection from '../components/HeroSection'
import LocationModal from '../components/LocationModal'
import ProductDetailPage from './ProductDetailPage'
import PromotionBanners from '../components/PromotionBanners'
import {
  CategoryRecommendationsSection,
  FlashDealsSection,
  ProductGridSection,
  TrendingProductsSection,
} from '../components/ProductSections'
import { CartPage, OrdersPage, ProfilePage, SupportPage, WishlistPage } from '../components/StoreAccountPages'
import StoreFooter from '../components/StoreFooter'
import StoreHeader from '../components/StoreHeader'
import StoreNavigation from '../components/StoreNavigation'
import MobileAppNav from '../components/MobileAppNav'
import { CookieNotice, MaintenancePage, Toast } from '../components/StoreNotices'
import { imageOf, money } from '../lib/storefront'
import useStorefront from '../hooks/useStorefront'

const asList = value => Array.isArray(value) ? value : value ? [value] : []
const bannerPlacement = banner => String(banner?.placement || banner?.position || banner?.slot || banner?.section || banner?.bannerPlacement || '')
  .trim().toLowerCase().replace(/[\s-]+/g, '_')
const bannerModules = banner => [
  banner?.moduleSlug, banner?.moduleId, banner?.module?.slug, banner?.module?._id, banner?.module?.id,
  typeof banner?.module === 'string' ? banner.module : '', ...asList(banner?.modules).flatMap(module => [module?.slug, module?._id, module?.id, typeof module === 'string' ? module : '']),
].filter(Boolean)
const hasBannerModule = banner => bannerModules(banner).length > 0
const isPlacement = (banner, names) => names.includes(bannerPlacement(banner))
const isDefaultSeededHero = banner => banner?.seedKey === 'main-admin-home-hero'
  || banner?.mainAdminSeedKey === 'main-admin-home-hero'
  || (String(banner?.title || '').trim() === 'Everything You Need Delivered in 15–20 Minutes'
    && imageOf(banner).includes('photo-1542838132-92c53300491e'))
const uniqueBanners = banners => [...new Map(banners.filter(banner => banner && banner.active !== false && banner.isActive !== false && banner.status !== 'inactive').map((banner, index) => [banner.id || banner._id || `${banner.title || 'banner'}-${index}`, banner])).values()]

export default function StorefrontPage() {
  const store = useStorefront()
  const {
    home, products, loading, error, load, business, selectedComponentData, customer,
    category, setCategory, subCategory, setSubCategory, childCategory, setChildCategory,
    selectedModule, setSelectedModule, query, setQuery,
    cart, clearCart, favorites, favoriteCatalog, favoriteCatalogLoading, selected, openProduct, closeProduct, goHome, goToModule,
    currentPage, navigatePage, quote,
    locationOpen, setLocationOpen, location, setLocation, serviceArea, checkServiceArea, authOpen, setAuthOpen,
    addressOpen, setAddressOpen, startCheckout, closeAuth, saveDeliveryAddress, saveDetectedLocation,
    authMode, setAuthMode, message, setMessage, checkout, setCheckout, address, addressDetails,
    phone, busy, cookieAccepted, setCookieAccepted,
    categories, subCategories, childCategories, modules, shown, deals, bestsellers, categoryProduct, count, subtotal,
    cartItem, changeQty, toggleFavorite, calculateQuote, submitAuth, placeOrder, signOut,
    couponCode, applyCoupon, removeCoupon, paymentMethod, setPaymentMethod,
  } = store

  const mainAdminWebsite = home?.isMainWebsite === true
  const [productInteractions, setProductInteractions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wepzo-category-product-interactions') || '{}') } catch { return {} }
  })
  const showDefaultStorefront = mainAdminWebsite || selectedComponentData.length === 0
  const hasComponent = (...slugs) => selectedComponentData.some(component => slugs.includes(String(component.slug || '').toLowerCase()))
  const hasComponentType = (...types) => selectedComponentData.some(component => types.includes(String(component.type || '').toLowerCase().replace(/-/g, '_')))
  const componentEnabled = (slugs, types = []) => hasComponent(...slugs) || (types.length > 0 && hasComponentType(...types))

  const showLogo = showDefaultStorefront || componentEnabled(['logo', 'quick-commerce-header'], ['header', 'logo'])
  const showSearch = showDefaultStorefront || hasComponent('quick-commerce-search') || hasComponentType('search')
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
  const savedIds = new Set(favorites.map(String))
  const wishlistProducts = [...new Map([...products, ...favoriteCatalog]
    .filter(product => product && (product._id || product.id))
    .map(product => [String(product._id || product.id), product])).values()]
    .filter(product => savedIds.has(String(product._id || product.id)))
  const productSectionProps = {
    loading, error, onRetry: load, business, showFavorites, showCart: showCartButton,
    favorites, cartItem, toggleFavorite, changeQty, setMessage,
    setCartOpen: open => { if (open) navigatePage('cart') }, setCheckout,
    canOpenDetails: showProductDetails, setSelected: product => {
      const id = String(product?._id || product?.id || '')
      if (id) {
        const categoryPath = [product.mainCategory || product.category, product.subCategory, product.childCategory]
          .filter(Boolean).join(' / ').trim().toLowerCase()
        const moduleSlug = String(product.moduleSlug || product.module?.slug || product.module || '').toLowerCase()
        const next = { ...productInteractions, [id]: { views: (Number(productInteractions[id]?.views) || 0) + 1, lastViewed: Date.now(), categoryPath, moduleSlug } }
        setProductInteractions(next)
        try { localStorage.setItem('wepzo-category-product-interactions', JSON.stringify(next)) } catch { /* recommendations still work for this session */ }
      }
      openProduct(product)
    },
  }
  const recommendationScope = [category, subCategory, childCategory].filter(Boolean).join(' / ')
  const showCategoryRecommendations = Boolean(selectedModule || recommendationScope || showCategories)
  const browseCategories = () => {
    if (!selectedModule && modules[0]?.slug) {
      goToModule(modules[0].slug)
      window.setTimeout(() => document.getElementById('category-browser')?.scrollIntoView({ behavior: 'smooth' }), 50)
      return
    }
    document.getElementById('category-browser')?.scrollIntoView({ behavior: 'smooth' })
  }
  const productId = selected?._id || selected?.id
  const productModuleRef = selected?.moduleSlug || selected?.module?.slug || (typeof selected?.module === 'string' ? selected.module : '')
  const productModuleId = selected?.moduleId || (typeof selected?.module === 'object' ? selected.module?._id : '')
  const categoryForProduct = home?.categories?.find(item => String(item.name || '').toLowerCase() === String(selected?.mainCategory || selected?.category || '').toLowerCase())
  const productModule = modules.find(item => item.slug === productModuleRef || String(item._id) === String(productModuleId || productModuleRef || categoryForProduct?.moduleId))
  const activeModule = selected ? (productModule?.slug || productModuleRef || selectedModule) : selectedModule
  const productCategory = String(selected?.mainCategory || selected?.category || '').toLowerCase()
  const otherProducts = selected ? products.filter(product => String(product._id || product.id) !== String(productId)) : []
  const matchingRelatedProducts = otherProducts.filter(product =>
    (productCategory && String(product.mainCategory || product.category || '').toLowerCase() === productCategory)
      || (selected?.brand && String(product.brand || '').toLowerCase() === String(selected.brand).toLowerCase()))
  const relatedProducts = (matchingRelatedProducts.length ? matchingRelatedProducts : otherProducts).slice(0, 5)
  const isProductRoute = /^\/product\/[^/]+/.test(window.location.pathname)
  const moduleSections = useMemo(() => {
    const sectionModules = (modules.length ? modules : [{ name: 'Products', slug: 'all' }])
      .filter(module => !selectedModule || String(module.slug || '').toLowerCase() === String(selectedModule).toLowerCase())
      .map(module => {
        const slug = String(module.slug || '').trim().toLowerCase();
        const productsForModule = shown.filter(product => {
          const productModule = String(product.moduleSlug || product.module || '').trim().toLowerCase();
          const productModuleId = String(product.moduleId || '').trim();
          const moduleId = String(module._id || '').trim();
          const matchesSlug = !slug || slug === 'all' || productModule === slug || productModule === String(module.name || '').trim().toLowerCase().replace(/\s+/g, '-');
          const matchesId = !moduleId || productModuleId === moduleId;
          return matchesSlug || matchesId;
        }).slice(0, 12)
        return { ...module, products: productsForModule }
      })
      .filter(section => section.products.length > 0)
    return sectionModules.length ? sectionModules : [{ name: 'Products', slug: 'all', products: shown.slice(0, 12) }]
  }, [modules, selectedModule, shown])
  const recommendationProducts = selectedModule ? moduleSections.flatMap(section => section.products) : shown
  const promotions = asList(home?.promotionalBanners).filter(banner => banner && banner.active !== false && banner.isActive !== false)
  const explicitlyPlacedHomeMid = [
    ...asList(home?.homeMidBanners), ...asList(home?.homeMiddleBanners), ...promotions.filter(banner => isPlacement(banner, ['home_mid', 'home_middle', 'home_mid_banner', 'mid_home', 'home_promotion'])),
  ]
  const homeMidBanners = uniqueBanners([
    ...explicitlyPlacedHomeMid,
  ])
  const storefrontBanners = uniqueBanners([
    ...asList(home?.storefrontBanners), ...asList(home?.storeFrontBanners), ...asList(home?.storefrontPromotions),
    ...promotions.filter(banner => isPlacement(banner, ['storefront', 'store_front', 'storefront_banner', 'store_front_banner', 'storefront_page'])),
  ])
  const activeModuleRecord = modules.find(module => String(module.slug || '').toLowerCase() === String(selectedModule || '').toLowerCase())
  const categoryPromotions = uniqueBanners([
    ...asList(home?.categoryBanners), ...asList(home?.moduleBanners),
    ...promotions.filter(banner => hasBannerModule(banner) || isPlacement(banner, ['category', 'category_banner', 'module', 'module_banner', 'module_category'])),
  ]).filter(banner => {
    const targets = bannerModules(banner)
    return targets.some(target => [selectedModule, activeModuleRecord?._id, activeModuleRecord?.name].some(value => value && String(value).toLowerCase() === String(target).toLowerCase()))
  })
  const heroBanners = uniqueBanners([
    ...asList(home?.banners).filter(banner => !bannerPlacement(banner) || isPlacement(banner, ['hero', 'top', 'top_banner', 'home_hero', 'home_top', 'top_home'])),
    ...promotions.filter(banner => isPlacement(banner, ['hero', 'top', 'top_banner', 'home_hero', 'home_top', 'top_home'])),
  ]).filter(banner => !isDefaultSeededHero(banner))

  if (business.maintenanceMode) return <MaintenancePage business={business} />
  if (loading && !home) return <main className="loading storefront-loading">Loading store...</main>
  if (error && !home) return <main className="error-box storefront-error"><span>{error}</span><button onClick={load}>Try again</button></main>

  const themeColors = business.themeColors || {}
  return <div className="storefront min-h-screen w-full max-w-none bg-white text-slate-800" style={{
    '--brand-color': business.primaryColor || business.accentColor || '#f45b15',
    '--price-color': themeColors.priceColor || '#ad3b18',
    '--header-background': themeColors.headerBackground || '#ffffff',
    '--header-text': themeColors.headerText || '#172744',
    '--search-background': themeColors.searchBackground || '#f8f9fb',
    '--search-button': themeColors.searchButton || business.primaryColor || '#304ca3',
    '--button-background': themeColors.buttonBackground || business.primaryColor || '#304ca3',
    '--button-text': themeColors.buttonText || '#ffffff',
    '--button-hover-background': themeColors.buttonHoverBackground || '#f4510b',
    '--button-hover-text': themeColors.buttonHoverText || '#ffffff',
    '--footer-background': themeColors.footerBackground || '#10223b',
    '--footer-text': themeColors.footerText || '#ffffff',
    '--page-background': themeColors.pageBackground || '#ffffff',
    '--surface-background': themeColors.surfaceBackground || '#ffffff',
    '--product-card-background': themeColors.productCardBackground || themeColors.surfaceBackground || '#ffffff',
    '--product-card-mobile-background': themeColors.productCardMobileBackground || themeColors.productCardBackground || themeColors.surfaceBackground || '#ffffff',
    '--product-card-text': themeColors.productCardText || '#1f2937',
    '--product-card-hover-background': themeColors.productCardHoverBackground || '#fff7ed',
    '--product-card-hover-text': themeColors.productCardHoverText || '#172744',
    '--product-card-hover-border': themeColors.productCardHoverBorder || '#f2c9ad',
    '--product-card-save-color': themeColors.productCardSaveColor || '#dc2626',
  }}>
    <StoreHeader
      business={business} customer={customer} category={category} categories={categories} query={query}
      setCategory={setCategory} setQuery={setQuery} searchProducts={products} onSelectProduct={openProduct} location={location}
      onOpenLocation={() => setLocationOpen(true)}
      onOpenOrders={() => navigatePage('orders')} onOpenProfile={() => navigatePage('profile')}
      onOpenCart={() => navigatePage('cart')} onOpenWishlist={() => navigatePage('wishlist')}
      count={count} favoriteCount={favorites.length}
      onSearch={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}
      showLogo={showLogo} showSearch={showSearch} showLocation={false}
      showProfile={showProfile} showCart={showCartButton} showFavorites={showFavorites}
    />
    <StoreNavigation {...{ modules, category, selectedModule, activeModule, setSelectedModule, setCategory, setSubCategory, setChildCategory }} onHome={goHome} onSelectModule={goToModule} visible={showNavigation} />

    {(currentPage === 'home' || currentPage === 'product') && <main id="top" className="mx-auto w-full max-w-[1800px] px-3 sm:px-6 lg:px-[100px]">
      {isProductRoute
        ? selected
          ? <ProductDetailPage product={selected} relatedProducts={relatedProducts} business={business} onClose={closeProduct} productCardProps={productSectionProps} />
          : <section className="px-5 py-24 text-center text-slate-600">{loading ? 'Loading product…' : <>Product nahi mila. <a className="mobile-back-button font-semibold text-orange-600" href={`/${window.location.search}`}>Back to store</a></>}</section>
        : <>
          <HeroSection banners={heroBanners} deals={deals} visible={showHero && !selectedModule} />
          {selectedModule && <PromotionBanners banners={categoryPromotions} />}
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
          {showDeals && !selectedModule && <FlashDealsSection {...productSectionProps} sales={home?.flashSales} products={products} />}
<<<<<<< HEAD
=======
          {!selectedModule && <PromotionBanners banners={homeMidBanners} />}
>>>>>>> 60ab641a6dd29e4a6267f01dc5119f9bf84e318f
          {showCategoryRecommendations && <CategoryRecommendationsSection
            {...productSectionProps} products={recommendationProducts} categoryLabel={recommendationScope}
            moduleSlug={selectedModule} interactions={productInteractions}
          />}
          {mainAdminWebsite
            ? selectedModule
              ? <ProductGridSection {...productSectionProps} products={shown} prefix="catalog" />
              : <>
                <TrendingProductsSection {...productSectionProps} products={bestsellers} city={home?.city} />
                <PromotionBanners banners={homeMidBanners} />
                {moduleSections.map(section => (
                  <section key={section.slug || section._id || section.name} className="pt-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-xl font-bold text-slate-900">{section.name}</h2>
                    </div>
                    <ProductGridSection {...productSectionProps} products={section.products} prefix={`catalog-${section.slug || section._id || section.name}`} />
                  </section>
                ))}
                <PromotionBanners banners={storefrontBanners} />
              </>
            : (showProductGrid || selectedModule) && <>
<<<<<<< HEAD
              {!selectedModule && <PromotionBanners banners={homeMidBanners} />}
=======
>>>>>>> 60ab641a6dd29e4a6267f01dc5119f9bf84e318f
              <ProductGridSection {...productSectionProps} products={shown} prefix="catalog" />
              {!selectedModule && <PromotionBanners banners={storefrontBanners} />}
            </>}
        </>}
    </main>}
    {(currentPage === 'cart' || currentPage === 'checkout') && <CartPage
      cart={cart} products={products} count={count} subtotal={subtotal} business={business} changeQty={changeQty} clearCart={clearCart}
      checkout={checkout} address={address} phone={phone} location={location} serviceArea={serviceArea}
      setLocationOpen={setLocationOpen} setAddressOpen={setAddressOpen} startCheckout={startCheckout}
      busy={busy} placeOrder={placeOrder} quote={quote}
      couponCode={couponCode} applyCoupon={applyCoupon} removeCoupon={removeCoupon}
      paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
      onCart={() => { setCheckout(false); navigatePage('cart') }}
      onShop={() => navigatePage('home')}
    />}
    {currentPage === 'wishlist' && <WishlistPage products={wishlistProducts} favorites={favorites} loading={favoriteCatalogLoading} productProps={productSectionProps} onShop={() => navigatePage('home')} />}
    {currentPage === 'profile' && <ProfilePage
      customer={customer} onLogin={() => { setAuthMode('login'); setAuthOpen(true) }}
      onSignOut={signOut} onOrders={() => navigatePage('orders')}
    />}
    {currentPage === 'orders' && <OrdersPage
      customer={customer} business={business} onLogin={() => { setAuthMode('login'); setAuthOpen(true) }}
    />}
    {currentPage === 'support' && <SupportPage business={business} />}

    <MobileAppNav
      activePage={currentPage} selectedModule={selectedModule} modules={modules} cartCount={count}
      onHome={goHome} onCategories={browseCategories}
      onSelectModule={slug => { goToModule(slug); window.setTimeout(() => document.getElementById('category-browser')?.scrollIntoView({ behavior: 'smooth' }), 50) }}
      onCart={() => navigatePage('cart')} onProfile={() => navigatePage('profile')}
      showCategories={showCategories && modules.length > 0}
      showCart={showCartButton} showProfile={showProfile}
    />
    <StoreFooter business={business} visible={showFooter} onOpenSupport={() => navigatePage('support')} />
    <Toast message={message} clear={() => setMessage('')} />
    <CookieNotice business={business} enabled={selectedComponentData.length > 0} accepted={cookieAccepted} accept={() => setCookieAccepted(true)} />

    <LocationModal open={locationOpen} onClose={() => setLocationOpen(false)} location={location} setLocation={setLocation} setMessage={setMessage} checkServiceArea={checkServiceArea} />
    <CustomerAuthModal open={authOpen} onClose={closeAuth} mode={authMode} setMode={setAuthMode} submitAuth={submitAuth} busy={busy} />
    <DeliveryAddressModal open={addressOpen} onClose={() => setAddressOpen(false)} address={address} addressDetails={addressDetails} customerName={customer?.name} phone={phone} location={location} checkServiceArea={checkServiceArea} onDetectLocation={saveDetectedLocation} onSave={saveDeliveryAddress} />
  </div>
}
