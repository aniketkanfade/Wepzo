import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Trash2, Monitor, Globe, Download, ShoppingBag, ExternalLink,
  Megaphone, Layout, ChevronRight, IndianRupee, LogOut
} from 'lucide-react';
import api from '../../../api/axios';
import { useAuthStore, useBuilderStore, useModuleStore } from '../../../store/useStore';
import { getAdminModuleKey } from '../../../constants/adminModules';

const MODULES = [
  { type: 'quick-commerce', name: 'Quick Commerce', icon: ShoppingBag, color: 'bg-emerald-600', desc: 'Build your Quick Commerce storefront' },
  { type: 'e-commerce', name: 'E-Commerce', icon: ShoppingBag, color: 'bg-orange-600', desc: 'Build your E-Commerce storefront' },
  { type: 'store-single', name: 'Store Singlepage Web', icon: Layout, color: 'bg-indigo-600', desc: 'Build a single-page store website' },
  { type: 'marketing', name: 'Marketing', icon: Megaphone, color: 'bg-purple-500', desc: 'Landing pages, newsletters & promotions' },
  { type: 'general', name: 'General', icon: Layout, color: 'bg-green-500', desc: 'Basic website with header, footer & contact' },
];

const normalizeModuleType = (moduleType) => {
  const value = String(moduleType || '').trim().toLowerCase().replace(/_/g, '-');
  if (['ecommerce', 'e-commerce', 'quick-commerce', 'quick_commerce', 'qcommerce'].includes(value)) return 'ecommerce';
  if (['marketing', 'promotion', 'promotions'].includes(value)) return 'marketing';
  if (['general', 'information-web', 'information_web', 'website', 'web'].includes(value)) return 'general';
  return value || 'ecommerce';
};

const displayModuleName = (moduleType, moduleKey) => {
  const value = normalizeModuleType(moduleType);
  if (moduleKey === 'information-web') return 'Information Web';
  if (moduleKey === 'store-single') return 'Store Singlepage Web';
  if (value === 'ecommerce') return moduleKey === 'e-commerce' ? 'E-Commerce' : 'Quick Commerce';
  if (value === 'marketing') return 'Marketing';
  if (value === 'general') return 'General';
  return value ? value.replace(/[-_]/g, ' ') : 'Quick Commerce';
};

const getComponentGroup = component => component?.group || (
  ['header', 'navbar'].includes(component?.type) ? 'Header' : component?.type === 'footer' ? 'Footer' : 'Storefront'
);

const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

function createModulePreviewDocument(moduleName, selectedComponents) {
  const blocks = [...selectedComponents]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map(entry => {
      const component = entry.componentId && typeof entry.componentId === 'object' ? entry.componentId : entry;
      if (component.htmlTemplate) return component.htmlTemplate;
      return `<section class="component-card"><span>${escapeHtml(component.type || component.group || 'Website component')}</span><h2>${escapeHtml(component.name || 'Website component')}</h2><p>${escapeHtml(component.description || 'Add a description in Main Admin to customize this component preview.')}</p></section>`;
    }).join('\n');
  const content = blocks || `<section class="empty"><h1>${escapeHtml(moduleName)} website preview</h1><p>Add components in the designer panel to build this page.</p></section>`;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(moduleName)} preview</title><style>*{box-sizing:border-box}body{margin:0;background:#f8fafc;color:#172033;font:15px/1.5 Arial,sans-serif}.preview{max-width:1120px;min-height:100vh;margin:auto;padding:24px}.preview-label{margin:0 0 18px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}.component-card{margin:16px 0;padding:24px;border:1px solid #e2e8f0;border-radius:14px;background:white;box-shadow:0 3px 12px #0f172a0a}.component-card span{color:#ea580c;font-size:11px;font-weight:700;text-transform:uppercase}.component-card h2{margin:8px 0;font-size:24px}.component-card p{margin:0;color:#64748b}.empty{display:grid;min-height:440px;place-content:center;text-align:center}.empty h1{margin:0 0 8px;font-size:28px}.empty p{color:#64748b}@media(max-width:640px){.preview{padding:16px}.component-card{padding:18px}}</style></head><body><main class="preview"><p class="preview-label">${escapeHtml(moduleName)} · Website preview</p>${content}</main></body></html>`;
}

