import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeftRight, Building2, ClipboardList, Headphones, Heart, ImagePlus, MapPin, Monitor, RotateCcw, Save, Search, ShoppingCart, Smartphone, Truck, Upload, UserRound } from 'lucide-react';
import api from '../../api/axios';
import { listBtnNavy, listBtnOutline, LIST_CARD_BORDER } from '../../constants/listTheme';
import { getAdminModuleKey } from '../../constants/adminModules';
import { useAuthStore, useModuleStore } from '../../store/useStore';
import { numericInputValue } from '../../utils/numericInput';
import { assignedWebsiteDomainUrl } from '../../utils/ecommercePreviewUrl';

const DEFAULT_FORM = {
  platformName: '',
  businessName: '',
  businessEmail: '',
  businessPhone: '',
  country: 'India',
  businessAddress: '',
  businessLat: 21.1458,
  businessLng: 79.0882,
  businessLogo: '',
  favicon: '',
  primaryColor: '#f45b15',
  themeColors: {
    priceColor: '#e94a0b',
    headerBackground: '#ffffff',
    headerText: '#172744',
    headerIconColor: '#172744',
    headerHoverBackground: '#f1f5f9',
    headerHoverText: '#172744',
    headerCategoryHoverBackground: '#f1f5f9',
    deliveryTimeText: '#dc2626',
    deliveryTimeIcon: '#dc2626',
    cartCountBackground: '#304ca3',
    favoritesCountBackground: '#f43f5e',
    searchBackground: '#f8f9fb',
    searchButton: '#304ca3',
    buttonBackground: '#304ca3',
    buttonText: '#ffffff',
    footerBackground: '#10223b',
    footerText: '#ffffff',
    pageBackground: '#ffffff',
    surfaceBackground: '#ffffff',
    productCardBackground: '#ffffff',
    productCardMobileBackground: '#ffffff',
    productCardText: '#1f2937',
    storefrontCardStyles: {
      header: { borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 12 },
      product: { borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 12 },
      category: { borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 12 },
      promo: { borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 12 },
      account: { borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 12 },
      cart: { borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 12 },
      profile: { borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 12 },
      order: { borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 12 },
      support: { borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 12 },
      button: { borderColor: '#e2e8f0', borderWidth: 0, borderRadius: 6 },
    },
    productCardSaveColor: '#dc2626',
    productCartButtonStyle: 'image',
    productImageButtonLabel: 'add',
    productCardHoverBackground: '#fff7ed',
    productCardHoverText: '#172744',
    productCardHoverBorder: '#f2c9ad',
    buttonHoverBackground: '#f4510b',
    buttonHoverText: '#ffffff',
  },
  maintenanceMode: false,
  timezone: 'Asia/Kolkata',
  timeFormat: '12',
  currency: 'INR',
  currencySymbol: '₹',
  currencyPosition: 'left',
  decimalDigits: 0,
  subscriptionEnabled: false,
  commissionEnabled: true,
  defaultCommission: 2.5,
  deliveryCommission: 7,
  additionalChargeEnabled: false,
  additionalChargeName: '',
  additionalChargeAmount: 0,
  countryPickerEnabled: true,
  copyrightText: '',
  cookiesText: '',
};

