import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, Globe2, Headphones, LoaderCircle, LogOut, Maximize2, Monitor, ShieldCheck, UserCircle2, X } from 'lucide-react';
import api from '../api/axios';
import { useAuthStore, useBuilderStore } from '../store/useStore';
import { getAdminModuleKey } from '../constants/adminModules';
import { clearPaymentReturnDetails, launchPaymentCheckout, paymentReturnDetails, paymentReturnUrl } from '../utils/paymentCheckout';
import { ecommercePreviewBase } from '../utils/ecommercePreviewUrl';

const amountText = value => `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;

function OnDomainHeader({ user, onSignOut }) {
  return <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 px-5 shadow-sm backdrop-blur sm:px-8">
    <div className="text-[22px] font-black tracking-[-1.3px] text-[#111827]">{"\u25E2"}<span className="text-blue-900">WEP</span><span className="text-orange-500">ZO</span></div>
    <div className="flex items-center gap-3 text-slate-700 sm:gap-6">
      <span className="hidden items-center gap-1.5 text-[11px] font-medium sm:inline-flex"><Headphones size={14}/>Need Help?</span>
      <span className="flex items-center gap-1.5 text-xs font-medium"><UserCircle2 size={20} className="text-blue-600"/>{user?.name?.split(' ')[0] || 'ADK'}<ChevronDown size={12} className="text-slate-500" aria-hidden="true"/></span>
      <button type="button" onClick={onSignOut} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Sign out" title="Sign out"><LogOut size={16}/></button>
    </div>
  </header>;
}

export default function OnDomainPage() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const resetBuilder = useBuilderStore(state => state.reset);
  const navigate = useNavigate();
  const [packageInfo, setPackageInfo] = useState(null);
  const [mainWebsite, setMainWebsite] = useState(null);
  const [tenantWebsite, setTenantWebsite] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [domainName, setDomainName] = useState('');
  const [domainAvailability, setDomainAvailability] = useState(null);
  const [subscriptionPlanId, setSubscriptionPlanId] = useState('');
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [hostingPaying, setHostingPaying] = useState(false);
  const [hostingRetrying, setHostingRetrying] = useState(false);
  const [freeHostingStarting, setFreeHostingStarting] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [desktopPreviewScale, setDesktopPreviewScale] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!previewExpanded) return undefined;
    const previousOverflow = document.body.style.overflow;
    const updateScale = () => setDesktopPreviewScale(Math.max(0.1, Math.min(
      1,
      (window.innerWidth - 40) / 1366,
      (window.innerHeight - 56) / 812,
    )));
    const closeOnEscape = event => {
      if (event.key === 'Escape') setPreviewExpanded(false);
    };
    document.body.style.overflow = 'hidden';
    updateScale();
    window.addEventListener('resize', updateScale);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [previewExpanded]);

  const loadPackage = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/on-domain/package');
      setPackageInfo(data);
      setSubscriptionPlanId(current => data.subscriptionPlans?.some(plan => String(plan.id) === String(current))
        ? current
        : data.subscriptionPlans?.[0]?.id || '');
      const tenant = data.tenantWebsite;
      if (tenant?.status === 'published' && !data.websiteServiceEnded) {
        setTenantWebsite(tenant);
        if (tenant.domain?.type === 'custom' && tenant.domain.fullDomain) setDomainName(current => current || tenant.domain.fullDomain);
      } else {
        setTenantWebsite(null);
      }
      return data;
    } catch (requestError) {
      setError(requestError.response?.data?.message
        || (requestError.response
          ? `On Domain package details could not be loaded (server returned ${requestError.response.status}).`
          : 'Could not reach the website server. Check your connection and try again.'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const loadPage = async () => {
      const packageDetails = await loadPackage();
      if (!active) return;
      if (!packageDetails?.moduleId) {
        setPreviewError('Website module could not be identified for this preview.');
        setPreviewLoading(false);
        return;
      }
      const tenant = packageDetails.tenantWebsite;
      if (tenant?.status === 'published' && !packageDetails.websiteServiceEnded) {
        if (active) { setTenantWebsite(tenant); setPreviewLoading(false); }
        return;
      }
      try {
        const { data } = await api.get('/public/main-admin-website-preview', {
          params: { moduleId: packageDetails.moduleId, moduleSlug: packageDetails.moduleSlug },
        });
        if (active) setMainWebsite(data);
      } catch (requestError) {
        if (active) setPreviewError(requestError.response?.data?.message || 'Website preview could not be loaded.');
      } finally {
        if (active) setPreviewLoading(false);
      }
    };
    loadPage();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const { purchaseId, gateway, flow } = paymentReturnDetails();
    if (!purchaseId || !gateway || !['hosting', 'subscription', 'package'].includes(flow)) return;
    const endpoint = flow === 'subscription'
      ? '/on-domain/subscription-checkout/verify'
      : flow === 'hosting'
        ? '/on-domain/hosting-checkout/verify'
        : '/on-domain/checkout/verify';
    setHostingPaying(true);
    setError('');
    api.post(endpoint, { purchaseId })
      .then(async ({ data }) => {
        const { data: refreshed } = await api.get('/on-domain/package');
        setPackageInfo(refreshed);
        setTenantWebsite(refreshed.tenantWebsite || null);
        if (data.domainName) setDomainName(data.domainName);
        if (data.hosting?.status === 'active') setNotice(`Payment verified. ${data.domainName || 'Your domain'} is hosted successfully.`);
        else if (data.purchased) setNotice('Payment verified successfully.');
        else setError(data.hosting?.message || 'Payment was verified, but hosting setup needs attention.');
      })
      .catch(requestError => setError(requestError.response?.data?.message || requestError.message || 'Payment status could not be verified.'))
      .finally(() => {
        clearPaymentReturnDetails();
        setHostingPaying(false);
      });
  }, []);

  const previewWebsite = tenantWebsite || mainWebsite;
  const previewIsTenant = Boolean(tenantWebsite);
  const normalizedDomainInput = domainName.trim().toLowerCase().replace(/^https?:\/\//, '').split(/[/?#]/)[0].replace(/\.$/, '');
  const hostedDomain = String(tenantWebsite?.hosting?.domain || tenantWebsite?.domain?.fullDomain || '').toLowerCase();
  const hostingPaymentAlreadyVerified = Boolean(packageInfo?.domainHostingPurchased && tenantWebsite?.hosting?.billingMode !== 'free' && hostedDomain && hostedDomain === normalizedDomainInput);
  const freeHostingAlreadyRequested = Boolean(tenantWebsite?.hosting?.billingMode === 'free' && hostedDomain && hostedDomain === normalizedDomainInput);
  const domainCheckPassed = Boolean(domainName.trim() && domainAvailability?.name === domainName.trim() && domainAvailability.available);
  const selectedSubscriptionPlan = packageInfo?.subscriptionPlans?.find(plan => String(plan.id) === String(subscriptionPlanId)) || packageInfo?.subscriptionPlans?.[0];
  const websitePreviewUrl = (() => {
    if (!previewWebsite) return '';
    const moduleKey = getAdminModuleKey({ slug: previewWebsite.websiteModuleSlug, name: previewWebsite.moduleName });
    const previewId = previewIsTenant ? previewWebsite.id : previewWebsite.websiteId;
    const configurePreview = (url, moduleParam = 'websiteModuleId') => {
      if (previewId) url.searchParams.set('websiteId', previewId);
      if (previewWebsite.websiteModuleId) {
        url.searchParams.set(moduleParam, previewWebsite.websiteModuleId);
        if (moduleParam !== 'websiteModuleId') url.searchParams.set('websiteModuleId', previewWebsite.websiteModuleId);
      }
      if (previewIsTenant) {
        url.searchParams.set('published', '1');
        url.searchParams.set('components', (previewWebsite.components || []).join(','));
      } else {
        url.searchParams.set('adminPreview', '1');
      }
      return url.href;
    };
    if (moduleKey === 'e-commerce') {
      const baseUrl = ecommercePreviewBase(previewWebsite, { mainAdmin: !previewIsTenant });
      return baseUrl ? configurePreview(new URL(baseUrl, window.location.origin), 'moduleId') : '';
    }
    if (moduleKey === 'store-single') {
      return configurePreview(new URL(import.meta.env.VITE_STORE_SINGLE_PREVIEW_URL || 'http://localhost:5175/', window.location.origin));
    }
    if (moduleKey === 'quick-commerce') {
      return configurePreview(new URL(import.meta.env.VITE_QC_PREVIEW_URL || 'http://localhost:3001/', window.location.origin));
    }
    if (!previewId) return '';
    return new URL(`/published-websites/${encodeURIComponent(previewId)}`, window.location.origin).href;
  })();
  const signOut = () => {
    resetBuilder();
    logout();
    navigate('/login', { replace: true });
  };

  const checkDomainAvailability = async () => {
    const name = domainName.trim();
    const websiteId = packageInfo?.tenantWebsite?.id || tenantWebsite?.id;
    if (!name || !websiteId) {
      setDomainAvailability(null);
      return;
    }
    setCheckingDomain(true);
    try {
      const { data } = await api.get('/domains/availability', {
        params: { name, type: 'custom', websiteId },
      });
      if (domainName.trim() === name) setDomainAvailability({ ...data, name });
    } catch (requestError) {
      if (domainName.trim() === name) setDomainAvailability({ available: false, message: requestError.response?.data?.message || 'Domain availability could not be checked.', name });
    } finally {
      setCheckingDomain(false);
    }
  };

  const refreshTenantWebsite = async () => {
    const { data } = await api.get('/on-domain/package');
    setPackageInfo(data);
    setTenantWebsite(data.tenantWebsite || null);
    return data;
  };

  const startHostingCheckout = async () => {
    setHostingPaying(true);
    setError('');
    setNotice('');
    try {
      const { data: order } = await api.post('/on-domain/hosting-checkout', { domainName: domainName.trim(), returnUrl: paymentReturnUrl() });
      await launchPaymentCheckout(order, {
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
        onDismiss: () => setHostingPaying(false),
        onFailure: paymentError => { setError(paymentError.message || 'Payment failed. You can retry.'); setHostingPaying(false); },
        onVerified: async response => {
          const { data: result } = await api.post('/on-domain/hosting-checkout/verify', response);
          await refreshTenantWebsite();
          setDomainName(result.domainName || order.domainName || domainName.trim());
          setDomainAvailability(null);
          if (result.hosting?.status === 'active') setNotice(`Payment verified. ${result.domainName} is now hosted for tenant ${result.websiteId}.`);
          else setError(`Payment verified, but hosting setup needs attention: ${result.hosting?.message || 'Please check DNS settings and retry hosting.'}`);
          setHostingPaying(false);
          return result;
        },
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Domain hosting checkout could not be started.');
      setHostingPaying(false);
    }
  };

  const startFreeHosting = async () => {
    if (!domainAvailability?.available || domainAvailability.name !== domainName.trim()) return;
    setFreeHostingStarting(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.post('/on-domain/free-hosting', { domainName: domainName.trim() });
      await refreshTenantWebsite();
      setDomainName(data.domainName || domainName.trim());
      setDomainAvailability(null);
      if (data.hosting?.status === 'active') setNotice(`Free hosting is active at ${data.domainName} for tenant ${data.websiteId}.`);
      else setError(data.hosting?.message || 'Free hosting setup needs attention. Check DNS and retry.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Free hosting could not be started.');
    } finally {
      setFreeHostingStarting(false);
    }
  };

  const startSubscriptionCheckout = async () => {
    if (!subscriptionPlanId) return;
    setHostingPaying(true);
    setError('');
    setNotice('');
    try {
      const { data: order } = await api.post('/on-domain/subscription-checkout', {
        planId: subscriptionPlanId,
        domainName: domainName.trim(),
        returnUrl: paymentReturnUrl(),
      });
      await launchPaymentCheckout(order, {
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
        onDismiss: () => setHostingPaying(false),
        onFailure: paymentError => { setError(paymentError.message || 'Payment failed. You can retry.'); setHostingPaying(false); },
        onVerified: async response => {
          const { data: result } = await api.post('/on-domain/subscription-checkout/verify', response);
          await refreshTenantWebsite();
          setDomainName(result.domainName || order.domainName || domainName.trim());
          setDomainAvailability(null);
          if (result.hosting?.status === 'active') {
            const expiryText = result.hosting.subscriptionExpiresAt ? new Date(result.hosting.subscriptionExpiresAt).toLocaleDateString() : '';
            setNotice(`${order.planName} subscription activated for ${result.domainName}${expiryText ? ` through ${expiryText}` : ''}.`);
          } else setError(`Payment verified, but hosting setup needs attention: ${result.hosting?.message || 'Check DNS settings and retry hosting.'}`);
          setHostingPaying(false);
          return result;
        },
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Subscription checkout could not be started.');
      setHostingPaying(false);
    }
  };

  const retryHosting = async () => {
    if (!tenantWebsite?.id) return;
    setHostingRetrying(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.post(`/websites/${encodeURIComponent(tenantWebsite.id)}/deploy`);
      setTenantWebsite(current => current ? { ...current, hosting: data.hosting, domain: data.domain } : current);
      await refreshTenantWebsite();
      setNotice(`Hosting is active at https://${data.domain?.fullDomain || tenantWebsite.domain?.fullDomain}.`);
    } catch (requestError) {
      try { await refreshTenantWebsite(); } catch { /* Keep the deployment error visible if refresh also fails. */ }
      setError(requestError.response?.data?.message || 'Hosting could not start. Check the domain DNS and retry.');
    } finally {
      setHostingRetrying(false);
    }
  };

  if (loading) return <main className="min-h-screen w-full bg-white text-[#101828]"><div className="flex min-h-screen w-full flex-col bg-white"><OnDomainHeader user={user} onSignOut={signOut}/><div className="grid flex-1 place-items-center text-sm text-slate-500"><span className="inline-flex items-center gap-2"><LoaderCircle size={17} className="animate-spin"/>Loading On Domain package...</span></div></div></main>;
  const steps = packageInfo?.steps?.length ? packageInfo.steps : [
    'Enter a custom domain that you own and check that it is available.',
    packageInfo?.freeEnabled ? 'Start free hosting to activate the free website plan and publish your tenant website.' : packageInfo?.subscriptionEnabled ? 'Choose a subscription plan or use the one-time payment option.' : 'Pay securely using the checkout.',
    'WEPZO links the domain to your tenant website ID and starts hosting for the selected plan.',
    'Point the domain DNS to WEPZO hosting so SSL can be activated.',
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
          <div className="flex items-center gap-2"><Globe2 size={16} className="text-blue-700"/><div><p className="text-xs font-bold text-slate-800">{previewIsTenant ? (tenantWebsite.domain?.fullDomain || `Tenant ${tenantWebsite.id}`) + " - tenant website" : "Main Admin website - full preview"}</p><p className="text-[10px] text-slate-500">{previewIsTenant ? "Showing your published website (ID: " + tenantWebsite.id + ")." : mainWebsite?.modulePreview ? "Showing the complete " + (mainWebsite.moduleName || mainWebsite.websiteModuleSlug) + " storefront; no separate published site was found." : "Preview the complete Main Admin website and its pages."}</p></div></div>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-semibold text-amber-800">{previewIsTenant ? "Tenant website" : "Preview only"}</span>
        </div>
        <div className="p-3 sm:p-5">
          {previewLoading ? <div className="grid min-h-[420px] place-items-center rounded-xl bg-slate-50 text-sm text-slate-500"><span className="inline-flex items-center gap-2"><LoaderCircle size={16} className="animate-spin"/>Loading website preview...</span></div>
          : websitePreviewUrl ? <div className="overflow-hidden rounded-xl border-[5px] border-[#202a39] bg-[#202a39] shadow-inner">
            <div className="flex h-10 items-center gap-2 bg-[#202a39] px-2.5">
              <span className="h-3 w-3 rounded-full bg-[#f45b57]"/>
              <span className="h-3 w-3 rounded-full bg-[#f5c344]"/>
              <span className="h-3 w-3 rounded-full bg-[#35c76f]"/>
              <div className="mx-1 flex h-6 min-w-0 flex-1 items-center justify-center rounded-md bg-[#354052] px-3 text-[11px] text-slate-300">
                <span className="truncate">{previewIsTenant ? (tenantWebsite.domain?.fullDomain || `Tenant ${tenantWebsite.id}`) : "Main Admin website full preview"}</span>
              </div>
              <Monitor size={15} className="shrink-0 text-slate-300" aria-label="Computer preview"/>
              <button type="button" onClick={() => setPreviewExpanded(true)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Open full desktop preview" title="Open full desktop view"><Maximize2 size={15}/></button>
            </div>
            <iframe
              title={previewIsTenant ? `Tenant website ${tenantWebsite.id} preview` : 'Main Admin website full preview'}
              src={websitePreviewUrl}
              sandbox="allow-scripts allow-same-origin"
              scrolling="yes"
              className="block w-full overflow-hidden border-0 bg-white"
              style={{ height: '68vh', minHeight: '420px' }}
            />
          </div> : <div role={previewError ? 'alert' : undefined} className="grid min-h-[420px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">{previewError || 'The website preview is not available.'}</div>}
        </div>
      </section>

      <aside className="space-y-4 xl:sticky xl:top-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Globe2 size={19}/></span><div><h2 className="text-sm font-bold text-slate-900">Connect &amp; host your domain</h2><p className="mt-1 text-[10px] leading-4 text-slate-500">Check your domain first. Free hosting will publish your tenant site on its free plan, then deploy it by tenant ID.</p></div></div>
          <label className="mt-4 block text-xs font-semibold text-slate-700">Custom domain
            <input
              type="text"
              value={domainName}
              onChange={event => { setDomainName(event.target.value); setDomainAvailability(null); }}
              placeholder="yourdomain.com"
              autoComplete="url"
              readOnly={tenantWebsite?.hosting?.status === 'active'}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50"
            />
          </label>
          <p className="mt-2 text-[10px] leading-4 text-slate-500">Use a domain you own. Point its DNS to WEPZO hosting before setup so the domain and SSL can go live.</p>
          <button type="button" onClick={checkDomainAvailability} disabled={!domainName.trim() || !packageInfo?.tenantWebsite?.id || checkingDomain} className="mt-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-[10px] font-bold text-blue-800 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">{checkingDomain ? 'Checking domain...' : 'Check domain'}</button>
          {!packageInfo?.tenantWebsite && <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-4 text-amber-900">No tenant website is linked to this account. On Domain connects a custom domain to an existing tenant website; subdomain setup is separate.</p>}
          {checkingDomain && <p className="mt-2 text-[10px] text-slate-500">Checking domain...</p>}
          {!checkingDomain && domainAvailability?.name === domainName.trim() && <p className={`mt-2 text-[10px] font-medium ${domainAvailability.available ? 'text-emerald-700' : 'text-rose-700'}`}>{domainAvailability.available ? `${domainAvailability.fullDomain} is available.` : domainAvailability.message}</p>}
          <div className="mt-4 rounded-xl bg-slate-50 p-3.5">
            <p className="text-[10px] font-semibold text-slate-600">Active On Domain options</p>
            {!packageInfo?.enabled
              ? <p className="mt-2 text-xs text-slate-600">Domain hosting is not enabled for this module.</p>
              : <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {packageInfo?.freeEnabled && <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2.5"><p className="text-[10px] font-medium text-slate-500">Free hosting</p><p className="mt-1 text-sm font-bold text-emerald-700">Free</p></div>}
                {packageInfo?.paymentEnabled && <div className="rounded-lg border border-blue-200 bg-white px-3 py-2.5"><p className="text-[10px] font-medium text-slate-500">One-time hosting</p><p className="mt-1 text-sm font-bold text-slate-900">{amountText(packageInfo.price)}</p></div>}
                {packageInfo?.subscriptionEnabled && <div className="rounded-lg border border-violet-200 bg-white px-3 py-2.5 sm:col-span-2"><p className="text-[10px] font-medium text-slate-500">Hosting subscriptions</p><p className="mt-1 text-sm font-bold text-slate-900">{packageInfo.subscriptionPlans?.length || 0} active plan{packageInfo.subscriptionPlans?.length === 1 ? '' : 's'}</p></div>}
                {!packageInfo?.freeEnabled && !packageInfo?.paymentEnabled && !packageInfo?.subscriptionEnabled && <p className="text-xs text-slate-600">No hosting option is active.</p>}
              </div>}
          </div>
          {tenantWebsite?.hosting?.status === 'active' ? <div className="mt-4 space-y-2"><p className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700"><Check size={13}/>Hosting active · SSL {tenantWebsite.hosting.sslStatus || 'active'}</p><a href={tenantWebsite.hosting.url || `https://${tenantWebsite.hosting.domain}`} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-xs font-bold text-white hover:bg-emerald-700">Open hosted website <ArrowRight size={15}/></a></div>
            : freeHostingAlreadyRequested ? <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2.5 text-center text-[10px] leading-4 text-blue-800">Free hosting was requested for this domain. Retry below if the server setup needs attention.</p>
            : hostingPaymentAlreadyVerified ? <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2.5 text-center text-[10px] leading-4 text-blue-800">Payment is already verified for this domain. Retry hosting below after fixing DNS or server setup.</p>
            : packageInfo?.freeEnabled ? <button type="button" onClick={startFreeHosting} disabled={!packageInfo?.enabled || !packageInfo?.tenantWebsite?.id || packageInfo?.websiteServiceEnded || !domainCheckPassed || freeHostingStarting || hostingPaying || hostingRetrying} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{freeHostingStarting ? 'Starting free hosting...' : <>Start free hosting <ArrowRight size={15}/></>}</button>
            : packageInfo?.paymentEnabled ? <button type="button" onClick={startHostingCheckout} disabled={!packageInfo?.enabled || !tenantWebsite || tenantWebsite.status !== 'published' || packageInfo?.websiteServiceEnded || hostingPaying || hostingRetrying || !domainCheckPassed || Number(packageInfo?.price) <= 0} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-3.5 text-xs font-bold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">{hostingPaying ? 'Payment / hosting in progress...' : <>Pay {amountText(packageInfo?.price)} &amp; Host domain <ArrowRight size={15}/></>}</button>
            : packageInfo?.subscriptionEnabled ? <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2.5 text-center text-[10px] leading-4 text-blue-800">Choose a hosting subscription plan below to continue.</p>
            : <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-center text-[10px] leading-4 text-slate-600">Custom-domain hosting is not enabled for this module.</p>}
          {packageInfo?.freeEnabled && tenantWebsite && !packageInfo?.websiteServiceEnded && <p className="mt-2 text-center text-[10px] text-amber-700">{domainCheckPassed ? 'Domain is available. Start free hosting to connect it to your tenant website.' : 'Enter your domain and check availability to continue with free hosting.'}</p>}
          {tenantWebsite?.hosting?.status === 'failed' && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="text-[10px] leading-4 text-amber-900">{tenantWebsite.hosting.billingMode === 'free' ? 'Free website plan is active, but VPS hosting could not start.' : 'Payment is verified, but VPS hosting could not start.'} {tenantWebsite.hosting.message === 'spawn sudo ENOENT' ? 'Configure the Ubuntu VPS hosting helper, then retry.' : tenantWebsite.hosting.message || 'Check DNS settings and retry.'}</p><button type="button" onClick={retryHosting} disabled={hostingRetrying} className="mt-2 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-[10px] font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50">{hostingRetrying ? 'Retrying hosting...' : 'Retry hosting for this tenant'}</button></div>}
          {tenantWebsite?.hosting?.status === 'deploying' && <p className="mt-2 text-center text-[10px] text-blue-700">Hosting deployment is in progress for tenant {tenantWebsite.id}.</p>}

        {packageInfo?.enabled && packageInfo?.subscriptionEnabled && packageInfo.subscriptionPlans?.length > 0 && <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">Choose a hosting subscription</h2><p className="mt-1 text-[10px] leading-4 text-slate-500">Select a plan. Price and hosting duration are shown for each option.</p></div><span className="rounded-xl bg-blue-50 p-2.5 text-blue-800"><Check size={18}/></span></div>
          {tenantWebsite?.hosting?.billingMode === 'subscription' && tenantWebsite.hosting.subscriptionExpiresAt && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-medium text-emerald-800">Current plan: {tenantWebsite.hosting.subscriptionPlanName || 'Subscription'} · expires {new Date(tenantWebsite.hosting.subscriptionExpiresAt).toLocaleDateString()}</p>}
          <div className="mt-3 space-y-2" role="radiogroup" aria-label="On Domain subscription plan">
            {packageInfo.subscriptionPlans.map(plan => {
              const selected = String(plan.id) === String(subscriptionPlanId);
              const durationLabel = `${plan.durationValue} ${plan.durationUnit}${Number(plan.durationValue) === 1 ? '' : 's'}`;
              return <label key={plan.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="on-domain-subscription-plan" checked={selected} onChange={() => setSubscriptionPlanId(plan.id)} className="mt-1 accent-blue-700"/>
                <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><b className="text-xs text-slate-900">{plan.name}</b><b className="text-sm text-slate-900">{amountText(plan.price)}</b></span><span className="mt-1 block text-[10px] font-medium text-blue-800">{durationLabel}</span>{plan.description && <span className="mt-1 block text-[10px] leading-4 text-slate-500">{plan.description}</span>}</span>
              </label>;
            })}
          </div>
          <button type="button" onClick={startSubscriptionCheckout} disabled={!packageInfo.enabled || !tenantWebsite || tenantWebsite.status !== 'published' || packageInfo.websiteServiceEnded || !selectedSubscriptionPlan || hostingPaying || freeHostingStarting || hostingRetrying || !domainName.trim()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-3.5 text-xs font-bold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">{hostingPaying ? 'Opening secure checkout...' : <>Pay {selectedSubscriptionPlan ? amountText(selectedSubscriptionPlan.price) : ''} &amp; Host domain <ArrowRight size={15}/></>}</button>
          {!tenantWebsite && <p className="mt-2 text-center text-[10px] text-amber-700">Publish your tenant website before subscribing to domain hosting.</p>}
        </div>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">How it works</h2>
          <ol className="mt-3 space-y-3">{steps.map((step, index) => <li key={`${step}-${index}`} className="flex gap-2.5 text-xs leading-5 text-slate-600"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-50 text-[9px] font-bold text-blue-800">{index + 1}</span>{step}</li>)}</ol>
          <div className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-3 text-[10px] leading-5 text-slate-500"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-700"/>WEPZO connects your tenant website to your domain and starts SSL after DNS is set up.</div>
        </section>
      </aside>
    </div>
    {previewExpanded && websitePreviewUrl && <div className="fixed inset-0 z-[100] grid place-items-center overflow-auto bg-slate-950/90 p-3 sm:p-5" role="dialog" aria-modal="true" aria-label="Full desktop website preview">
      <div className="relative overflow-hidden rounded-xl border border-slate-600 bg-[#202a39] shadow-2xl" style={{ width: 1366 * desktopPreviewScale, height: 812 * desktopPreviewScale }}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: 1366, height: 812, transform: `scale(${desktopPreviewScale})` }}>
          <div className="flex h-11 items-center gap-2 bg-[#202a39] px-3">
            <span className="h-3 w-3 rounded-full bg-[#f45b57]"/>
            <span className="h-3 w-3 rounded-full bg-[#f5c344]"/>
            <span className="h-3 w-3 rounded-full bg-[#35c76f]"/>
            <div className="mx-2 flex h-7 min-w-0 flex-1 items-center justify-center rounded-md bg-[#354052] px-3 text-xs text-slate-200"><span className="truncate">{previewIsTenant ? (tenantWebsite.domain?.fullDomain || `Tenant ${tenantWebsite.id}`) : 'Main Admin website'} · Desktop view · 1366px</span></div>
            <button type="button" onClick={() => setPreviewExpanded(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-200 hover:bg-white/10 hover:text-white" aria-label="Close full desktop preview" title="Close desktop view"><X size={18}/></button>
          </div>
          <iframe title={previewIsTenant ? `Desktop preview of ${tenantWebsite.id}` : 'Main Admin desktop website preview'} src={websitePreviewUrl} sandbox="allow-scripts allow-same-origin" scrolling="yes" className="block border-0 bg-white" style={{ width: 1366, height: 768 }}/>
        </div>
      </div>
    </div>}
    </div>
  </div>
  </main>;
}