const LEGACY_PREVIEW_COMPONENTS = {
  'basic-header': ['quick-commerce-header'],
  'product-grid': ['quick-commerce-product-grid'],
  'shopping-cart': ['quick-commerce-cart'],
  footer: ['quick-commerce-footer'],
  'quick-commerce-favorites-cart': ['quick-commerce-favorites', 'quick-commerce-cart'],
};

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function WebsiteBuilder() {
  const location = useLocation();
  const navigate = useNavigate();
  const signupStartedRef = useRef(false);
  const user = useAuthStore(state => state.user);
  const activeModule = useModuleStore(state => state.activeModule);
  const logout = useAuthStore(state => state.logout);
  const resetBuilder = useBuilderStore(state => state.reset);
  const isWebsiteUser = user?.role === 'website_user';
  const selectedAccountModule = String(user?.selectedModuleSlug || '').toLowerCase();
  const accountModuleType = normalizeModuleType(user?.selectedModuleType || user?.selectedModuleSlug || selectedAccountModule);
  const adminModuleKey = getAdminModuleKey(activeModule);
  const previewModuleKey = isWebsiteUser
    ? getAdminModuleKey({ slug: selectedAccountModule, name: user?.selectedModuleName })
    : adminModuleKey;
  const displayModuleKey = previewModuleKey;
  const adminBuilderType = adminModuleKey === 'information-web' ? 'general' : adminModuleKey === 'marketing' ? 'marketing' : adminModuleKey;
  const {
    website, selectedModule, components, totalAmount, domain,
    setWebsite, setModule, addComponent, removeComponent, setDomain
  } = useBuilderStore();

  const [step, setStep] = useState(isWebsiteUser ? 'design' : 'module');
  const [availableComponents, setAvailableComponents] = useState([]);
  const [domainName, setDomainName] = useState('');
  const [domainType, setDomainType] = useState('subdomain');
  const [baseDomain, setBaseDomain] = useState('wepzo.in');
  const [domainError, setDomainError] = useState('');
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [componentError, setComponentError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [websiteName, setWebsiteName] = useState('My Website');
  const ecommercePreviewRef = useRef(null);
  const hasPurchasedWebsite = !!website && (website.purchase?.status === 'paid' || (website.status === 'published' && !website.purchase));
  const isEditOnly = isWebsiteUser && hasPurchasedWebsite;
  const steps = isWebsiteUser
    ? (isEditOnly ? ['design'] : ['design', 'domain', 'payment'])
    : ['module', 'design', 'domain', 'publish'];
  const selectedPlan = subscriptionPlans.find(plan => String(plan._id) === String(selectedPlanId)) || subscriptionPlans[0];
  const subscriptionAmount = selectedPlan
    ? selectedPlan.priceMode === 'fixed'
      ? Math.min(Number(totalAmount) || 0, Number(selectedPlan.fixedAmount) || 0)
      : Math.round((Number(totalAmount) || 0) * Number(selectedPlan.percent) / 100)
    : 0;
  const planDurationLabel = plan => `${plan.durationValue || 30} ${plan.durationUnit || 'day'}${Number(plan.durationValue || 30) === 1 ? '' : 's'}`;

  useEffect(() => {
    if (website?.name) setWebsiteName(website.name);
    if (website?.domain) {
      setDomainName(website.domain.name || '');
      setDomainType(website.domain.type || 'subdomain');
    }
  }, [website?._id]);

  useEffect(() => {
    if (!isWebsiteUser || isEditOnly) return;
    api.get('/website-subscription-plans').then(({ data }) => {
      const plans = Array.isArray(data) ? data : [];
      setSubscriptionPlans(plans);
      setSelectedPlanId(current => current || plans.find(plan => plan.isDefault)?._id || plans[0]?._id || '');
    }).catch(() => setSubscriptionPlans([]));
  }, [isWebsiteUser, isEditOnly]);

  useEffect(() => {
    if (selectedModule) {
      const normalizedModuleType = normalizeModuleType(selectedModule);
      api.get(`/components?moduleType=${normalizedModuleType}`)
        .then(res => {
          const catalog = res.data || [];
          const moduleComponents = catalog.filter(component => normalizeModuleType(component.moduleType) === normalizedModuleType);
          setAvailableComponents(moduleComponents);
        })
        .catch(error => {
          console.error('Unable to load website components:', error);
          setAvailableComponents([]);
        });
    }
  }, [selectedModule]);

  const handleSelectModule = async (moduleType, selectedWebsiteName = websiteName) => {
    setModule(moduleType);
    setStep('design');
    setLoading(true);
    try {
      const { data } = await api.post('/websites', { name: selectedWebsiteName, moduleType });
      setWebsite(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const signup = location.state;
    if (!signup?.moduleType || signupStartedRef.current) return;
    signupStartedRef.current = true;
    const selectedWebsiteName = signup.websiteName || 'My Website';
    setWebsiteName(selectedWebsiteName);
    navigate(location.pathname, { replace: true, state: null });
    handleSelectModule(signup.moduleType, selectedWebsiteName);
  }, [location.state?.moduleType]);
  useEffect(() => {
    if (location.state?.moduleType || signupStartedRef.current || website) return;
    signupStartedRef.current = true;
    setLoading(true);
    api.get('/websites').then(({ data }) => {
      const websites = Array.isArray(data) ? data : [];
      const existingWebsite = isWebsiteUser
        ? websites.find(item => String(item._id) === String(user?.websiteId || ''))
          || websites.find(item => getAdminModuleKey({ slug: item.websiteModuleSlug || item.moduleType }) === previewModuleKey
            && (!user?.selectedModuleId || String(item.websiteModuleId || '') === String(user.selectedModuleId)))
          || websites.find(item => getAdminModuleKey({ slug: item.websiteModuleSlug || item.moduleType }) === previewModuleKey)
        : websites.find(item => getAdminModuleKey({ slug: item.websiteModuleSlug || item.moduleType }) === adminModuleKey);
      if (existingWebsite) {
        setWebsite(existingWebsite);
          setModule(isWebsiteUser ? accountModuleType : normalizeModuleType(adminBuilderType));
        setStep('design');
        return;
      }
      if (isWebsiteUser && accountModuleType) {
        return handleSelectModule(accountModuleType, `${user.name || 'My'} Website`);
      } else if (!isWebsiteUser) {
        setModule(normalizeModuleType(adminBuilderType));
        setStep('design');
        return handleSelectModule(adminBuilderType, websiteName || 'My Website');
      }
    }).catch(error => {
      console.error(error);
    }).finally(() => setLoading(false));
  }, [location.state?.moduleType, website, adminBuilderType]);
  const handleAddComponent = async (comp) => {
    if (!website) return;
    setComponentError('');
    try {
      const { data } = await api.post(`/websites/${website._id}/components`, {
        componentId: comp._id
      });
      setWebsite(data);
    } catch (err) {
      setComponentError(err.response?.data?.message || 'Component could not be added.');
    }
  };

  const handleRemoveComponent = async (index) => {
    if (!website) return;
    setComponentError('');
    try {
      const { data } = await api.delete(`/websites/${website._id}/components/${index}`);
      setWebsite(data);
    } catch (err) {
      setComponentError(err.response?.data?.message || 'Component could not be removed.');
    }
  };

  const handleAddDomain = async () => {
    if (!website) return false;
    setDomainError('');
    try {
      if (domainType !== 'none') {
        const { data: availability } = await api.get('/domains/availability', {
          params: { name: domainName, type: domainType, websiteId: website._id },
        });
        setBaseDomain(availability.baseDomain || 'wepzo.in');
        if (!availability.available) {
          setDomainError(availability.message || 'Domain not available. Choose another name.');
          return false;
        }
      }
      const { data } = await api.post(`/websites/${website._id}/domain`, {
        domainName: domainType === 'none' ? '' : domainName,
        type: domainType,
      });
      setWebsite(data);
      return true;
    } catch (err) {
      setDomainError(err.response?.data?.message || 'Domain could not be saved.');
      return false;
    }
  };

  const openPublishedWebsite = data => {
    if (previewModuleKey === 'quick-commerce') {
      const url = new URL(import.meta.env.VITE_QC_PREVIEW_URL || 'http://localhost:3001/', window.location.origin);
      const publishedSlugs = [...new Set((data.components || []).flatMap(({ componentId }) => {
        const slug = componentId?.slug;
        return LEGACY_PREVIEW_COMPONENTS[slug] || (slug ? [slug] : []);
      }))];
      url.searchParams.set('published', '1');
      url.searchParams.set('websiteId', data._id);
      if (data.websiteModuleId) url.searchParams.set('websiteModuleId', data.websiteModuleId);
      url.searchParams.set('components', publishedSlugs.join(','));
      window.location.assign(url.href);
      return;
    }
    if (previewModuleKey === 'e-commerce') {
      const url = new URL(import.meta.env.VITE_ECOMMERCE_PREVIEW_URL || 'http://localhost:5173/', window.location.origin);
      url.searchParams.set('published', '1');
      url.searchParams.set('websiteId', data._id);
      if (data.websiteModuleId) url.searchParams.set('moduleId', data.websiteModuleId);
      if (!isWebsiteUser) url.searchParams.set('adminPreview', '1');
      window.location.assign(url.href);
      return;
    }
    navigate('/published-websites/' + data._id);
  };

  const handlePublish = async () => {
    if (!website) return;
    try {
      const { data } = await api.post('/websites/' + website._id + '/publish');
      setWebsite(data);
      if (isWebsiteUser) navigate('/website-dashboard');
      else openPublishedWebsite(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckout = async purchaseType => {
    if (!website) return;
    setCheckoutError('');
    setCheckoutLoading(true);
    try {
      const { data: order } = await api.post(`/websites/${website._id}/checkout`, {
        purchaseType,
        planId: purchaseType === 'subscription' ? selectedPlan?._id : undefined,
      });
      const loaded = await loadRazorpayCheckout();
      if (!loaded || !window.Razorpay) throw new Error('Payment checkout could not be loaded. Check your connection and retry.');
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.orderId,
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: '#2563eb' },
        modal: { ondismiss: () => setCheckoutLoading(false) },
        handler: async response => {
          try {
            const { data: verifiedWebsite } = await api.post(`/websites/${website._id}/checkout/verify`, response);
            setWebsite(verifiedWebsite);
            const { data: publishedWebsite } = await api.post(`/websites/${website._id}/publish`);
            setWebsite(publishedWebsite);
            if (isWebsiteUser) navigate('/website-dashboard');
            else openPublishedWebsite(publishedWebsite);
          } catch (error) {
            setCheckoutError(error.response?.data?.message || 'Payment was received but could not be verified. Contact support before paying again.');
            setCheckoutLoading(false);
          }
        },
      });
      checkout.on('payment.failed', event => {
        setCheckoutError(event.error?.description || 'Payment failed. You can retry.');
        setCheckoutLoading(false);
      });
      checkout.open();
    } catch (error) {
      setCheckoutError(error.response?.data?.message || error.message || 'Checkout could not be started.');
      setCheckoutLoading(false);
    }
  };

  const handleExportZip = () => {
    if (!website) return;
    window.open(`/api/export/${website._id}/zip`, '_blank');
  };

  const orderedComponents = [...components].sort((a, b) => a.order - b.order);
  const componentGroups = [...new Set(availableComponents.map(getComponentGroup))];
  const previewComponentSlugs = [...new Set(components.flatMap(component => {
    const slug = component.componentId?.slug;
    return LEGACY_PREVIEW_COMPONENTS[slug] || (slug ? [slug] : []);
  }))];
  const quickCommercePreviewUrl = new URL(
    import.meta.env.VITE_QC_PREVIEW_URL || 'http://localhost:3001/',
    window.location.origin
  );
  quickCommercePreviewUrl.searchParams.set('builderPreview', '1');
  quickCommercePreviewUrl.searchParams.set('components', previewComponentSlugs.join(','));
  if (isWebsiteUser && website && !hasPurchasedWebsite) quickCommercePreviewUrl.searchParams.set('templatePreview', '1');
  if (website?._id && (!isWebsiteUser || hasPurchasedWebsite)) quickCommercePreviewUrl.searchParams.set('websiteId', website._id);
  if (website?.websiteModuleId && (!isWebsiteUser || hasPurchasedWebsite)) quickCommercePreviewUrl.searchParams.set('websiteModuleId', website.websiteModuleId);
  const ecommercePreviewUrl = new URL(import.meta.env.VITE_ECOMMERCE_PREVIEW_URL || 'http://localhost:5173/', window.location.origin);
  if (website?._id) ecommercePreviewUrl.searchParams.set('websiteId', website._id);
  const ecommerceModuleId = website?.websiteModuleId || user?.selectedModuleId;
  if (ecommerceModuleId) ecommercePreviewUrl.searchParams.set('moduleId', ecommerceModuleId);
  ecommercePreviewUrl.searchParams.set('builderPreview', '1');
  if (!isWebsiteUser) ecommercePreviewUrl.searchParams.set('adminPreview', '1');
  const modulePreviewDocument = createModulePreviewDocument(displayModuleName(selectedModule, displayModuleKey), components);
  const sendEcommercePreview = () => ecommercePreviewRef.current?.contentWindow?.postMessage({
    type: 'wepzo:builder-preview',
    components: website?.components || [],
  }, ecommercePreviewUrl.origin);
  useEffect(() => {
    sendEcommercePreview();
  }, [website?.components, ecommercePreviewUrl.origin]);
  const publishedPreviewUrl = new URL(quickCommercePreviewUrl.href);
  publishedPreviewUrl.searchParams.delete('builderPreview');
  publishedPreviewUrl.searchParams.set('published', '1');
  const publishedWebsiteUrl = website?.domain?.fullDomain
    ? (String(website.domain.fullDomain).match(/^https?:\/\//) ? '' : 'https://') + website.domain.fullDomain
    : publishedPreviewUrl.href;

  return (
    <div className="-m-4 lg:-m-6 flex min-h-[700px] flex-col bg-[#edf3f7] md:h-full md:min-h-[600px] md:flex-row">
      {/* Builder Sidebar */}
      <div className="w-full bg-white border-r border-gray-200 flex flex-col min-h-[600px] md:h-full md:w-[380px] md:max-w-[40%] md:shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-lg text-gray-800">Website Designer</h2>
            <p className="text-xs text-gray-500 mt-0.5">{isWebsiteUser ? (user.selectedModuleName || "Your website") : "Build your website visually"}</p>
          </div>
          <div className="flex items-center gap-2">
            {isWebsiteUser && website?.status === 'published' && <a href={publishedWebsiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50">Open Website <ExternalLink size={13}/></a>}
            {isWebsiteUser && <button type="button" onClick={() => { resetBuilder(); logout(); }} className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">Sign out <LogOut size={13} className="ml-1 inline"/></button>}
          </div>
        </div>

        {/* Steps */}
        <nav aria-label="Website setup steps" className="flex border-b border-gray-200 px-2">
          {steps.map((s, i) => (
            <button
              key={s}
              onClick={() => {
                if (!isWebsiteUser || s === 'design' || (s === 'domain' && steps.includes('domain'))) return setStep(s);
                if (s === 'payment' && (domain?.type === 'none' || !!domain?.fullDomain)) setStep(s);
              }}
              disabled={isWebsiteUser && s === 'payment' && domain?.type !== 'none' && !domain?.fullDomain}
              aria-current={step === s ? 'step' : undefined}
              className={`relative flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1.5 py-2.5 text-xs capitalize transition ${
                step === s ? 'bg-[#edf3ff] text-blue-600 font-medium' : 'text-gray-600 hover:bg-[#f5f8fd] hover:text-blue-400'
              }`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                step === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}>{i + 1}</span>
              <span className="truncate">{s}</span>
              {step === s && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-red-600" />}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Module Selection */}
          {step === 'module' && isWebsiteUser && (
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Website Name</label>
                <input
                  value={websiteName} onChange={e => setWebsiteName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="My Awesome Store"
                />
              </div>
              <p className="text-sm text-gray-500">Select website type:</p>
              {MODULES.filter(mod => isWebsiteUser || mod.type === adminBuilderType).map(mod => (
                <button
                  key={mod.type}
                  onClick={() => handleSelectModule(mod.type)}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-left group"
                >
                  <div className={`w-12 h-12 ${mod.color} rounded-xl flex items-center justify-center text-white`}>
                    <mod.icon size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 group-hover:text-primary-600">{mod.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{mod.desc}</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-primary-500" />
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Design - Add Components */}
          {step === 'design' && (
            <div className="p-5 space-y-4">
              {isEditOnly && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">You are editing your existing website. Design changes save to the same website and domain.</p>}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Add Components</h3>
                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full capitalize">
                  {displayModuleName(selectedModule, displayModuleKey)}
                </span>
              </div>
              {componentError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{componentError}</p>}

              {/* Available Components */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Choose components</p>
                {!availableComponents.length && <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">No {displayModuleName(selectedModule, displayModuleKey)} components yet. Add components from the Admin Components page for this module.</p>}
                {componentGroups.map(group => (
                  <details key={group} open={group === 'Header'} className="border border-gray-200 bg-white">
                    <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      <span>{group}</span>
                      <span className="text-xs text-gray-400">{availableComponents.filter(component => getComponentGroup(component) === group).length} parts</span>
                    </summary>
                    <div className="space-y-2 border-t border-gray-100 p-2">
                      {availableComponents.filter(component => getComponentGroup(component) === group).map(comp => {
                        const isAdded = components.some(c => c.componentId?._id === comp._id);
                        return (
                          <button
                            key={comp._id}
                            type="button"
                            role="switch"
                            aria-checked={isAdded}
                            onClick={() => {
                              if (isAdded) {
                                const componentIndex = components.findIndex(c => c.componentId?._id === comp._id);
                                if (componentIndex !== -1) handleRemoveComponent(componentIndex);
                              } else {
                                handleAddComponent(comp);
                              }
                            }}
                            className={`w-full flex items-center gap-3 p-3 border text-left transition ${
                              isAdded ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{comp.name}</p>
                              <p className="text-xs text-gray-500">{comp.description}</p>
                            </div>
                            <span className="shrink-0 text-sm font-bold text-primary-600">₹{comp.price}</span>
                            <span aria-hidden="true" className={`relative h-5 w-9 shrink-0 rounded-full transition ${isAdded ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${isAdded ? 'left-[18px]' : 'left-0.5'}`} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Domain */}
          {step === 'domain' && (
            <div className="p-5 space-y-4">
              <h3 className="font-semibold text-gray-800">Domain Setup</h3>

              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${domainType === 'subdomain' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  <input type="radio" name="domainType" value="subdomain" checked={domainType === 'subdomain'} onChange={() => { setDomainType('subdomain'); setDomainError(''); setDomain(null); }} />
                  <Globe size={20} className="text-primary-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Subdomain</p>
                    <p className="text-xs text-gray-500">yourstore.{baseDomain}</p>
                  </div>
                  <span className="font-bold text-primary-600">₹500</span>
                </label>

                <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${domainType === 'custom' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  <input type="radio" name="domainType" value="custom" checked={domainType === 'custom'} onChange={() => { setDomainType('custom'); setDomainError(''); setDomain(null); }} />
                  <Globe size={20} className="text-purple-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Custom Domain</p>
                    <p className="text-xs text-gray-500">www.yourdomain.com</p>
                  </div>
                  <span className="font-bold text-purple-600">₹2000</span>
                </label>

                <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${domainType === 'none' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  <input type="radio" name="domainType" value="none" checked={domainType === 'none'} onChange={() => { setDomainType('none'); setDomainError(''); setDomain(null); }} />
                  <Download size={20} className="text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">ZIP Export Only</p>
                    <p className="text-xs text-gray-500">Download code, deploy anywhere</p>
                  </div>
                  <span className="font-bold text-green-600">Free</span>
                </label>
              </div>

              {domainType !== 'none' && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Domain Name</label>
                  <div className="flex mt-1">
                    <input
                      value={domainName} onChange={e => { setDomainName(e.target.value); setDomainError(''); setDomain(null); }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="yourstore"
                    />
                    {domainType === 'subdomain' && (
                      <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-sm text-gray-500">.{baseDomain}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDomain}
                    className="mt-3 w-full bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition"
                  >
                    Check & Save Domain
                  </button>
                </div>
              )}

              {domainType === 'none' && <button type="button" onClick={handleAddDomain} className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Continue without a domain</button>}

              {domainError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{domainError}</p>}

              {domain?.fullDomain && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">Domain: {domain.fullDomain}</p>
                  <p className="text-xs text-green-600 mt-1">₹{domain.price} added to total</p>
                </div>
              )}
            </div>
          )}

          {step === 'payment' && isWebsiteUser && (
            <div className="p-5 space-y-4">
              <div><h3 className="font-semibold text-gray-800">Choose how to pay</h3><p className="mt-1 text-sm text-gray-500">Payment is calculated from the full website amount.</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Website and domain total</span><strong>₹{Number(totalAmount).toLocaleString('en-IN')}</strong></div>
                {domain?.fullDomain && <p className="mt-1 text-xs text-slate-500">Domain: {domain.fullDomain}</p>}
              </div>
              {subscriptionPlans.length > 0 ? <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-500">Subscription plan</p>
                {subscriptionPlans.map(plan => <label key={plan._id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${String(selectedPlanId || subscriptionPlans[0]?._id) === String(plan._id) ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                  <input type="radio" name="subscriptionPlan" checked={String(selectedPlanId || subscriptionPlans[0]?._id) === String(plan._id)} onChange={() => setSelectedPlanId(plan._id)} className="mt-1"/>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{plan.name} · {plan.priceMode === 'fixed' ? `₹${Number(plan.fixedAmount).toLocaleString('en-IN')}` : `${plan.percent}%`} · {planDurationLabel(plan)}</span>{plan.description && <span className="mt-0.5 block text-xs text-slate-500">{plan.description}</span>}<span className="mt-1 block text-xs text-slate-600">Pay now ₹{(plan.priceMode === 'fixed' ? Math.min(Number(totalAmount) || 0, Number(plan.fixedAmount) || 0) : Math.round((Number(totalAmount) || 0) * Number(plan.percent) / 100)).toLocaleString('en-IN')}; balance after payment ₹{Math.max(0, (Number(totalAmount) || 0) - (plan.priceMode === 'fixed' ? Math.min(Number(totalAmount) || 0, Number(plan.fixedAmount) || 0) : Math.round((Number(totalAmount) || 0) * Number(plan.percent) / 100))).toLocaleString('en-IN')}</span></span>
                </label>)}
              </div> : <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">No active subscription plans are available. You can choose Full Buy.</p>}
              {checkoutError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{checkoutError}</p>}
              <button type="button" disabled={checkoutLoading} onClick={() => handleCheckout('full')} className="w-full rounded-xl bg-blue-700 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{checkoutLoading ? 'Opening secure checkout…' : `Full Buy · ₹${Number(totalAmount).toLocaleString('en-IN')}`}</button>
              <button type="button" disabled={checkoutLoading || !selectedPlan} onClick={() => handleCheckout('subscription')} className="w-full rounded-xl border border-blue-200 bg-white py-3 font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50">{checkoutLoading ? 'Opening secure checkout…' : selectedPlan ? `Subscription · ${selectedPlan.priceMode === 'fixed' ? `₹${Number(selectedPlan.fixedAmount).toLocaleString('en-IN')}` : `${selectedPlan.percent}%`} · ₹${subscriptionAmount.toLocaleString('en-IN')}` : 'Subscription unavailable'}</button>
              <p className="text-center text-xs text-slate-400">Secure payment powered by Razorpay. Your website publishes after payment verification.</p>
            </div>
          )}

          {/* Step 4: Publish */}
          {step === 'publish' && (
            <div className="p-5 space-y-4">
              <h3 className="font-semibold text-gray-800">Publish & Export</h3>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Website</span>
                  <span className="font-medium">{websiteName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Module</span>
                  <span className="font-medium capitalize">{displayModuleName(selectedModule, displayModuleKey)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Components</span>
                  <span className="font-medium">{components.length}</span>
                </div>
                {domain?.fullDomain && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Domain</span>
                    <span className="font-medium">{domain.fullDomain}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="font-semibold">Total Amount</span>
                  <span className="font-bold text-primary-600 text-lg">₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {domain?.type !== 'none' && domain?.fullDomain && (
                <button
                  onClick={handlePublish}
                  className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 transition flex items-center justify-center gap-2"
                >
                  <Globe size={18} /> Publish Website
                </button>
              )}

              {website?.status === 'published' && (
                <button type="button" onClick={() => window.location.assign(publishedPreviewUrl.href)} className="w-full rounded-xl border border-blue-200 bg-blue-50 py-3 font-medium text-blue-800 hover:bg-blue-100">
                  View this website by ID: {website._id}
                </button>
              )}
              {website?.status === 'published' && website.domain?.fullDomain && (
                <a href={(String(website.domain.fullDomain).match(/^https?:\/\//) ? '' : 'https://') + website.domain.fullDomain} target="_blank" rel="noreferrer" className="block w-full rounded-xl border border-slate-200 bg-white py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Open domain: {website.domain.fullDomain}
                </a>
              )}

              <button
                onClick={handleExportZip}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                <Download size={18} /> Download ZIP
              </button>

              <p className="text-xs text-gray-400 text-center">
                ZIP file contains complete HTML/CSS code. Deploy on any server with your own domain.
              </p>
            </div>
          )}
        </div>

        {/* Bottom: Total & Navigation */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <IndianRupee size={16} className="text-primary-600" />
              <span className="text-sm text-gray-500">Total:</span>
              <span className="text-xl font-bold text-primary-600">₹{totalAmount.toLocaleString()}</span>
            </div>
            <span className="text-xs text-gray-400">{components.length} components</span>
          </div>
          <div className="flex gap-2">
            {steps.indexOf(step) > 0 && (
              <button
                onClick={() => {
                  const idx = steps.indexOf(step);
                  if (idx > 0) setStep(steps[idx - 1]);
                }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
              >
                Back
              </button>
            )}
            {steps.indexOf(step) >= 0 && steps.indexOf(step) < steps.length - 1 && (
              <button
                onClick={async () => {
                  const idx = steps.indexOf(step);
                  if (isWebsiteUser && step === 'domain') {
                    const saved = await handleAddDomain();
                    if (!saved) return;
                  }
                  if (idx < steps.length - 1) setStep(steps[idx + 1]);
                }}
                disabled={loading || checkoutLoading}
                className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Preview Panel */}
      <div className="relative flex min-h-[500px] flex-1 items-center justify-center overflow-auto p-4 md:min-h-0 md:p-8">
        <div className="w-full max-w-4xl">
          {/* Monitor Frame */}
          <div className="bg-gray-800 rounded-t-xl p-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 bg-gray-700 rounded-md px-4 py-1 text-xs text-gray-400 text-center">
              {domain?.fullDomain || 'preview.wepzo.in'}
            </div>
            <Monitor size={16} className="text-gray-400" />
          </div>

          {/* Preview Content */}
          <div className="bg-white border-x-4 border-b-4 border-gray-800 rounded-b-xl overflow-hidden" style={{ minHeight: '500px', maxHeight: '70vh', overflowY: 'auto' }}>
            {previewModuleKey === 'quick-commerce' ? (
              <iframe
                key={quickCommercePreviewUrl.href}
                title="Live Quick Commerce website preview"
                src={quickCommercePreviewUrl.href}
                className="block w-full border-0 bg-white"
                style={{ height: '70vh', minHeight: '500px' }}
              />
            ) : previewModuleKey === 'e-commerce' ? (
              <iframe
                ref={ecommercePreviewRef}
                key={ecommercePreviewUrl.href}
                title="Live E-Commerce storefront preview"
                src={ecommercePreviewUrl.href}
                onLoad={sendEcommercePreview}
                className="block w-full border-0 bg-white"
                style={{ height: '70vh', minHeight: '500px' }}
              />
            ) : (
              <iframe
                key={`${previewModuleKey}-${components.map(component => component._id || component.componentId?._id || component.order).join(',')}`}
                title={`${displayModuleName(selectedModule, displayModuleKey)} website preview`}
                srcDoc={modulePreviewDocument}
                sandbox=""
                className="block w-full border-0 bg-white"
                style={{ height: '70vh', minHeight: '500px' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