const PREVIEW_PRODUCTS = [
  { name: 'Everyday Cotton Kurta', price: '₹764', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=400&fit=contain&bg=ffffff&fm=png' },
  { name: 'Classic Pathani Kurta', price: '₹1,079', image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&h=400&fit=contain&bg=ffffff&fm=png' },
  { name: 'Printed Anarkali Kurta', price: '₹1,199', image: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=400&h=400&fit=contain&bg=ffffff&fm=png' },
  { name: 'JBL Wireless Headphones', price: '₹2,787', image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e8?w=400&h=400&fit=contain&bg=ffffff&fm=png' },
  { name: "Campus Men's Running Shoes", price: '₹1,199', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=contain&bg=ffffff&fm=png' },
];
const QUICK_COMMERCE_PREVIEW_PRODUCTS = [
  { name: 'Fresh Farm Tomatoes', price: '₹38', image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&h=400&fit=contain&bg=ffffff&fm=png' },
  { name: 'Daily Fresh Milk', price: '₹32', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=contain&bg=ffffff&fm=png' },
  { name: 'Premium Cooking Oil', price: '₹169', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=contain&bg=ffffff&fm=png' },
  { name: 'Whole Wheat Atta', price: '₹245', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=contain&bg=ffffff&fm=png' },
  { name: 'Fresh Bananas', price: '₹56', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=contain&bg=ffffff&fm=png' },
];

const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const labelClass = 'block text-xs font-semibold text-slate-600';
const pinIcon = L.divIcon({ className: '', html: '<span style="display:block;width:20px;height:20px;background:#2450b2;border:3px solid white;border-radius:50%;box-shadow:0 1px 6px #0006"></span>', iconSize: [20, 20], iconAnchor: [10, 10] });

function Section({ title, description, children, overflowVisible = false, className = '' }) {
  return <section className={`${overflowVisible ? 'overflow-visible' : 'overflow-hidden'} ${className} rounded-xl border bg-white shadow-sm`} style={{ borderColor: LIST_CARD_BORDER }}>
    <div className="border-b bg-slate-50 px-5 py-4" style={{ borderColor: LIST_CARD_BORDER }}><h2 className="font-semibold text-slate-800">{title}</h2>{description && <p className="mt-1 text-xs text-slate-500">{description}</p>}</div>
    <div className="space-y-5 p-5">{children}</div>
  </section>;
}

function MapClick({ onPick }) {
  useMapEvents({ click: event => onPick(event.latlng.lat, event.latlng.lng) });
  return null;
}

function LiveWebsitePreview({ src, moduleName, viewMode, refreshKey, theme, loading = false, error = '' }) {
  const iframeRef = useRef(null);
  const viewportRef = useRef(null);
  const [scale, setScale] = useState(1);
  const viewport = viewMode === 'mobile' ? { width: 390, height: 844 } : { width: 1366, height: 768 };
  const sendTheme = () => {
    if (!src || !iframeRef.current?.contentWindow) return;
    try {
      const targetOrigin = new URL(src, window.location.href).origin;
      iframeRef.current.contentWindow.postMessage({ type: 'wepzo:builder-preview', theme }, targetOrigin);
    } catch { /* Ignore invalid preview URLs. */ }
  };
  useEffect(() => { sendTheme(); }, [src, theme]);
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return undefined;
    const resize = () => {
      const widthScale = container.clientWidth / viewport.width;
      const narrowScreen = window.matchMedia('(max-width: 767px)').matches;
      if (narrowScreen && viewMode === 'desktop') {
        setScale(Math.min(1, widthScale));
        return;
      }
      const heightScale = narrowScreen && viewMode === 'mobile'
        ? Math.min(150, window.innerHeight * 0.22) / viewport.height
        : viewMode === 'mobile' ? (window.innerHeight * 0.58) / viewport.height : 1;
      setScale(Math.min(1, widthScale, heightScale));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [viewMode, viewport.width]);
  if (loading) return <div className="grid min-h-[190px] place-items-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">Loading {moduleName || 'storefront'} preview...</div>;
  if (error || !src) return <div role={error ? 'alert' : undefined} className="grid min-h-[190px] place-items-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">{error || `This account does not have a tenant website ID for ${moduleName || 'the selected module'}.`}</div>;
  return <div className="rounded-xl bg-slate-100 p-2 sm:p-3">
    <div ref={viewportRef} className="flex w-full justify-center overflow-hidden">
      <div className="shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-lg" style={{ width: viewport.width * scale, height: viewport.height * scale }}>
        <iframe ref={iframeRef} key={`${src}-${refreshKey}`} src={src} onLoad={sendTheme} title={`${moduleName || 'Website'} ${viewMode} preview (${viewport.width} × ${viewport.height})`} className="block bg-white" style={{ width: viewport.width, height: viewport.height, maxWidth: 'none', transform: `scale(${scale})`, transformOrigin: 'top left' }} />
      </div>
    </div>
  </div>;
}

function Switch({ label, checked, onChange, description }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
    <span><span className="block text-sm font-medium text-slate-800">{label}</span>{description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}</span>
    <input type="checkbox" checked={!!checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4 shrink-0 accent-blue-700" />
  </label>;
}

function MarketingWebsitePreview({ form, viewMode = 'desktop' }) {
  const colors = { ...DEFAULT_FORM.themeColors, ...(form.themeColors || {}) };
  const logo = form.businessLogo || form.logo || '';
  const siteName = form.businessName || form.platformName || 'Your Business';
  const primary = form.primaryColor || '#f45b15';
  const isMobile = viewMode === 'mobile';

  return <div className="rounded-lg bg-slate-100 px-2 py-4 sm:px-3">
    <div className={`mx-auto w-full ${isMobile ? 'max-w-[350px]' : 'max-w-[1100px]'}`}>
      <div className={`${isMobile ? 'rounded-[24px] border-[5px]' : 'rounded-xl border-[7px]'} overflow-hidden border-slate-800 bg-white shadow-xl`}>
        <div className="flex h-6 items-center gap-1.5 bg-slate-900 px-3">
          <i className="h-1.5 w-1.5 rounded-full bg-slate-500" /><i className="h-1.5 w-1.5 rounded-full bg-slate-600" /><i className="h-1.5 w-1.5 rounded-full bg-slate-600" />
          {!isMobile && <span className="ml-3 flex h-3.5 flex-1 items-center rounded-sm bg-slate-800 px-2 text-[7px] text-slate-500">{siteName.toLowerCase().replace(/\s+/g, '')}.com</span>}
        </div>
        <header className={`flex items-center justify-between gap-2 px-3 ${isMobile ? 'h-12' : 'h-14 px-5'}`} style={{ backgroundColor: colors.headerBackground, color: colors.headerText }}>
          <div className="flex min-w-0 items-center gap-2">
            {logo ? <img src={logo} alt="" className={`${isMobile ? 'h-7 w-7' : 'h-8 w-8'} shrink-0 rounded-lg object-contain`} /> : <span className={`${isMobile ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-sm'} grid shrink-0 place-items-center rounded-lg font-bold text-white`} style={{ backgroundColor: primary }}>{siteName.slice(0, 1).toUpperCase()}</span>}
            <strong className={`${isMobile ? 'text-[9px]' : 'text-[11px]'} truncate`}>{siteName}</strong>
          </div>
          {!isMobile && <nav className="flex items-center gap-5 text-[9px] text-slate-600"><span style={{ color: primary }}>Home</span><span>Services</span><span>About</span><span>Contact</span></nav>}
          <span className={`${isMobile ? 'px-2 py-1 text-[7px]' : 'px-3 py-2 text-[8px]'} shrink-0 rounded-md font-semibold`} style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}>Get started</span>
        </header>
        <main style={{ backgroundColor: colors.pageBackground }}>
          <section className={`grid items-center gap-3 ${isMobile ? 'min-h-[235px] grid-cols-1 px-4 py-6' : 'min-h-[220px] grid-cols-[1.2fr_0.8fr] px-8 py-7'}`}>
            <div>
              <span className="text-[7px] font-bold uppercase tracking-[0.18em]" style={{ color: primary }}>Grow your business online</span>
              <h2 className={`${isMobile ? 'mt-2 text-lg' : 'mt-2 text-2xl'} max-w-md font-bold leading-tight text-slate-900`}>Marketing that moves your business forward.</h2>
              <p className={`${isMobile ? 'mt-2 text-[8px]' : 'mt-2 text-[9px]'} max-w-sm leading-relaxed text-slate-500`}>Build your brand, reach the right audience, and turn every campaign into measurable growth.</p>
              <div className="mt-3 flex items-center gap-2"><span className={`${isMobile ? 'px-2 py-1.5 text-[7px]' : 'px-3 py-2 text-[8px]'} rounded-md font-semibold`} style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}>Explore services</span><span className="text-[8px] font-semibold" style={{ color: primary }}>See how it works →</span></div>
            </div>
            <div className={`${isMobile ? 'hidden' : 'grid'} h-[145px] grid-cols-2 gap-2 rounded-xl p-3`} style={{ backgroundColor: colors.surfaceBackground }}>
              <div className="col-span-2 flex items-center justify-between"><span className="text-[8px] font-semibold text-slate-600">Campaign overview</span><span className="rounded-full px-2 py-1 text-[7px]" style={{ color: primary, backgroundColor: `${primary}15` }}>Live growth</span></div>
              <div className="rounded-lg bg-white p-2"><span className="block text-[7px] text-slate-400">Audience reached</span><strong className="mt-1 block text-sm text-slate-800">24.8K</strong><span className="text-[7px] font-semibold" style={{ color: primary }}>↗ 18.6%</span></div>
              <div className="flex items-end gap-1 rounded-lg bg-white px-3 pb-2 pt-4">{[30, 48, 38, 66, 52, 82, 70, 96].map((height, index) => <span key={index} className="flex-1 rounded-t-sm" style={{ height: `${height}%`, backgroundColor: primary, opacity: 0.35 + index * 0.08 }} />)}</div>
            </div>
          </section>
          <section className={`${isMobile ? 'px-3 pb-4' : 'px-8 pb-5'}`}>
            <div className="mb-2 flex items-end justify-between"><div><span className="text-[6px] font-bold uppercase tracking-wider" style={{ color: primary }}>What we do</span><h3 className={`${isMobile ? 'text-[10px]' : 'text-xs'} mt-0.5 font-bold text-slate-800`}>Everything you need to grow</h3></div><span className="text-[7px] text-slate-500">Our services →</span></div>
            <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
              {['Social media campaigns', 'Content & creative', 'Growth analytics'].slice(0, isMobile ? 2 : 3).map((title, index) => <article key={title} className="rounded-lg border border-slate-200 p-2" style={{ backgroundColor: colors.surfaceBackground }}><span className="grid h-5 w-5 place-items-center rounded-md text-[8px] font-bold" style={{ backgroundColor: `${primary}18`, color: primary }}>{['↗', '✦', '◫'][index]}</span><strong className="mt-1 block text-[7px] text-slate-800">{title}</strong><p className="mt-0.5 text-[6px] leading-relaxed text-slate-500">Thoughtful strategy, creative ideas, and results you can measure.</p></article>)}
            </div>
          </section>
        </main>
        <footer className="flex h-6 items-center justify-center text-[7px]" style={{ backgroundColor: colors.footerBackground, color: colors.footerText }}>{form.copyrightText || siteName}</footer>
      </div>
    </div>
    {!isMobile && <><div className="mx-auto h-7 w-16 bg-gradient-to-b from-slate-500 to-slate-300" /><div className="mx-auto h-2.5 w-1/3 rounded-b-lg bg-slate-400 shadow-md" /></>}
  </div>;
}

function LaptopStorefrontPreview({ form, moduleName, moduleKey, viewMode = 'desktop' }) {
  const [hoveredHeaderAction, setHoveredHeaderAction] = useState('');
  const [hoveredPreviewProduct, setHoveredPreviewProduct] = useState('');
  const [hoveredPreviewButton, setHoveredPreviewButton] = useState(false);
  if (moduleKey === 'marketing') return <MarketingWebsitePreview form={form} viewMode={viewMode} />;
  if (moduleKey === 'information-web') return <WebPageThemePreview form={form} viewMode={viewMode} />;
  const colors = { ...DEFAULT_FORM.themeColors, ...(form.themeColors || {}) };
  const productBorder = { ...DEFAULT_FORM.themeColors.storefrontCardStyles.product, ...(colors.storefrontCardStyles?.product || {}) };
  const cartButtonStyle = colors.productCartButtonStyle === 'bottom' ? 'bottom' : 'image';
  const imageButtonLabel = colors.productImageButtonLabel === 'plus' ? '+' : 'Add';
  const logo = form.businessLogo || form.logo || '';
  const storeName = form.businessName || form.platformName || 'Your Store';
  const isQuickCommerce = moduleKey === 'quick-commerce';
  const previewProducts = isQuickCommerce ? QUICK_COMMERCE_PREVIEW_PRODUCTS : PREVIEW_PRODUCTS;
  const heroTitle = isQuickCommerce ? 'Fresh groceries, delivered fast' : 'Find your next favorite';
  const heroSubtitle = isQuickCommerce ? 'Everyday essentials from stores near you' : 'Fresh picks for you';
  const productSectionTitle = isQuickCommerce ? 'Popular near you' : 'Popular picks';
  const actions = [
    [Headphones, 'Support'], [ClipboardList, 'Orders'], [Heart, 'Wishlist'],
    [ShoppingCart, 'Cart'], [UserRound, 'Account'],
  ];

  if (viewMode === 'mobile') return <div className="rounded-lg bg-slate-100 px-4 py-5">
    <div className="mx-auto h-[520px] w-full max-w-[350px] overflow-hidden rounded-[26px] border-[5px] border-slate-900 bg-white shadow-xl">
      <div className="flex h-5 items-center justify-center bg-slate-900"><span className="h-1 w-12 rounded-full bg-slate-600" /></div>
      <div className="flex h-11 items-center gap-2 px-2" style={{ backgroundColor: colors.headerBackground, color: colors.headerText }}>
        {logo ? <img src={logo} alt={storeName} className="h-7 w-7 shrink-0 rounded-full object-contain" /> : <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold" style={{ backgroundColor: form.primaryColor || '#f45b15', color: colors.buttonText }}>{storeName.slice(0, 1).toUpperCase()}</span>}
        <div className="min-w-0 flex-1 leading-tight"><strong className="block truncate text-[9px]">{storeName}</strong>{isQuickCommerce && <span className="flex items-center gap-0.5 text-[7px]" style={{ color: colors.deliveryTimeText }}><Truck size={8} style={{ color: colors.deliveryTimeIcon }} />Delivery in 15 mins</span>}<span className="inline-flex items-center gap-0.5 text-[7px]"><MapPin size={8} style={{ color: colors.headerIconColor || colors.headerText }} />440001</span></div>
        <div className="flex shrink-0 items-center gap-2" style={{ color: colors.headerIconColor || colors.headerText }}>{actions.map(([Icon, label]) => <span key={label} title={label} className="relative rounded px-1" onMouseEnter={() => setHoveredHeaderAction(label)} onMouseLeave={() => setHoveredHeaderAction('')} style={hoveredHeaderAction === label ? { backgroundColor: colors.headerHoverBackground, color: colors.headerHoverText } : undefined}><Icon size={13} />{isQuickCommerce && (label === 'Cart' || label === 'Wishlist') && <b className="absolute -right-1.5 -top-1 grid h-3 min-w-3 place-items-center rounded-full px-0.5 text-[6px] leading-none text-white" style={{ backgroundColor: label === 'Cart' ? colors.cartCountBackground || colors.buttonBackground : colors.favoritesCountBackground }}>2</b>}</span>)}</div>
      </div>
      <div className="px-2 py-1.5" style={{ backgroundColor: colors.headerBackground }}><div className="flex h-8 overflow-hidden rounded-md border border-slate-200" style={{ backgroundColor: colors.searchBackground }}><span className="flex min-w-0 flex-1 items-center px-2 text-[9px] text-slate-500">Search products, brands and more...</span><span className="grid w-8 shrink-0 place-items-center" style={{ backgroundColor: colors.searchButton, color: colors.buttonText }}><Search size={13} /></span></div></div>
      <nav className="flex h-8 items-stretch gap-5 border-y border-slate-200 px-3 text-[9px]" style={{ backgroundColor: colors.headerBackground, color: colors.headerText }}><span className="flex items-center border-b-2 font-semibold" style={{ borderColor: form.primaryColor || '#f45b15', color: form.primaryColor || '#f45b15' }}>Home</span><span className="flex items-center">{moduleName || 'Module'}</span></nav>
      <div className="h-[330px] overflow-hidden p-3" style={{ backgroundColor: colors.pageBackground }}>
        <div className="mb-3 flex min-h-[68px] items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: colors.surfaceBackground }}><div><strong className="block text-[11px] leading-tight text-slate-900">{heroTitle}</strong><span className="mt-1 block text-[8px] text-slate-500">{heroSubtitle}</span></div><span className="inline-flex rounded px-2 py-1.5 text-[8px] font-semibold" style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}>Shop now</span></div>
        <div className="mb-2 flex items-center justify-between"><strong className="text-[10px] text-slate-900">{productSectionTitle}</strong><span className="text-[8px]" style={{ color: form.primaryColor || '#f45b15' }}>View all</span></div>
        <div className="grid grid-cols-2 gap-2">{previewProducts.slice(0, 2).map(product => {
          const productHovered = hoveredPreviewProduct === product.name;
          const productBackground = productHovered ? colors.productCardHoverBackground : viewMode === 'mobile' ? colors.productCardMobileBackground : colors.productCardBackground;
          return <div key={product.name} onMouseEnter={() => setHoveredPreviewProduct(product.name)} onMouseLeave={() => setHoveredPreviewProduct('')} className="min-h-[174px] overflow-hidden rounded-md border p-2 transition-colors" style={{ backgroundColor: productBackground, color: productHovered ? colors.productCardHoverText : colors.productCardText, borderColor: productHovered ? colors.productCardHoverBorder : productBorder.borderColor, borderWidth: `${productBorder.borderWidth}px`, borderRadius: `${productBorder.borderRadius}px` }}><div className="relative grid h-[96px] place-items-center overflow-hidden rounded bg-white"><img src={product.image} alt={product.name} className="h-full w-full object-contain" />{cartButtonStyle === 'image' && <span className={`absolute bottom-1 right-1 grid place-items-center rounded text-[8px] font-semibold ${imageButtonLabel === '+' ? 'h-[30px] w-[30px] p-0 text-2xl' : 'px-2 py-1'}`} style={{ backgroundColor: hoveredPreviewButton ? colors.buttonHoverBackground : colors.buttonBackground, color: hoveredPreviewButton ? colors.buttonHoverText : colors.buttonText }}>{imageButtonLabel}</span>}</div><strong className="mt-1 block truncate text-[8px]">{product.name}</strong><span className="block text-[9px] font-semibold" style={{ color: colors.priceColor }}>{product.price}</span>{cartButtonStyle === 'bottom' && <span onMouseEnter={() => setHoveredPreviewButton(true)} onMouseLeave={() => setHoveredPreviewButton(false)} className="mt-1 grid h-6 place-items-center rounded text-[8px] font-semibold" style={{ backgroundColor: hoveredPreviewButton ? colors.buttonHoverBackground : colors.buttonBackground, color: hoveredPreviewButton ? colors.buttonHoverText : colors.buttonText }}>Add to cart</span>}</div>;
        })}</div>
      </div>
      <div className="flex h-7 items-center justify-center text-[8px]" style={{ backgroundColor: colors.footerBackground, color: colors.footerText }}>{form.copyrightText || storeName}</div>
    </div>
  </div>;

  return <div className="rounded-lg bg-slate-100 px-2 py-4 sm:px-3">
    <div className="mx-auto w-full max-w-[1100px]">
      <div className="overflow-hidden rounded-xl border-[7px] border-slate-800 bg-white shadow-xl">
        <div className="flex h-6 items-center gap-1.5 bg-slate-900 px-3"><i className="h-1.5 w-1.5 rounded-full bg-slate-500" /><i className="h-1.5 w-1.5 rounded-full bg-slate-600" /><i className="h-1.5 w-1.5 rounded-full bg-slate-600" /><span className="ml-3 flex h-3.5 flex-1 items-center rounded-sm bg-slate-800 px-2 text-[7px] text-slate-500">store.example.com</span><span className="ml-2 h-1 w-1 rounded-full bg-slate-600" /></div>
        <div className="flex min-h-[58px] items-center gap-4 px-4" style={{ backgroundColor: colors.headerBackground, color: colors.headerText }}>
          {logo ? <img src={logo} alt={storeName} className="h-8 w-8 shrink-0 rounded-full object-contain" /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold" style={{ backgroundColor: form.primaryColor || '#f45b15', color: colors.buttonText }}>{storeName.slice(0, 1).toUpperCase()}</span>}
          <div className="min-w-[90px] leading-tight"><strong className="block truncate text-[10px]">{storeName}</strong><span className="inline-flex items-center gap-0.5 whitespace-nowrap text-[9px]"><MapPin size={10} style={{ color: colors.headerIconColor || colors.headerText }} />Deliver to 440001</span></div>
          <div className="flex h-9 min-w-0 flex-1 overflow-hidden rounded-md border border-slate-200" style={{ backgroundColor: colors.searchBackground }}>
            <span className="flex min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap px-3 text-ellipsis text-[10px] text-slate-500">Search products, brands and more...</span>
            <span className="grid w-10 shrink-0 place-items-center" style={{ backgroundColor: colors.searchButton, color: colors.buttonText }}><Search size={15} /></span>
          </div>
          <div className="flex shrink-0 items-center gap-2" style={{ color: colors.headerIconColor || colors.headerText }}>
            {actions.map(([Icon, label]) => <span key={label} className="grid justify-items-center gap-0.5 whitespace-nowrap rounded px-1 text-[7px] leading-none" onMouseEnter={() => setHoveredHeaderAction(label)} onMouseLeave={() => setHoveredHeaderAction('')} style={hoveredHeaderAction === label ? { backgroundColor: colors.headerHoverBackground, color: colors.headerHoverText } : undefined}><span className="relative"><Icon size={13} />{isQuickCommerce && (label === 'Cart' || label === 'Wishlist') && <b className="absolute -right-1.5 -top-1 grid h-3 min-w-3 place-items-center rounded-full px-0.5 text-[6px] leading-none text-white" style={{ backgroundColor: label === 'Cart' ? colors.cartCountBackground || colors.buttonBackground : colors.favoritesCountBackground }}>2</b>}</span>{label}</span>)}
          </div>
        </div>
        <nav className="flex h-9 items-stretch gap-7 border-y border-slate-200 px-5 text-[10px]" style={{ backgroundColor: colors.headerBackground, color: colors.headerText }}>
          <span className="flex items-center border-b-2 font-semibold" style={{ borderColor: form.primaryColor || '#f45b15', color: form.primaryColor || '#f45b15' }}>Home</span>
          <span className="flex items-center">{moduleName || 'Module'}</span>
          <span className="flex items-center">Categories</span>
        </nav>
        <div className="h-[300px] overflow-hidden p-3" style={{ backgroundColor: colors.pageBackground }}>
          <div className="mb-3 flex min-h-[68px] items-center justify-between rounded-lg px-4 py-2" style={{ backgroundColor: colors.surfaceBackground }}>
            <div><strong className="block text-sm leading-tight text-slate-900">{heroTitle}</strong><span className="mt-1 block text-[9px] text-slate-500">{heroSubtitle}</span></div>
            <span className="inline-flex rounded px-3 py-2 text-[9px] font-semibold" style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}>Shop now</span>
          </div>
          <div className="mb-2 flex items-center justify-between"><strong className="text-xs text-slate-900">{productSectionTitle}</strong><span className="text-[9px]" style={{ color: form.primaryColor || '#f45b15' }}>View all</span></div>
          <div className="grid grid-cols-5 gap-2">
            {previewProducts.map(product => <div key={product.name} onMouseEnter={() => setHoveredPreviewProduct(product.name)} onMouseLeave={() => setHoveredPreviewProduct('')} className="overflow-hidden rounded-md border p-1.5 transition-colors" style={{ backgroundColor: hoveredPreviewProduct === product.name ? colors.productCardHoverBackground : colors.productCardBackground, color: hoveredPreviewProduct === product.name ? colors.productCardHoverText : colors.productCardText, borderColor: hoveredPreviewProduct === product.name ? colors.productCardHoverBorder : productBorder.borderColor, borderWidth: `${productBorder.borderWidth}px`, borderRadius: `${productBorder.borderRadius}px` }}>
              <div className="relative grid h-[78px] place-items-center overflow-hidden rounded bg-white"><img src={product.image} alt={product.name} className="h-full w-full object-contain" />{cartButtonStyle === 'image' && <span className={`absolute bottom-1 right-1 grid place-items-center rounded text-[8px] font-semibold ${imageButtonLabel === '+' ? 'h-[30px] w-[30px] p-0 text-2xl' : 'px-2 py-1'}`} style={{ backgroundColor: hoveredPreviewButton ? colors.buttonHoverBackground : colors.buttonBackground, color: hoveredPreviewButton ? colors.buttonHoverText : colors.buttonText }}>{imageButtonLabel}</span>}</div>
              <strong className="mt-1 block truncate text-[9px]" style={{ color: hoveredPreviewProduct === product.name ? colors.productCardHoverText : colors.productCardText }}>{product.name}</strong>
              <span className="block text-[10px] font-semibold" style={{ color: colors.priceColor }}>{product.price}</span>
              {cartButtonStyle === 'bottom' && <span onMouseEnter={() => setHoveredPreviewButton(true)} onMouseLeave={() => setHoveredPreviewButton(false)} className="mt-1 grid h-6 place-items-center rounded text-[8px] font-semibold" style={{ backgroundColor: hoveredPreviewButton ? colors.buttonHoverBackground : colors.buttonBackground, color: hoveredPreviewButton ? colors.buttonHoverText : colors.buttonText }}>Add to cart</span>}
            </div>)}
          </div>
        </div>
        <div className="flex h-7 items-center justify-center text-[9px]" style={{ backgroundColor: colors.footerBackground, color: colors.footerText }}>{form.copyrightText || storeName}</div>
      </div>
    </div>
    <div className="mx-auto h-7 w-16 bg-gradient-to-b from-slate-500 to-slate-300" />
    <div className="mx-auto h-2.5 w-1/3 rounded-b-lg bg-slate-400 shadow-md" />
  </div>;
}

function WebPageThemePreview({ form, viewMode }) {
  const colors = { ...DEFAULT_FORM.themeColors, ...(form.themeColors || {}) };
  const brand = form.businessName || form.platformName || 'Wepzo Technologies';
  const primary = form.primaryColor || '#1457d9';
  const isMobile = viewMode === 'mobile';
  return <div className="rounded-lg bg-slate-100 p-3 sm:p-4">
    <div className={`mx-auto overflow-hidden rounded-xl border-[7px] border-slate-800 shadow-xl ${isMobile ? 'max-w-[390px]' : 'max-w-[1100px]'}`} style={{ backgroundColor: colors.pageBackground }}>
      <div className="flex h-6 items-center gap-1.5 bg-slate-900 px-3"><i className="h-1.5 w-1.5 rounded-full bg-slate-500"/><i className="h-1.5 w-1.5 rounded-full bg-slate-600"/><i className="h-1.5 w-1.5 rounded-full bg-slate-600"/><span className="ml-3 flex h-3.5 flex-1 items-center truncate rounded-sm bg-slate-800 px-2 text-[7px] text-slate-400">web-page.example.com · preview</span></div>
      <header className={`flex items-center justify-between gap-3 px-4 ${isMobile ? 'h-12' : 'h-14 px-6'}`} style={{ backgroundColor: colors.headerBackground, color: colors.headerText }}>
        <div className="flex min-w-0 items-center gap-2">{form.businessLogo ? <img src={form.businessLogo} alt="" className="h-8 w-8 rounded-lg object-contain" /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: primary }}>{brand.slice(0, 1).toUpperCase()}</span>}<strong className={`${isMobile ? 'text-[9px]' : 'text-[11px]'} truncate`}>{brand}</strong></div>
        {!isMobile && <nav className="flex items-center gap-4 text-[8px]"><span>Services</span><span>About</span><span>Contact</span></nav>}
        {!isMobile && <div className="flex h-8 w-36 overflow-hidden rounded-md border border-slate-200" style={{ backgroundColor: colors.searchBackground }}><span className="flex flex-1 items-center px-2 text-[8px] text-slate-400">Search services</span><span className="grid w-8 place-items-center text-[8px] text-white" style={{ backgroundColor: colors.searchButton }}>⌕</span></div>}
        <span className="shrink-0 rounded-md px-3 py-2 text-[8px] font-semibold" style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}>Get in touch</span>
      </header>
      <main style={{ backgroundColor: colors.pageBackground, color: colors.headerText }}>
        <section className={`grid items-center gap-4 ${isMobile ? 'grid-cols-1 px-4 py-7' : 'min-h-[240px] grid-cols-[1.15fr_0.85fr] px-8 py-8'}`}>
          <div><span className="text-[7px] font-bold uppercase tracking-[0.16em]" style={{ color: primary }}>● Technology &amp; business solutions</span><h2 className={`${isMobile ? 'mt-2 text-xl' : 'mt-3 text-3xl'} max-w-lg font-bold leading-tight`}>Building Digital Solutions for a Smarter Future</h2><p className="mt-2 max-w-md text-[9px] leading-relaxed opacity-70">We help ambitious teams turn complex challenges into clear, practical technology.</p><div className="mt-4 flex items-center gap-3"><span className="rounded-md px-3 py-2 text-[8px] font-semibold" style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}>Explore services</span><span className="text-[8px] font-semibold" style={{ color: primary }}>Learn about us →</span></div></div>
          {!isMobile && <div className="rounded-xl p-4" style={{ backgroundColor: colors.surfaceBackground }}><div className="mb-3 flex items-center justify-between"><strong className="text-[9px]">Business growth</strong><span className="text-[7px]" style={{ color: primary }}>+24% this year</span></div><div className="flex h-24 items-end gap-2 rounded-lg p-3" style={{ backgroundColor: colors.pageBackground }}>{[36, 52, 44, 69, 61, 82, 73, 96].map((height, index) => <i key={index} className="flex-1 rounded-t" style={{ height: `${height}%`, backgroundColor: primary, opacity: 0.35 + index * 0.08 }} />)}</div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg p-2" style={{ backgroundColor: colors.pageBackground }}><span className="block text-[7px] opacity-60">Projects delivered</span><b className="text-sm">120+</b></div><div className="rounded-lg p-2" style={{ backgroundColor: colors.pageBackground }}><span className="block text-[7px] opacity-60">Client satisfaction</span><b className="text-sm">98%</b></div></div></div>}
        </section>
        <section className={`${isMobile ? 'px-4 pb-5' : 'px-8 pb-7'}`}><div className="mb-3 flex items-end justify-between"><div><span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: primary }}>What we do</span><h3 className="mt-1 text-xs font-bold">Services built around your goals</h3></div><span className="text-[8px] opacity-60">View all →</span></div><div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>{['Digital strategy', 'Web & software', 'Growth solutions'].slice(0, isMobile ? 2 : 3).map((title, index) => <article key={title} className="rounded-lg border border-slate-200 p-3" style={{ backgroundColor: colors.surfaceBackground }}><span className="grid h-6 w-6 place-items-center rounded-md text-[9px] font-bold" style={{ color: primary, backgroundColor: `${primary}18` }}>{['↗', '◇', '✦'][index]}</span><strong className="mt-2 block text-[8px]">{title}</strong><p className="mt-1 text-[7px] leading-relaxed opacity-65">Thoughtful expertise and dependable delivery for your next step.</p></article>)}</div></section>
      </main>
      <footer className="flex h-7 items-center justify-center text-[8px]" style={{ backgroundColor: colors.footerBackground, color: colors.footerText }}>{form.copyrightText || brand}</footer>
    </div>
    <p className="mt-2 text-center text-[11px] text-slate-500">Preview only · color changes show here; save to apply them to your live website.</p>
  </div>;
}

export default function SettingsBusinessPage({ colorsOnly = false }) {
  const user = useAuthStore(state => state.user);
  const activeModule = useModuleStore(state => state.activeModule);
  const isTenant = user?.role === 'website_user';
  const [form, setForm] = useState(DEFAULT_FORM);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [desktopColorCopied, setDesktopColorCopied] = useState(false);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [resolvedPreviewWebsite, setResolvedPreviewWebsite] = useState(null);
  const [mainAdminPreview, setMainAdminPreview] = useState({ loading: false, website: null, error: '' });
  const normalizeSettingsError = (error, fallback) => {
    const rawMessage = error?.response?.data?.message || error?.message || '';
    const message = String(rawMessage).trim();
    return message || fallback;
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/settings/business');
      setForm({ ...DEFAULT_FORM, ...(data || {}), themeColors: { ...DEFAULT_FORM.themeColors, ...(data?.themeColors || {}), productCartButtonStyle: ['quantity', 'bottom-quantity'].includes(data?.themeColors?.productCartButtonStyle) ? 'image' : data?.themeColors?.productCartButtonStyle || DEFAULT_FORM.themeColors.productCartButtonStyle } });
      setError('');
    } catch (requestError) {
      const nextError = normalizeSettingsError(requestError, 'Business settings load nahi hui.');
      setError(nextError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSettings(); }, []);

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const setThemeColor = (key, value) => setForm(current => ({
    ...current,
    themeColors: { ...DEFAULT_FORM.themeColors, ...(current.themeColors || {}), [key]: value },
  }));
  const setStorefrontCardStyle = (type, key, value) => setForm(current => {
    const defaults = DEFAULT_FORM.themeColors.storefrontCardStyles;
    const styles = current.themeColors?.storefrontCardStyles || {};
    return {
      ...current,
      themeColors: {
        ...DEFAULT_FORM.themeColors,
        ...(current.themeColors || {}),
        storefrontCardStyles: {
          ...styles,
          [type]: {
            ...defaults[type],
            ...(styles[type] || {}),
            [key]: value,
          },
        },
      },
    };
  });
  const copyThemeColor = (source, target) => {
    const sourceColor = form.themeColors?.[source] || DEFAULT_FORM.themeColors[source] || '#ffffff';
    setThemeColor(target, sourceColor);
    setDesktopColorCopied(true);
  };

  const uploadImage = (key, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Image file select karein.');
    if (file.size > 3 * 1024 * 1024) return setError('Image 3 MB se chhoti honi chahiye.');
    const reader = new FileReader();
    reader.onload = () => { set(key, reader.result); setError(''); };
    reader.onerror = () => setError('Image read nahi ho paayi.');
    reader.readAsDataURL(file);
  };

  const save = async event => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const payload = {
        ...form,
        platformName: form.platformName || form.businessName,
        currency: form.currency || 'INR',
        decimalDigits: Number(form.decimalDigits) || 0,
        defaultCommission: Number(form.defaultCommission) || 0,
        deliveryCommission: Number(form.deliveryCommission) || 0,
        additionalChargeAmount: Number(form.additionalChargeAmount) || 0,
        businessLat: Number(form.businessLat) || 0,
        businessLng: Number(form.businessLng) || 0,
      };
      const { data } = await api.put('/settings/business', payload);
      setForm({ ...DEFAULT_FORM, ...(data || {}), themeColors: { ...DEFAULT_FORM.themeColors, ...(data?.themeColors || {}), productCartButtonStyle: ['quantity', 'bottom-quantity'].includes(data?.themeColors?.productCartButtonStyle) ? 'image' : data?.themeColors?.productCartButtonStyle || DEFAULT_FORM.themeColors.productCartButtonStyle } });
      setPreviewRefreshKey(value => value + 1);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2400);
    } catch (requestError) {
      const nextError = normalizeSettingsError(requestError, 'Business settings save nahi hui.');
      setError(nextError);
    } finally {
      setSaving(false);
    }
  };

  const latitude = Number(form.businessLat) || 21.1458;
  const longitude = Number(form.businessLng) || 79.0882;
  const headerThemeColorControls = [
    ['headerBackground', 'Header background'], ['headerText', 'Header text'],
    ['headerIconColor', 'Header icons'],
    ['headerHoverBackground', 'Header hover background'], ['headerHoverText', 'Header hover text'],
    ['headerCategoryHoverBackground', 'Header category hover background'],
    ['deliveryTimeText', 'Delivery time text'], ['deliveryTimeIcon', 'Delivery time icon'],
    ['cartCountBackground', 'Cart count badge'], ['favoritesCountBackground', 'Favorites count badge'],
  ];
  const showStorefrontCardBorders = true;
  const showStorefrontCardRounding = true;
  const moduleKey = getAdminModuleKey(activeModule);
  const isMainAdmin = user?.role === 'main_admin';
  useEffect(() => {
    if (!isMainAdmin) {
      setMainAdminPreview({ loading: false, website: null, error: '' });
      return undefined;
    }
    const moduleSlug = String(activeModule?.slug || activeModule?.type || '').trim();
    if (!moduleSlug) {
      setMainAdminPreview({ loading: false, website: null, error: 'Select a web module to load its Main Admin storefront.' });
      return undefined;
    }
    let current = true;
    setMainAdminPreview({ loading: true, website: null, error: '' });
    api.get('/public/main-admin-website-preview', {
      params: {
        moduleId: activeModule?._id && activeModule._id !== moduleSlug ? activeModule._id : undefined,
        moduleSlug,
      },
    }).then(({ data }) => {
      if (current) setMainAdminPreview({ loading: false, website: data, error: '' });
    }).catch(requestError => {
      if (current) setMainAdminPreview({
        loading: false,
        website: null,
        error: requestError.response?.data?.message || 'Main Admin storefront preview could not be loaded.',
      });
    });
    return () => { current = false; };
  }, [activeModule?._id, activeModule?.slug, activeModule?.type, isMainAdmin]);
  useEffect(() => {
    if (!isTenant) {
      setResolvedPreviewWebsite(null);
      return undefined;
    }
    let current = true;
    setResolvedPreviewWebsite(null);
    api.get('/websites').then(({ data }) => {
      if (!current) return;
      const websites = Array.isArray(data) ? data : [];
      const preferredId = String(user?.websiteId || activeModule?.websiteId || activeModule?.tenantId || '');
      const moduleId = String(user?.selectedModuleId || user?.websiteModuleId || activeModule?._id || '');
      const moduleSlug = getAdminModuleKey(activeModule);
      const belongsToSelectedModule = item => moduleId && item.websiteModuleId
        ? String(item.websiteModuleId) === moduleId
        : getAdminModuleKey({ slug: item.websiteModuleSlug || item.moduleType, name: item.moduleName }) === moduleSlug;
      const ownedWebsites = websites.filter(item =>
        String(item.userId || '') === String(user?.id || user?._id || '')
        && belongsToSelectedModule(item)
      );
      const website = websites.find(item => preferredId
        && String(item._id || '') === preferredId
        && belongsToSelectedModule(item))
        || ownedWebsites.find(belongsToSelectedModule);
      const websiteId = String(website?._id || '').trim();
      setResolvedPreviewWebsite(website || null);
      if (websiteId) useAuthStore.getState().setWebsiteId(websiteId);
    }).catch(() => {
      if (current) setResolvedPreviewWebsite(null);
    });
    return () => { current = false; };
  }, [activeModule?.tenantId, activeModule?.websiteId, isTenant, user?._id, user?.id, user?.websiteId]);
  const previewWebsite = isMainAdmin ? mainAdminPreview.website : resolvedPreviewWebsite;
  const previewWebsiteId = isMainAdmin
    ? String(mainAdminPreview.website?.websiteId || '').trim()
    : String(resolvedPreviewWebsite?._id || user?.websiteId || activeModule?.websiteId || activeModule?.tenantId || '').trim();
  const livePreviewUrl = useMemo(() => {
    if (isMainAdmin && !mainAdminPreview.website) return '';
    if (!isMainAdmin && !previewWebsiteId) return '';
    if (isMainAdmin && !previewWebsiteId && !mainAdminPreview.website?.modulePreview) return '';
    const previewBases = {
      'e-commerce': import.meta.env.VITE_ECOMMERCE_PREVIEW_URL || (import.meta.env.DEV ? 'http://localhost:5173/' : ''),
      'quick-commerce': import.meta.env.VITE_QC_PREVIEW_URL || 'http://localhost:3001/',
      'store-single': import.meta.env.VITE_STORE_SINGLE_PREVIEW_URL || 'http://localhost:5175/',
      marketing: import.meta.env.VITE_MARKETING_APP_URL || 'http://localhost:3002/',
      'information-web': import.meta.env.VITE_GENERAL_PREVIEW_URL || 'http://localhost:5174/',
    };
    try {
      const assignedDomain = !isMainAdmin ? assignedWebsiteDomainUrl(previewWebsite) : '';
      let previewBase = assignedDomain || previewBases[moduleKey];
      const websiteUrl = assignedDomain ? '' : previewWebsite?.hosting?.url
        || previewWebsite?.domain?.fullDomain
        || (String(previewWebsite?.domain?.name || '').includes('.') ? previewWebsite.domain.name : '')
        || '';
      if (websiteUrl && !(isMainAdmin && import.meta.env.DEV)) {
        const liveUrl = new URL(/^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`);
        previewBase = liveUrl.href;
      }
      if (!previewBase && isMainAdmin && moduleKey === 'e-commerce' && mainAdminPreview.website?.modulePreview) {
        previewBase = 'https://wepzo.in/';
      }
      if (!previewBase) return '';
      const url = new URL(previewBase, window.location.origin);
      if (isMainAdmin) {
        url.searchParams.set('adminPreview', '1');
        const websiteModuleId = mainAdminPreview.website?.websiteModuleId || activeModule?._id;
        if (websiteModuleId) url.searchParams.set('websiteModuleId', String(websiteModuleId));
        if (previewWebsiteId) {
          url.searchParams.set('published', '1');
          url.searchParams.set('websiteId', previewWebsiteId);
        }
        url.searchParams.set('builderPreview', '1');
        if (moduleKey === 'e-commerce' && websiteModuleId) url.searchParams.set('moduleId', String(websiteModuleId));
      } else {
        url.searchParams.set('published', '1');
        url.searchParams.set('builderPreview', '1');
        if (assignedDomain) {
          url.searchParams.delete('websiteId');
          url.searchParams.delete('websiteModuleId');
          url.searchParams.delete('moduleId');
        } else {
          url.searchParams.set('websiteId', previewWebsiteId);
          const websiteModuleId = resolvedPreviewWebsite?.websiteModuleId || user?.selectedModuleId || user?.websiteModuleId || activeModule?._id;
          if (websiteModuleId) url.searchParams.set('websiteModuleId', String(websiteModuleId));
          if (moduleKey === 'e-commerce' && websiteModuleId) url.searchParams.set('moduleId', String(websiteModuleId));
        }
      }
      return url.href;
    } catch {
      return '';
    }
  }, [activeModule?._id, isMainAdmin, mainAdminPreview.website, moduleKey, previewWebsite, previewWebsiteId, resolvedPreviewWebsite?.websiteModuleId, user?.selectedModuleId, user?.websiteModuleId]);
  const missingEcommercePreviewUrl = moduleKey === 'e-commerce'
    && !livePreviewUrl
    && (isMainAdmin ? !!mainAdminPreview.website : !!previewWebsiteId);
  const livePreviewError = isMainAdmin
    ? mainAdminPreview.error || (missingEcommercePreviewUrl ? 'The E-Commerce preview URL is not configured and no live website domain is linked to this module.' : '')
    : missingEcommercePreviewUrl
      ? 'The E-Commerce preview URL is not configured and no live website domain is linked to this module.'
      : '';
  const themeColorControls = [
    ['primaryColor', 'Brand and active accent'], ['priceColor', 'Product price'],
    ['searchBackground', 'Search bar background'], ['searchButton', 'Search button'],
    ['buttonBackground', 'Main buttons'], ['buttonText', 'Button text'],
    ['footerBackground', 'Footer background'], ['footerText', 'Footer text'],
    ['pageBackground', 'Page background'], ['surfaceBackground', 'Cards and surfaces'],
    [previewMode === 'mobile' ? 'productCardMobileBackground' : 'productCardBackground', previewMode === 'mobile' ? 'Mobile product card background' : 'Desktop product card background'], ['productCardText', 'Product card text'], ['productCardSaveColor', 'Save / discount accent'],
    ['productCardHoverBackground', 'Product card hover background'],
    ['productCardHoverText', 'Product card hover text'], ['productCardHoverBorder', 'Product card hover border'],
    ['buttonHoverBackground', 'Button hover background'], ['buttonHoverText', 'Button hover text'],
  ];
  const themeColorValue = key => form.themeColors?.[key]
    || (key === 'cartCountBackground' ? form.themeColors?.buttonBackground || form.primaryColor || '#f4510b' : null)
    || DEFAULT_FORM.themeColors[key]
    || '#f4510b';
  const renderThemeColor = ([key, label]) => <label key={key} className="theme-color-control-card flex min-h-14 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
    <span>{label}</span><input aria-label={label} type="color" value={key === 'primaryColor' ? form.primaryColor || '#f45b15' : themeColorValue(key)} onChange={event => key === 'primaryColor' ? set('primaryColor', event.target.value) : setThemeColor(key, event.target.value)} className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white p-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
  </label>;
  const renderCardBorderControls = (type, label) => {
    const fallback = DEFAULT_FORM.themeColors.storefrontCardStyles[type];
    const style = { ...fallback, ...(form.themeColors?.storefrontCardStyles?.[type] || {}) };
    const defaultBackground = type === 'header' ? themeColorValue('headerBackground') : type === 'product' ? themeColorValue('productCardBackground') : type === 'button' ? themeColorValue('buttonBackground') : themeColorValue('surfaceBackground');
    return <details key={type} className="theme-card-style-panel group rounded-lg border border-slate-200 bg-white p-3 open:border-blue-200 open:bg-blue-50/30">
      <summary className="theme-card-style-summary flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-slate-800 [&::-webkit-details-marker]:hidden"><span>{label}</span><span className="text-base leading-none text-slate-500 transition-transform group-open:rotate-180">⌄</span></summary>
      <div className="mt-2 space-y-2">
      {type !== 'header' && <label className="flex min-h-11 items-center justify-between gap-2 text-xs font-medium text-slate-700">Background color<input aria-label={`${label} background color`} type="color" value={style.backgroundColor || defaultBackground} onChange={event => setStorefrontCardStyle(type, 'backgroundColor', event.target.value)} className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white p-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></label>}
      {type === 'button' && <label className="flex min-h-11 items-center justify-between gap-2 text-xs font-medium text-slate-700">Text color<input aria-label={`${label} text color`} type="color" value={style.textColor || themeColorValue('buttonText')} onChange={event => setStorefrontCardStyle(type, 'textColor', event.target.value)} className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white p-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></label>}
      <label className="flex min-h-11 items-center justify-between gap-2 text-xs font-medium text-slate-700">Border color<input aria-label={`${label} border color`} type="color" value={style.borderColor} onChange={event => setStorefrontCardStyle(type, 'borderColor', event.target.value)} className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white p-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></label>
      {[
        ['borderWidth', 'Border width', 0, 8, 'px'],
        ['borderRadius', 'Corner roundness', 0, 40, 'px'],
      ].map(([key, caption, min, max, unit]) => <label key={key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-xs text-slate-700">
        <span>{caption} <b className="font-semibold text-slate-900">{style[key]}{unit}</b></span>
        <output className="row-span-2 text-slate-500">{style[key]}{unit}</output>
        <input aria-label={`${label} ${caption}`} type="range" min={min} max={max} step="1" value={style[key]} onChange={event => setStorefrontCardStyle(type, key, Number(event.target.value))} className="w-full accent-blue-700" />
      </label>)}
      </div>
    </details>;
  };
  const previewPanel = <>
    <div className={`flex items-center justify-between gap-3 bg-white/95 py-1 backdrop-blur ${previewMode === 'mobile' ? '' : 'sticky top-3 z-10'}`}>
      <span className="theme-colors-preview-title text-sm font-semibold text-slate-700" style={previewMode === 'mobile' ? { fontSize: 11, lineHeight: '14px' } : undefined}>Preview</span>
      <div role="group" aria-label="Website preview size" className="theme-colors-preview-toggle-group inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1" style={previewMode === 'mobile' ? { height: 26, padding: 2, gap: 2 } : undefined}>
        {[['mobile', Smartphone, 'Mobile'], ['desktop', Monitor, 'Desktop']].map(([mode, Icon, label]) => <button key={mode} type="button" aria-label={`${label} preview`} aria-pressed={previewMode === mode} onClick={() => setPreviewMode(mode)} className={`theme-colors-preview-toggle inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${previewMode === mode ? 'bg-[#304ca3] text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`} style={previewMode === 'mobile' ? { width: 22, minWidth: 22, height: 22, minHeight: 22, padding: 2, gap: 0 } : undefined}><Icon size={previewMode === 'mobile' ? 11 : 15} /><span>{label}</span></button>)}
      </div>
    </div>
    <div className={previewMode === 'mobile' ? '' : 'sticky top-14 z-10'}>
      <LiveWebsitePreview
        src={livePreviewUrl}
        moduleName={activeModule?.name}
        viewMode={previewMode}
        refreshKey={previewRefreshKey}
        theme={{ primaryColor: form.primaryColor, themeColors: form.themeColors }}
        loading={isMainAdmin && (mainAdminPreview.loading || (!mainAdminPreview.website && !mainAdminPreview.error))}
        error={livePreviewError}
      />
    </div>
  </>;

  if (loading) return <div className="py-20 text-center text-slate-400">Loading business settings...</div>;

  if (colorsOnly) return <form onSubmit={save} className="theme-colors-form mx-auto w-full max-w-6xl space-y-5 pb-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Building2 size={19} className="text-blue-700" />Website Theme Colors</h2><p className="mt-1 text-sm text-slate-500">Colors apply only to the currently selected web module.</p></div>
      <button type="submit" disabled={saving} className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={15} />{saved ? 'Saved' : saving ? 'Saving...' : 'Save Colors'}</button>
    </div>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <Section title={getAdminModuleKey(activeModule) === 'marketing' ? 'Website colors' : 'Storefront colors'} description="Customize colors, borders, and corner roundness for each part of this web module." overflowVisible={previewMode === 'mobile'} className={`theme-colors-section ${previewMode === 'mobile' ? 'theme-colors-mobile-layout' : ''}`}>
      <div className="space-y-5">
      {previewMode === 'mobile' && <div className="theme-colors-sticky-preview sticky top-0 z-20 self-start bg-white pb-3">{previewPanel}</div>}
      <div className={`theme-colors-grid grid items-start gap-4 ${previewMode === 'mobile' ? 'xl:grid-cols-2' : 'xl:grid-cols-[minmax(190px,0.9fr)_minmax(500px,2.5fr)_minmax(190px,0.9fr)]'}`}>
        <div className={`theme-colors-left-controls space-y-3 xl:pr-1 ${previewMode === 'mobile' ? '' : 'xl:max-h-[calc(100vh-250px)] xl:overflow-y-auto xl:overscroll-contain'}`}>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Header colors</h3>
            <div className="grid gap-2">{headerThemeColorControls.map(renderThemeColor)}</div>
            {showStorefrontCardBorders && <div className="mt-2">{renderCardBorderControls('header', 'Header')}</div>}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => copyThemeColor('headerText', 'headerIconColor')} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50"><ArrowLeftRight size={13} />Text → icons</button>
              <button type="button" onClick={() => copyThemeColor('headerIconColor', 'headerText')} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50"><ArrowLeftRight size={13} />Icons → text</button>
            </div>
          </div>
        </div>
        <div className="theme-colors-preview-cell min-w-0 space-y-3">{previewPanel}</div>
        <div className={`theme-colors-right-controls space-y-4 xl:pr-1 ${previewMode === 'mobile' ? '' : 'xl:max-h-[calc(100vh-250px)] xl:overflow-y-auto xl:overscroll-contain'}`}>
          <div><h3 className="mb-2 text-sm font-semibold text-slate-800">Storefront colors</h3><div className="grid gap-2">{themeColorControls.slice(0, 10).map(renderThemeColor)}</div></div>
          <div className="space-y-3 border-t border-slate-200 pt-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Product and card colors</h3>
            </div>
            <div className="grid gap-2">{themeColorControls.slice(10).filter(([key]) => !['productCardBackground', 'productCardMobileBackground'].includes(key)).map(renderThemeColor)}</div>
            {showStorefrontCardRounding && <div className="grid grid-cols-1 gap-2">
              {renderCardBorderControls('product', 'Product cards')}
              {renderCardBorderControls('category', 'Category cards')}
              {renderCardBorderControls('promo', 'Promotion cards')}
              {renderCardBorderControls('account', 'Account cards')}
              {renderCardBorderControls('cart', 'Cart cards')}
              {renderCardBorderControls('profile', 'Profile cards')}
              {renderCardBorderControls('order', 'Order cards')}
              {renderCardBorderControls('support', 'Support cards')}
              {renderCardBorderControls('button', 'Buttons')}
            </div>}
            <label className="theme-select-control-card flex min-h-14 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
              <span className="shrink-0">Product cart button</span>
              <select aria-label="Product cart button" value={form.themeColors?.productCartButtonStyle || 'image'} onChange={event => setThemeColor('productCartButtonStyle', event.target.value)} className="theme-control-select min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-2 text-xs">
                <option value="bottom">Bottom Add to Cart</option>
                <option value="image">Image bottom-right: Add</option>
              </select>
            </label>
            <label className="theme-select-control-card flex min-h-14 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
              <span className="shrink-0">Image button label</span>
              <select aria-label="Image button label" value={form.themeColors?.productImageButtonLabel || 'add'} onChange={event => setThemeColor('productImageButtonLabel', event.target.value)} className="theme-control-select min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-2 text-xs">
                <option value="add">Add</option>
                <option value="plus">+</option>
              </select>
            </label>
          </div>
        </div>
      </div>
      </div>
    </Section>
    <div className="flex justify-end gap-2"><button type="button" onClick={loadSettings} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${listBtnOutline}`}><RotateCcw size={14} />Reset</button><button type="submit" disabled={saving} className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={14} />{saved ? 'Saved' : saving ? 'Saving...' : 'Save Colors'}</button></div>
  </form>;

  return <form onSubmit={save} className="mx-auto w-full max-w-6xl space-y-5 pb-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Building2 size={19} className="text-blue-700" />Business Info</h2><p className="mt-1 text-sm text-slate-500">Business profile and platform settings</p></div>
      <button type="submit" disabled={saving} className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={15} />{saved ? 'Saved' : saving ? 'Saving...' : 'Save Information'}</button>
    </div>

    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

    <Switch label="Maintenance Mode" description="Temporarily disable customer-facing services." checked={form.maintenanceMode} onChange={value => set('maintenanceMode', value)} />

    <Section title="Basic Information" description="Business identity, contact details, branding, and address.">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>Business Name *{isTenant && <span className="ml-1 font-normal text-slate-500">(from My Website Name)</span>}<input required disabled={isTenant} className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500`} value={form.businessName || form.platformName || ''} onChange={event => { set('businessName', event.target.value); set('platformName', event.target.value); }} /></label>
          <label className={labelClass}>Email *<input required type="email" className={inputClass} value={form.businessEmail || form.supportEmail || ''} onChange={event => { set('businessEmail', event.target.value); set('supportEmail', event.target.value); }} /></label>
          <label className={labelClass}>Phone *<input required type="tel" className={inputClass} value={form.businessPhone || form.supportPhone || ''} onChange={event => { set('businessPhone', event.target.value); set('supportPhone', event.target.value); }} /></label>
          <label className={labelClass}>Country *<select required className={inputClass} value={form.country || 'India'} onChange={event => set('country', event.target.value)}>{['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'United Arab Emirates'].map(country => <option key={country}>{country}</option>)}</select></label>
          <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">Address *<textarea required rows={3} className={inputClass} value={form.businessAddress || form.address || ''} onChange={event => { set('businessAddress', event.target.value); set('address', event.target.value); }} /></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <ImageUpload label="Upload Logo *" value={form.businessLogo || form.logo || ''} onUpload={file => uploadImage('businessLogo', file)} onRemove={() => set('businessLogo', '')} />
          <ImageUpload label="Favicon *" value={form.favicon || ''} onUpload={file => uploadImage('favicon', file)} onRemove={() => set('favicon', '')} small />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Latitude<input type="number" step="any" className={inputClass} value={form.businessLat ?? ''} onChange={event => set('businessLat', event.target.value)} /></label><label className={labelClass}>Longitude<input type="number" step="any" className={inputClass} value={form.businessLng ?? ''} onChange={event => set('businessLng', event.target.value)} /></label></div>
      <div className="h-[320px] overflow-hidden rounded-lg border border-slate-200"><MapContainer key={`${latitude}-${longitude}`} center={[latitude, longitude]} zoom={13} className="h-full w-full"><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" /><MapClick onPick={(lat, lng) => setForm(current => ({ ...current, businessLat: Number(lat.toFixed(6)), businessLng: Number(lng.toFixed(6)) }))} /><Marker position={[latitude, longitude]} icon={pinIcon} /></MapContainer></div>
      <p className="text-xs text-slate-500">Map par click karke business location set karein.</p>
    </Section>

    <Section title="General Setup" description="Configure timezone, time display, and currency format.">
      <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">Website brand color<input aria-label="Website brand color" type="color" value={form.primaryColor || '#f45b15'} onChange={event => set('primaryColor', event.target.value)} className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white p-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></label>
      <div className="grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
        <label className={labelClass}>Time zone<select className={inputClass} value={form.timezone || 'Asia/Kolkata'} onChange={event => set('timezone', event.target.value)}>{['Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'Australia/Sydney', 'UTC'].map(zone => <option key={zone} value={zone}>{zone}</option>)}</select></label>
        <fieldset><legend className={labelClass}>Time Format</legend><RadioGroup name="timeFormat" value={String(form.timeFormat || '12')} onChange={value => set('timeFormat', value)} options={ [['12', '12 Hours'], ['24', '24 Hours']] } /></fieldset>
      </div>
      <div className="grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-3">
        <label className={labelClass}>Currency Symbol<select className={inputClass} value={form.currencySymbol || '₹'} onChange={event => { const option = CURRENCIES.find(item => item.symbol === event.target.value); setForm(current => ({ ...current, currencySymbol: event.target.value, currency: option?.code || current.currency })); }}>{CURRENCIES.map(item => <option key={item.code} value={item.symbol}>{item.code} ({item.symbol})</option>)}</select></label>
        <fieldset><legend className={labelClass}>Currency Position</legend><RadioGroup name="currencyPosition" value={form.currencyPosition || 'left'} onChange={value => set('currencyPosition', value)} options={ [['left', `${form.currencySymbol || '₹'} Left`], ['right', `${form.currencySymbol || '₹'} Right`]] } /></fieldset>
        <label className={labelClass}>Digit After Decimal Point<input type="number" min="0" max="4" className={inputClass} value={numericInputValue(form.decimalDigits ?? 0)} onChange={event => set('decimalDigits', event.target.value)} /></label>
      </div>
    </Section>

    <Section title="Business Model Setup" description="Choose how stores are charged and set default commission rates.">
      <div className="grid gap-4 sm:grid-cols-2"><Switch label="Subscription" description="Allow stores to operate using subscription packages." checked={form.subscriptionEnabled} onChange={value => set('subscriptionEnabled', value)} /><Switch label="Commission" description="Charge commission per order and delivery charge." checked={form.commissionEnabled} onChange={value => set('commissionEnabled', value)} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Default Commission Rate On Order (%) *<input type="number" min="0" max="100" step="0.1" className={inputClass} value={numericInputValue(form.defaultCommission ?? 2.5)} onChange={event => set('defaultCommission', event.target.value)} /></label><label className={labelClass}>Commission Rate On Delivery Charge (%) *<input type="number" min="0" max="100" step="0.1" className={inputClass} value={numericInputValue(form.deliveryCommission ?? 7)} onChange={event => set('deliveryCommission', event.target.value)} /></label></div>
    </Section>

    <Section title="Additional Charge Setup" description="Optional customer-paid charge added to orders.">
      <Switch label="Status" checked={form.additionalChargeEnabled} onChange={value => set('additionalChargeEnabled', value)} />
      <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Additional Charge Name<input maxLength={50} className={inputClass} value={form.additionalChargeName || ''} onChange={event => set('additionalChargeName', event.target.value)} /></label><label className={labelClass}>Charge Amount ({form.currencySymbol || '₹'})<input type="number" min="0" step="0.01" className={inputClass} value={numericInputValue(form.additionalChargeAmount ?? 0)} onChange={event => set('additionalChargeAmount', event.target.value)} /></label></div>
    </Section>

    <Section title="Other Setup" description="Country selection and customer-facing legal text.">
      <Switch label="Country Picker" description="Allow customers to choose their country." checked={form.countryPickerEnabled} onChange={value => set('countryPickerEnabled', value)} />
      <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Copyright Text<textarea maxLength={100} rows={3} className={inputClass} value={form.copyrightText || ''} onChange={event => set('copyrightText', event.target.value)} /></label><label className={labelClass}>Cookies Text *<textarea required maxLength={100} rows={3} className={inputClass} value={form.cookiesText || ''} onChange={event => set('cookiesText', event.target.value)} /></label></div>
    </Section>

    <div className="flex justify-end gap-2"><button type="button" onClick={loadSettings} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${listBtnOutline}`}><RotateCcw size={14} />Reset</button><button type="submit" disabled={saving} className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={14} />{saved ? 'Saved' : saving ? 'Saving...' : 'Save Information'}</button></div>
  </form>;
}

const CURRENCIES = [
  { code: 'INR', symbol: '₹' }, { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' }, { code: 'AED', symbol: 'د.إ' }, { code: 'AUD', symbol: 'A$' },
];

function RadioGroup({ name, value, onChange, options }) {
  return <div className="mt-1 flex min-h-[43px] flex-wrap items-center gap-5 rounded-lg border border-slate-200 bg-white px-3">{options.map(([option, label]) => <label key={option} className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} className="accent-blue-700" />{label}</label>)}</div>;
}

function ImageUpload({ label, value, onUpload, onRemove, small = false }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-700">{label}</p>{value && <button type="button" onClick={onRemove} className="text-xs text-rose-600">Remove</button>}</div><div className={`mt-3 flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white ${small ? 'h-20' : 'h-32'}`}>{value ? <img src={value} alt={label} className="max-h-full max-w-full object-contain" /> : <ImagePlus className="text-slate-400" size={small ? 24 : 32} />}</div><label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Upload size={14} />Upload image<input type="file" accept="image/*" className="sr-only" onChange={event => { onUpload(event.target.files?.[0]); event.target.value = ''; }} /></label><p className="mt-2 text-[11px] text-slate-400">JPG, PNG, GIF or WEBP. Max 3 MB.</p></div>;
}
