import { useMemo } from 'react'
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
const uniqueBanners = banners => [...new Map(banners.filter(banner => banner && banner.active !== false && banner.isActive !== false && banner.status !== 'inactive').map((banner, index) => [banner.id || banner._id || `${banner.title || 'banner'}-${index}`, banner])).values()]

export default function StorefrontPage() {
  const store = useStorefront()
  const {
    home, products, loading, error, shopperStateError, load, business, selectedComponentData, customer,
    category, setCategory, subCategory, setSubCategory, childCategory, setChildCategory,
    selectedModule, setSelectedModule, query, setQuery,
    cart, clearCart, favorites, favoriteCatalog, favoriteCatalogLoading, recentlyViewed, selected, openProduct, closeProduct, goHome, goToModule,
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
  const showDefaultStorefront = mainAdminWebsite || selectedComponentData.length === 0
  const hasComponent = (...slugs) => selectedComponentData.some(component => slugs.includes(String(component.slug || '').toLowerCase()))
  const hasComponentType = (...types) => selectedComponentData.some(component => types.includes(String(component.type || '').toLowerCase().replace(/-/g, '_')))
  const componentEnabled = (slugs, types = []) => hasComponent(...slugs) || (types.length > 0 && hasComponentType(...types))

  const showLogo = showDefaultStorefront || Boolean(business.businessLogo) || componentEnabled(['logo', 'quick-commerce-header'], ['header', 'logo'])
  const showSearch = showDefaultStorefront || hasComponent('quick-commerce-search') || hasComponentType('search')
  const showProfile = showDefaultStorefront || hasComponent('quick-commerce-profile', 'quick-commerce-account') || hasComponentType('profile', 'account')
  const showCartButton = showDefaultStorefront || hasComponent('quick-commerce-cart', 'quick-commerce-cart-page', 'quick-commerce-checkout') || hasComponentType('cart', 'cart_page', 'checkout')
  const showFavorites = showDefaultStorefront || hasComponent('quick-commerce-favorites') || hasComponentType('favorites')
  const showNavigation = showDefaultStorefront || componentEnabled(['quick-commerce-categories'], ['navbar', 'categories'])
  const showHero = showDefaultStorefront || componentEnabled(['quick-commerce-offer-banner'], ['hero', 'banner'])
  const showCategories = showDefaultStorefront || hasComponent('quick-commerce-category-tiles') || hasComponentType('category_tiles')
  const showDeals = showDefaultStorefront || hasComponent('quick-commerce-flash-deals') || hasComponentType('flash_deals')
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
    canOpenDetails: showProductDetails, setSelected: openProduct,
  }
  const recommendationScope = [category, subCategory, childCategory].filter(Boolean).join(' / ')
  const showCategoryRecommendations = currentPage === 'home'
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
    const sectionModules = modules
      .filter(module => !selectedModule || String(module.slug || '').toLowerCase() === String(selectedModule).toLowerCase())
      .map(module => {
        const slug = String(module.slug || '').trim().toLowerCase();
        const productsForModule = shown.filter(product => {
          const productModule = String(product.moduleSlug || product.module || '').trim().toLowerCase();
          const productModuleId = String(product.moduleId || '').trim();
          const moduleId = String(module._id || '').trim();
          const matchesSlug = Boolean(slug && (productModule === slug || productModule === String(module.name || '').trim().toLowerCase().replace(/\s+/g, '-')));
          const matchesId = Boolean(moduleId && productModuleId === moduleId);
          return matchesSlug || matchesId;
        })
        return { ...module, products: productsForModule }
      })
      .filter(section => section.products.length > 0)
    return sectionModules
  }, [modules, selectedModule, shown])
  const recommendationProducts = selectedModule ? shown : products
  const recommendationProductsById = new Map(recommendationProducts.map(product => [String(product._id || product.id || ''), product]))
  const recommendationRecentlyViewed = recentlyViewed
    .map(item => recommendationProductsById.get(String(item.productId || '')))
    .filter(Boolean)
  const popularProducts = bestsellers.filter(product => recommendationProductsById.has(String(product._id || product.id || '')))
  const popularSections = selectedModule ? [] : modules.map(module => ({
    ...module,
    products: (home?.popularByModule?.[module.slug] || [])
      .map(product => recommendationProductsById.get(String(product._id || product.id || '')))
      .filter(Boolean),
  })).filter(section => section.products.length > 0)
  const recentlyViewedIds = new Set(recommendationRecentlyViewed.map(product => String(product._id || product.id || '')))
  const favoriteIds = new Set(favorites.map(String))
  const purchasedIds = new Set((home?.customerInsights?.purchasedProductIds || []).map(String))
  const normalizePath = value => String(value || '').trim().toLowerCase().split('/').map(part => part.trim()).filter(Boolean)
  const productPath = product => normalizePath([product.mainCategory || product.category, product.subCategory, product.childCategory].filter(Boolean).join('/'))
  const customerPaths = [
    ...(home?.customerInsights?.categoryPaths || []).map(normalizePath),
    ...recommendationRecentlyViewed.map(productPath),
    ...products.filter(product => favoriteIds.has(String(product._id || product.id))).map(productPath),
  ].filter(path => path.length)
  const customerModules = new Set([
    ...(home?.customerInsights?.moduleSlugs || []),
    ...recommendationRecentlyViewed.map(product => product.moduleSlug),
    ...products.filter(product => favoriteIds.has(String(product._id || product.id))).map(product => product.moduleSlug),
  ].map(value => String(value || '').trim().toLowerCase()).filter(Boolean))
  const recommendationCandidates = recommendationProducts.filter(product => {
    const id = String(product._id || product.id || '')
    return id && !recentlyViewedIds.has(id) && !favoriteIds.has(id) && !purchasedIds.has(id)
  })
  const recommendationScore = product => {
    const path = productPath(product)
    const moduleSlug = String(product.moduleSlug || '').trim().toLowerCase()
    const affinity = customerPaths.reduce((total, previousPath) => {
      const matchingSegments = previousPath.findIndex((segment, index) => path[index] !== segment)
      return total + (matchingSegments === -1 ? Math.min(path.length, previousPath.length) : matchingSegments)
    }, 0)
    return affinity * 4
      + (customerModules.has(moduleSlug) ? 3 : 0)
      + Math.log1p(Number(product.unitsSold || 0))
      + Math.log1p(Number(product.orderCount || 0))
      + Number(product.rating || 0) * 0.2
      + Math.log1p(Number(product.reviewCount || 0)) * 0.2
  }
  const recommendedProducts = [...recommendationCandidates]
    .sort((a, b) => recommendationScore(b) - recommendationScore(a))
    .slice(0, 6)
  const recommendationModuleLabel = modules.find(module => String(module.slug || '').toLowerCase() === String(selectedModule || '').toLowerCase())?.name || ''
  const moduleCategorySections = useMemo(() => {
    const categories = new Map()
    shown.forEach(product => {
      const mainName = String(product.mainCategory || product.category || 'Uncategorized').trim()
      const subName = String(product.subCategory || '').trim()
      const childName = String(product.childCategory || '').trim()
      if (!categories.has(mainName)) categories.set(mainName, { name: mainName, products: [], subcategories: new Map() })
      const main = categories.get(mainName)
      if (!subName) { main.products.push(product); return }
      if (!main.subcategories.has(subName)) main.subcategories.set(subName, { name: subName, products: [], children: new Map() })
      const sub = main.subcategories.get(subName)
      if (!childName) { sub.products.push(product); return }
      if (!sub.children.has(childName)) sub.children.set(childName, { name: childName, products: [] })
      sub.children.get(childName).products.push(product)
    })
    return [...categories.values()].map(main => ({
      ...main,
      subcategories: [...main.subcategories.values()].map(sub => ({ ...sub, children: [...sub.children.values()] })),
    }))
  }, [shown])
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
  ])

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
    ...Object.entries({
      header: ['.header', '#e2e8f0'],
      product: ['.product-card, .deal-card, .best-card', '#e2e8f0'],
      category: ['.category-tile', '#e2e8f0'],
      promo: ['.promo, .promotion-banner', '#e2e8f0'],
      account: ['.cart-page-card, .profile-card, .support-card, .order-card', '#e2e8f0'],
      cart: ['.cart-page-card, .cart-line', '#e2e8f0'],
      profile: ['.profile-card', '#e2e8f0'],
      order: ['.order-card', '#e2e8f0'],
      support: ['.support-card', '#e2e8f0'],
      button: ['.button, .add-button, .product-image-add, .best-card-bottom button, .button-orange', '#e2e8f0'],
    }).reduce((vars, [type]) => {
      const style = themeColors.storefrontCardStyles?.[type] || {}
      vars[`--storefront-${type}-background`] = style.backgroundColor || (type === 'header' ? themeColors.headerBackground : type === 'product' ? themeColors.productCardBackground : type === 'button' ? themeColors.buttonBackground : themeColors.surfaceBackground) || '#ffffff'
      if (type === 'button') vars['--storefront-button-text-color'] = style.textColor || themeColors.buttonText || '#ffffff'
      vars[`--storefront-${type}-border-color`] = style.borderColor || '#e2e8f0'
      vars[`--storefront-${type}-border-width`] = `${Math.max(0, Math.min(8, Number(style.borderWidth ?? 1)))}px`
      vars[`--storefront-${type}-border-radius`] = `${Math.max(0, Math.min(40, Number(style.borderRadius ?? 12)))}px`
      return vars
    }, {}),
    '--product-card-hover-background': themeColors.productCardHoverBackground || '#fff7ed',
    '--product-card-hover-text': themeColors.productCardHoverText || '#172744',
    '--product-card-hover-border': themeColors.productCardHoverBorder || '#f2c9ad',
    '--product-card-save-color': themeColors.productCardSaveColor || '#dc2626',
  }}>
    {shopperStateError && <p role="status" className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-800">{shopperStateError}</p>}
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
            categories={subCategory ? childCategories : category ? subCategories : categories}
            categoryProduct={categoryProduct}
            selectedCategory={childCategory || subCategory || category}
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
          {!selectedModule && <PromotionBanners banners={homeMidBanners} />}
          {showCategoryRecommendations && <CategoryRecommendationsSection
            {...productSectionProps}
            popularProducts={popularProducts}
            popularSections={popularSections}
            recommendedProducts={recommendedProducts}
            recentlyViewedProducts={recommendationRecentlyViewed}
            categoryLabel={recommendationScope}
            moduleLabel={recommendationModuleLabel}
          />}
          {selectedModule
            ? <section id="collection" className="product-section">
              {moduleCategorySections.map(main => <section key={main.name} className="pt-5">
              <h2 className="mb-3 text-xl font-bold text-slate-900">{main.name}</h2>
              {main.products.length > 0 && <ProductGridSection {...productSectionProps} products={main.products} prefix={`catalog-${selectedModule}-${main.name}`} sectionId={false} />}
              {main.subcategories.map(sub => <section key={`${main.name}-${sub.name}`} className="pt-4">
                <h3 className="mb-3 text-lg font-semibold text-slate-800">{sub.name}</h3>
                {sub.products.length > 0 && <ProductGridSection {...productSectionProps} products={sub.products} prefix={`catalog-${selectedModule}-${main.name}-${sub.name}`} sectionId={false} />}
                {sub.children.map(child => <section key={`${main.name}-${sub.name}-${child.name}`} className="pt-3">
                  <h4 className="mb-3 text-base font-medium text-slate-700">{child.name}</h4>
                  <ProductGridSection {...productSectionProps} products={child.products} prefix={`catalog-${selectedModule}-${main.name}-${sub.name}-${child.name}`} sectionId={false} />
                </section>)}
              </section>)}
            </section>)}
            </section>
            : <>
              <section id="collection" className="product-section">
                {moduleSections.map(section => <section key={section.slug || section._id || section.name} className="pt-5">
                <h2 className="mb-3 text-xl font-bold text-slate-900">{section.name}</h2>
                <ProductGridSection {...productSectionProps} products={section.products} prefix={`catalog-${section.slug || section._id || section.name}`} sectionId={false} />
                </section>)}
              </section>
              <PromotionBanners banners={storefrontBanners} />
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
