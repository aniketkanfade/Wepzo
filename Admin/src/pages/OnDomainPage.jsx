import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, ArrowRight, Check, Download, ExternalLink, Globe2, Headphones, LoaderCircle, LockKeyhole, LogOut, Monitor, ShieldCheck, UserCircle2 } from 'lucide-react';
import api from '../api/axios';
import { useAuthStore, useBuilderStore } from '../store/useStore';
import { getAdminModuleKey } from '../constants/adminModules';

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise(resolve => {
    const existing = document.querySelector('script[data-wepzo-razorpay]');
    if (existing) {
      existing.addEventListener('load', () => resolve(!!window.Razorpay), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.wepzoRazorpay = 'true';
    script.onload = () => resolve(!!window.Razorpay);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const amountText = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function OnDomainHeader({ user, onSignOut }) {
  return <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 px-5 shadow-sm backdrop-blur sm:px-8">
    <div className="text-[22px] font-black tracking-[-1.3px] text-[#111827]">◢<span className="text-blue-900">WEP</span><span className="text-orange-500">ZO</span></div>
    <div className="flex items-center gap-3 text-slate-700 sm:gap-6">
      <span className="hidden items-center gap-1.5 text-[11px] font-medium sm:inline-flex"><Headphones size={14}/>Need Help?</span>
      <span className="flex items-center gap-1.5 text-xs font-medium"><UserCircle2 size={20} className="text-blue-600"/>{user?.name?.split(' ')[0] || 'ADK'}<span className="text-[10px]">⌄</span></span>
      <button type="button" onClick={onSignOut} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Sign out" title="Sign out"><LogOut size={16}/></button>
    </div>
  </header>;
}

export default function OnDomainPage() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const resetBuilder = useBuilderStore(state => state.reset);
  const navigate = useNavigate();
  const isQuickCommerce = getAdminModuleKey({
    slug: user?.selectedModuleSlug || user?.websiteModuleSlug,
    type: user?.selectedModuleType,
    name: user?.selectedModuleName,
  }) === 'quick-commerce';
  const quickCommercePreviewUrl = new URL(
    import.meta.env.VITE_QC_PREVIEW_URL || 'http://localhost:3001/',
    window.location.origin
  );
  quickCommercePreviewUrl.searchParams.set('templatePreview', '1');
  const [packageInfo, setPackageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadPackage = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/on-domain/package');
      setPackageInfo(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message
        || (requestError.response
          ? `On Domain package details could not be loaded (server returned ${requestError.response.status}).`
          : 'Could not reach the website server. Check your connection and try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPackage(); }, []);

  const signOut = () => {
    resetBuilder();
    logout();
    navigate('/login', { replace: true });
  };

  const startCheckout = async () => {
    setPaying(true);
    setError('');
    setNotice('');
    try {
      const { data: order } = await api.post('/on-domain/checkout');
      const loaded = await loadRazorpayCheckout();
      if (!loaded || !window.Razorpay) throw new Error('Secure checkout could not be loaded. Please retry.');
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.orderId,
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: '#1d4ed8' },
        modal: { ondismiss: () => setPaying(false) },
        handler: async response => {
          try {
            await api.post('/on-domain/checkout/verify', response);
            setPackageInfo(current => current ? { ...current, purchased: true } : current);
            setNotice('Payment verified. Your website package is now ready to download.');
            setPaying(false);
          } catch (verifyError) {
            setError(verifyError.response?.data?.message || 'Payment was received but could not be verified. Contact support before retrying.');
            setPaying(false);
          }
        },
      });
      checkout.on('payment.failed', event => {
        setError(event.error?.description || 'Payment failed. You can retry.');
        setPaying(false);
      });
      checkout.open();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Checkout could not be started.');
      setPaying(false);
    }
  };

  const downloadPackage = async () => {
    setDownloading(true);
    setError('');
    try {
      const response = await api.get('/on-domain/download', { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = packageInfo?.packageName || 'website-package.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The package download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <main className="min-h-screen w-full bg-white text-[#101828]"><div className="flex min-h-screen w-full flex-col bg-white"><OnDomainHeader user={user} onSignOut={signOut}/><div className="grid flex-1 place-items-center text-sm text-slate-500"><span className="inline-flex items-center gap-2"><LoaderCircle size={17} className="animate-spin"/>Loading On Domain package…</span></div></div></main>;
  const steps = packageInfo?.steps?.length ? packageInfo.steps : [
    'Review the sample website and package details.',
    'Pay securely using the checkout.',
    'Download the ZIP after payment is verified.',
    'Host the website with your domain provider.',
  ];
  return <main className="min-h-screen w-full bg-white text-[#101828]">
    <div className="flex min-h-screen w-full flex-col bg-white">
    <OnDomainHeader user={user} onSignOut={signOut}/>
    <div className="w-full flex-1 space-y-5 px-5 py-6 sm:px-8 lg:px-10">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold text-slate-900">{packageInfo?.title || 'On Domain Website Package'}</h1><p className="mt-1 text-sm text-slate-500">{packageInfo?.description || 'Preview the website package and see how purchase and delivery work.'}</p></div>
      <button type="button" onClick={() => navigate('/welcome')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Back to Welcome</button>
    </header>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"><span>{error}</span>{!packageInfo && <button type="button" onClick={loadPackage} className="shrink-0 rounded-lg bg-white px-3 py-2 font-semibold text-rose-800 shadow-sm hover:bg-rose-100">Retry package details</button>}</div>}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2"><Globe2 size={16} className="text-blue-700"/><div><p className="text-xs font-bold text-slate-800">{isQuickCommerce ? 'Quick Commerce website preview' : 'Website preview'}</p><p className="text-[10px] text-slate-500">{isQuickCommerce ? 'Your actual Quick Commerce storefront design · sample data' : 'A visual sample storefront · preview only'}</p></div></div>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-semibold text-amber-800">Preview only</span>
        </div>
        <div className="p-3 sm:p-5">
          {isQuickCommerce && <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500"><span className="min-w-0 truncate">Quick Commerce storefront · home page</span><span className="ml-2 shrink-0 rounded bg-white px-2 py-1 font-medium text-slate-600">Live preview</span></div>}
          {isQuickCommerce ? <div className="overflow-hidden rounded-xl border-[5px] border-[#202a39] bg-[#202a39] shadow-inner">
            <div className="flex h-10 items-center gap-2 bg-[#202a39] px-2.5">
              <span className="h-3 w-3 rounded-full bg-[#f45b57]"/>
              <span className="h-3 w-3 rounded-full bg-[#f5c344]"/>
              <span className="h-3 w-3 rounded-full bg-[#35c76f]"/>
              <div className="mx-1 flex h-6 min-w-0 flex-1 items-center justify-center rounded-md bg-[#354052] px-3 text-[11px] text-slate-300">
                <span className="truncate">{user?.selectedModuleSlug || 'preview'}.wepzo.in</span>
              </div>
              <Monitor size={15} className="shrink-0 text-slate-300" aria-label="Computer preview"/>
            </div>
            <iframe
              title="Quick Commerce storefront computer preview"
              src={quickCommercePreviewUrl.href}
              sandbox="allow-scripts allow-same-origin"
              scrolling="yes"
              className="block w-full overflow-hidden border-0 bg-white"
              style={{ height: '68vh', minHeight: '420px' }}
            />
          </div> : <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-center bg-[#17211d] px-3 py-2 text-center text-[8px] font-medium tracking-wide text-white sm:text-[9px]">COMPLIMENTARY SHIPPING ON ORDERS OVER ₹1,999 <span className="mx-2 text-white/40">|</span> NEW SEASON, NEW FAVOURITES</div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-7">
              <strong className="text-base font-black tracking-[0.12em] text-[#17211d] sm:text-lg">{user?.name ? `${user.name.split(' ')[0].toUpperCase()} & CO.` : 'EVERYDAY & CO.'}</strong>
              <nav aria-label="Sample storefront navigation" className="hidden items-center gap-5 text-[9px] font-semibold uppercase tracking-wider text-slate-600 md:flex"><span>New in</span><span>Women</span><span>Accessories</span><span>Our story</span></nav>
              <div className="flex items-center gap-3 text-slate-600"><span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-[9px] sm:inline-block">Search products</span><span aria-hidden="true" className="text-base">⌕</span><span aria-hidden="true" className="text-sm">♡</span><span aria-hidden="true" className="text-sm">♧</span></div>
            </div>
            <div className="relative grid min-h-[300px] items-end overflow-hidden bg-[#e7e1d8] sm:min-h-[390px]">
              <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=90" alt="Fashion collection storefront campaign" className="absolute inset-0 h-full w-full object-cover object-center" loading="lazy"/>
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent"/>
              <div className="relative z-10 max-w-lg p-6 text-white sm:p-10">
                <span className="text-[8px] font-bold uppercase tracking-[0.24em] text-white/85 sm:text-[10px]">A little more you</span>
                <h2 className="mt-3 text-3xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">Made for your<br/>everyday moments.</h2>
                <p className="mt-3 max-w-xs text-[10px] leading-5 text-white/85 sm:text-xs">Thoughtful pieces, timeless details, and new favourites to make your own.</p>
                <span className="mt-5 inline-flex items-center gap-2 bg-white px-4 py-2.5 text-[8px] font-bold uppercase tracking-wider text-slate-900 sm:text-[9px]">Discover the collection <ArrowRight size={13}/></span>
              </div>
              <span className="absolute bottom-4 right-5 rounded-full bg-white/90 px-3 py-1.5 text-[8px] font-semibold text-slate-800">01 — SPRING / SUMMER</span>
            </div>
            <div className="grid grid-cols-2 border-b border-slate-100 bg-[#fbfaf8] px-4 py-3 text-center text-[8px] font-medium text-slate-600 sm:grid-cols-4 sm:px-6">
              <span className="border-r border-slate-200 px-1">✦ Carefully selected quality</span><span className="px-1 sm:border-r sm:border-slate-200">↗ Easy, secure checkout</span><span className="border-r border-slate-200 px-1">♡ Made for everyday</span><span className="px-1">⌂ Thoughtful delivery</span>
            </div>
            <div className="px-4 py-6 sm:px-7 sm:py-8">
              <div className="mb-4 flex items-end justify-between"><div><p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#9a6945] sm:text-[9px]">The edit</p><h3 className="mt-1 text-lg font-semibold tracking-tight text-[#17211d] sm:text-xl">Customer favourites</h3></div><span className="text-[9px] font-semibold text-slate-600 sm:text-[10px]">VIEW ALL&nbsp; →</span></div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">{previewProducts.map(product => <article key={product.name} className="group min-w-0">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#f4f1ed]"><img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy"/><span className="absolute left-2 top-2 bg-white/95 px-2 py-1 text-[7px] font-bold tracking-wide text-slate-700">{product.label}</span><span className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-white text-sm text-slate-700 shadow-sm">♡</span></div>
                <div className="pt-2"><p className="truncate text-[9px] font-medium text-slate-800 sm:text-[10px]">{product.name}</p><p className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] font-semibold text-slate-900 sm:text-[10px]">{product.price}<span className="font-normal text-slate-400 line-through">{product.oldPrice}</span></p><span className="mt-2 block border border-slate-300 py-1.5 text-center text-[7px] font-bold tracking-wider text-slate-700 sm:text-[8px]">QUICK ADD&nbsp; +</span></div>
              </article>)}</div>
            </div>
            <div className="border-t border-slate-100 px-4 py-5 text-center sm:px-7"><p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#9a6945]">Get to know us</p><p className="mt-1 text-sm font-semibold text-[#17211d]">Good things, made for real life.</p><p className="mx-auto mt-1 max-w-md text-[9px] leading-5 text-slate-500">A sample brand story section. Replace these products, photos, colours, and words with your own when you build your website.</p></div>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-[10px] leading-5 text-slate-500"><ExternalLink size={13} className="mt-0.5 shrink-0"/>This is a realistic visual sample only. Navigation, search, wishlist, and add-to-cart controls are previews and do not connect to a real store or send data.</div>
          </>}
        </div>
      </section>

      <aside className="space-y-4 xl:sticky xl:top-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><span className="text-[9px] font-bold uppercase tracking-widest text-blue-700">Website source package</span><h2 className="mt-1 text-lg font-bold text-slate-900">{packageInfo?.moduleName || 'Website'} · Own Domain</h2></div><span className="rounded-xl bg-blue-50 p-2.5 text-blue-800"><Archive size={19}/></span></div>
          <p className="mt-3 text-xs leading-5 text-slate-600">{packageInfo?.description || 'Get the ready-to-host website source as a ZIP package. The exact package and price are configured by Main Admin for your module.'}</p>
          <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-medium text-slate-500">One-time package price</p><p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{packageInfo ? amountText(packageInfo.price) : 'Set by admin'}</p><p className="mt-1 text-[9px] text-slate-500">Secure payment · ZIP unlocks only after verified payment</p></div>
          {packageInfo?.purchased
            ? <button type="button" onClick={downloadPackage} disabled={downloading || !packageInfo.hasPackage} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><Download size={15}/>{downloading ? 'Preparing download…' : 'Download Website ZIP'}</button>
            : <button type="button" onClick={startCheckout} disabled={!packageInfo || paying || !packageInfo.enabled || !packageInfo.hasPackage || Number(packageInfo.price) <= 0} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-3.5 text-xs font-bold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">{paying ? 'Opening secure checkout…' : packageInfo ? <>Pay {amountText(packageInfo.price)} & Get ZIP <ArrowRight size={15}/></> : 'Package purchase unavailable'}</button>}
          {!packageInfo?.enabled || !packageInfo?.hasPackage
            ? <p className="mt-2 text-center text-[10px] text-amber-700">This package is not ready for purchase yet. Please check again later.</p>
            : <p className="mt-2 flex items-center justify-center gap-1 text-center text-[9px] text-slate-400"><LockKeyhole size={11}/>Your download is enabled only after payment verification.</p>}
          {packageInfo?.purchased && <p className="mt-2 flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-700"><Check size={13}/>Payment verified · {packageInfo.packageName}</p>}
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-800">Want a website subscription instead?</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">Continue to the website builder to preview your store and choose an available subscription plan.</p>
            <button type="button" onClick={() => navigate('/website-builder')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800 hover:bg-blue-100">View website plans <ArrowRight size={14}/></button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">How it works</h2>
          <ol className="mt-3 space-y-3">{steps.map((step, index) => <li key={`${step}-${index}`} className="flex gap-2.5 text-xs leading-5 text-slate-600"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-50 text-[9px] font-bold text-blue-800">{index + 1}</span>{step}</li>)}</ol>
          <div className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-3 text-[10px] leading-5 text-slate-500"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-700"/>The ZIP is delivered privately to your account. It is never made available publicly.</div>
        </section>
      </aside>
    </div>
    </div>
  </div>
  </main>;
}
