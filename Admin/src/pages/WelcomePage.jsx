import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, CircleHelp, Globe, Headphones, Link2, LogOut, Mail, MessageCircle, Play, ShieldCheck, UserCircle2 } from 'lucide-react';
import api from '../api/axios';
import { useAuthStore, useBuilderStore } from '../store/useStore';

function moduleKey(value) {
  return String(value || '').toLowerCase().replace(/[_\s]/g, '-').replace(/-/g, '');
}

function safeLink(value) {
  try {
    const parsed = new URL(value);
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

function subdomainPriceLabel(module) {
  if (module?.subdomainPriceMode === 'free' || Number(module?.subdomainPrice) === 0) return 'Free';
  return `₹${Number(module?.subdomainPrice ?? 500).toLocaleString('en-IN')} setup`;
}

export default function WelcomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const resetBuilder = useBuilderStore(state => state.reset);
  const [modules, setModules] = useState([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [choice, setChoice] = useState('subdomain');
  const [error, setError] = useState('');
  const moduleSlug = location.state?.moduleSlug || user?.selectedModuleSlug || user?.websiteModuleSlug || '';
  const moduleId = user?.selectedModuleId || user?.websiteModuleId || '';
  const selectedModule = useMemo(() => modules.find(module =>
    (moduleId && String(module._id) === String(moduleId))
    || (moduleSlug && moduleKey(module.slug || module.type) === moduleKey(moduleSlug))
  ) || location.state?.module || {
    _id: moduleId,
    slug: moduleSlug,
    type: user?.selectedModuleType || moduleSlug,
    name: user?.selectedModuleName || 'Website',
    description: '',
    images: [],
    image: '',
    videoUrl: '',
  }, [modules, moduleId, moduleSlug, location.state?.module, user?.selectedModuleName, user?.selectedModuleType]);
  const images = Array.isArray(selectedModule.images) && selectedModule.images.length
    ? selectedModule.images
    : (selectedModule.image ? [selectedModule.image] : []);
  const activeImage = images[imageIndex % Math.max(images.length, 1)] || '';
  const websiteName = location.state?.websiteName || (user?.name ? `${user.name} Store` : 'My Store');
  const helpLinks = Array.isArray(selectedModule.helpLinks) ? selectedModule.helpLinks.filter(link => link?.label && safeLink(link.url)) : [];
  const subdomainBenefits = Array.isArray(selectedModule.subdomainBenefits) && selectedModule.subdomainBenefits.length
    ? selectedModule.subdomainBenefits
    : ['Guided domain setup', 'No technical setup needed', 'Price shown before checkout'];
  const ownDomainBenefits = Array.isArray(selectedModule.ownDomainBenefits) && selectedModule.ownDomainBenefits.length
    ? selectedModule.ownDomainBenefits
    : ['See a realistic store demo', 'Try cart and sample order', 'No real customer data'];
  const whatsapp = String(selectedModule.supportWhatsApp || '').replace(/\D/g, '');

  useEffect(() => {
    let active = true;
    api.get('/public/website-modules').then(({ data }) => {
      if (active) setModules(Array.isArray(data) ? data : []);
    }).catch(requestError => {
      if (active) setError(requestError.response?.data?.message || 'Some module details could not be loaded. You can still set up your website address.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (choice === 'subdomain' && selectedModule.showSubdomainOption === false) {
      setChoice(selectedModule.showOwnDomainOption === false ? '' : 'own-domain');
    } else if (choice === 'own-domain' && selectedModule.showOwnDomainOption === false) {
      setChoice(selectedModule.showSubdomainOption === false ? '' : 'subdomain');
    }
  }, [choice, selectedModule.showSubdomainOption, selectedModule.showOwnDomainOption]);

  const continueDomainSetup = () => {
    if (choice === 'own-domain' && selectedModule.showOwnDomainOption !== false) {
      openOwnDomainPage();
      return;
    }
    if (selectedModule.showSubdomainOption === false) return;
    navigate('/sub-domain', {
      state: { storeName: websiteName, moduleName: selectedModule.name },
    });
  };

  const openOwnDomainPage = () => navigate('/on-domain', {
    state: { storeName: websiteName, moduleName: selectedModule.name },
  });

  const signOut = () => {
    resetBuilder();
    logout();
    navigate('/login', { replace: true });
  };

  const title = selectedModule.welcomeTitle?.trim() || 'Welcome to WEPZO!';
  const description = selectedModule.welcomeDescription?.trim() || 'Your account has been successfully created. Now let’s set up your online store.';
  const intro = selectedModule.welcomeIntro?.trim() || `Now let’s set up your ${selectedModule.name || 'online store'}. Choose a WEPZO subdomain or preview a store with your own domain style.`;
  const builderTip = 'Choose the web address for the website linked to your account.';

  return <main className="min-h-screen w-full bg-white text-[#101828]">
    <div className="flex min-h-screen w-full flex-col bg-white">
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 px-5 shadow-sm backdrop-blur sm:px-8">
        <div className="text-[22px] font-black tracking-[-1.3px] text-[#111827]">◢<span className="text-blue-900">WEP</span><span className="text-orange-500">ZO</span></div>
        <div className="flex items-center gap-3 sm:gap-6">
          <a href={selectedModule.supportEmail ? `mailto:${selectedModule.supportEmail}` : '#help'} className="hidden items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-blue-800 sm:inline-flex"><Headphones size={16}/>{selectedModule.supportTitle?.trim() || 'Need Help?'}</a>
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700"><UserCircle2 size={20} className="text-blue-600"/>{user?.name?.split(' ')[0] || 'Account'}<span className="text-xs">⌄</span></span>
          <button type="button" onClick={signOut} aria-label="Sign out" title="Sign out" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><LogOut size={16}/></button>
        </div>
      </header>

      <div className="w-full flex-1 px-5 pb-8 pt-6 sm:px-8 lg:px-10">
        {error && <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</p>}
        <section className="relative grid min-h-[190px] overflow-hidden rounded-xl bg-gradient-to-r from-[#f4f9ff] via-[#f7faff] to-[#fff4e9] md:grid-cols-[1fr_0.95fr]">
          <div className="relative z-10 flex flex-col justify-center p-5 sm:p-7">
            <h1 className="flex items-center gap-2 text-3xl font-extrabold leading-tight tracking-[-0.8px] text-slate-950 sm:text-4xl"><span aria-hidden="true" className="text-3xl">🎉</span>{title}</h1>
            <p className="mt-2 text-base font-medium text-slate-800">{description}</p>
            <p className="mt-2 max-w-[600px] text-sm leading-6 text-slate-600">{intro}</p>
            <div className="mt-4 flex items-center gap-2 rounded-md bg-blue-100/80 px-4 py-3 text-sm font-medium text-blue-900"><span className="text-lg">💡</span>{builderTip}</div>
          </div>

          <div className="relative hidden min-h-[190px] items-end justify-center overflow-hidden md:flex">
            <div className="absolute inset-x-8 bottom-0 top-5 rounded-t-[48%] bg-gradient-to-br from-orange-100 to-rose-50"/>
            {activeImage
              ? <img src={activeImage} alt={`${selectedModule.name} store preview`} className="absolute bottom-0 left-1/2 h-[90%] max-w-[52%] -translate-x-1/2 object-contain mix-blend-multiply"/>
              : <div className="absolute bottom-3 left-1/2 grid h-36 w-36 -translate-x-1/2 place-items-center rounded-full bg-gradient-to-br from-orange-100 to-blue-100 text-6xl">🛍️</div>}
            <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-lg border border-slate-100 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-md"><ShieldCheck size={14} className="text-emerald-600"/>{websiteName.toLowerCase().replace(/\s+/g, '')}.wepzo.shop</div>
            <div className="absolute bottom-2 right-7 z-10 w-[48%] rounded-t-lg border border-slate-200 bg-white p-2 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-[8px] font-bold text-slate-800"><span>{websiteName}</span><span className="rounded bg-slate-100 px-2 py-0.5 font-normal text-slate-500">Search</span></div>
              <div className="mt-1.5 flex items-center justify-between rounded bg-orange-50 px-2 py-1.5"><div><p className="text-[8px] font-bold text-slate-900">New collection</p><p className="text-[6px] text-slate-500">Best quality products</p></div><span className="text-lg">👜</span></div>
              <div className="mt-1 flex justify-around text-sm"><span>👟</span><span>🎧</span><span>🧴</span><span>⌚</span></div>
            </div>
            {images.length > 1 && <div className="absolute bottom-2 left-3 z-20 flex gap-1">{images.map((image, index) => <button key={`${image}-${index}`} type="button" aria-label={`Show preview ${index + 1}`} onClick={() => setImageIndex(index)} className={`h-2 w-2 rounded-full ${index === imageIndex ? 'bg-blue-700' : 'bg-white'}`}/>)}</div>}
          </div>
        </section>

        <section className="mt-4">
          {(selectedModule.showSubdomainOption !== false || selectedModule.showOwnDomainOption !== false) && <>
            <h2 className="text-xl font-bold text-slate-900">{selectedModule.addressTitle?.trim() || 'Choose Your Website Address'}</h2>
            <p className="mt-1 text-sm text-slate-600">{selectedModule.addressDescription?.trim() || 'Select how you want your store to appear online.'}</p>
          </>}
          {(selectedModule.showSubdomainOption !== false || selectedModule.showOwnDomainOption !== false) && <div className="mt-4 grid gap-4 md:grid-cols-2">
            {selectedModule.showSubdomainOption !== false && <button type="button" aria-pressed={choice === 'subdomain'} onClick={() => setChoice('subdomain')} className={`rounded-xl border p-5 text-left transition ${choice === 'subdomain' ? 'border-blue-500 bg-blue-50/30 shadow-[0_0_0_1px_rgba(59,130,246,0.10)]' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
              <div className="flex items-start gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700"><Globe size={17}/></span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-sm font-bold text-slate-900">{selectedModule.subdomainTitle?.trim() || 'Use WEPZO Subdomain'}</span><span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">{subdomainPriceLabel(selectedModule)}</span></span>
                  <span className="mt-2 block text-sm leading-5 text-slate-600">{selectedModule.subdomainDescription?.trim() || 'Choose a WEPZO web address. Any setup charges are shown before payment.'}</span>
                  <span className="mt-3 flex max-w-[320px] items-center gap-1 rounded bg-slate-100 px-3 py-2 text-xs text-slate-600"><span>https://</span><span className="rounded bg-white px-2 py-1 font-semibold text-slate-800">{websiteName.toLowerCase().replace(/\s+/g, '')}</span><span>. WEPZO subdomain</span><Check size={14} className="ml-auto text-emerald-600"/></span>
                  <span className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">{subdomainBenefits.map((benefit, index) => <span key={`${benefit}-${index}`}>✓ &nbsp;{benefit}</span>)}</span>
                </span>
                <span className={`mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border ${choice === 'subdomain' ? 'border-blue-600' : 'border-slate-300'}`}>{choice === 'subdomain' && <span className="h-2 w-2 rounded-full bg-blue-600"/>}</span>
              </div>
            </button>}

            {selectedModule.showOwnDomainOption !== false && <button type="button" aria-pressed={choice === 'own-domain'} onClick={() => setChoice('own-domain')} className={`rounded-xl border p-5 text-left transition ${choice === 'own-domain' ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
              <div className="flex items-start gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600"><Link2 size={17}/></span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-sm font-bold text-slate-900">{selectedModule.ownDomainTitle?.trim() || 'Use Your Own Domain'}</span><span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800">{selectedModule.ownDomainBadge?.trim() || 'Recommended'}</span></span>
                  <span className="mt-2 block text-sm leading-5 text-slate-600">{selectedModule.ownDomainDescription?.trim() || 'Open a sample storefront preview styled with your own domain.'}</span>
                  <span className="mt-3 block max-w-[320px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">www.yourdomain.com</span>
                  <span className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">{ownDomainBenefits.map((benefit, index) => <span key={`${benefit}-${index}`}>✓ &nbsp;{benefit}</span>)}</span>
                </span>
                <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300"/>
              </div>
            </button>}
          </div>}
          {(selectedModule.showSubdomainOption !== false || selectedModule.showOwnDomainOption !== false) && <button type="button" onClick={continueDomainSetup} className="mx-auto mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#ff681c] px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#ed5910]">{choice === 'own-domain' ? 'Continue with Own Domain' : 'Continue with Subdomain'}<ArrowRight size={17}/></button>}
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl bg-[#fff5ed] p-4 sm:p-5">
            <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-400 text-white"><Play size={17} fill="currentColor"/></span><div><h3 className="text-sm font-bold text-slate-900">{selectedModule.tutorialTitle?.trim() || 'Watch Setup Video'}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{selectedModule.tutorialDescription?.trim() || 'Learn how to create your store step by step.'}</p></div></div>
            {selectedModule.videoUrl
              ? <video controls preload="metadata" poster={activeImage || undefined} src={selectedModule.videoUrl} className="mt-2 aspect-video w-full rounded-md bg-slate-900 object-contain"/>
              : <div className="mt-3 flex aspect-[2.5/1] items-center justify-between overflow-hidden rounded-md bg-gradient-to-r from-orange-100 to-white px-4"><div><span className="text-[10px] font-black text-blue-900">◢WEP<span className="text-orange-500">ZO</span></span><p className="mt-2 text-sm font-extrabold leading-5 text-slate-900">Complete<br/>Website Setup Guide</p></div><span className="text-4xl">👨🏻‍💻</span><span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900/75 text-white"><Play size={16} fill="currentColor"/></span></div>}
          </article>
          <article className="rounded-xl bg-[#eef8ff] p-4 sm:p-5">
            <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-200 text-blue-700"><BookOpen size={17}/></span><div><h3 className="text-sm font-bold text-slate-900">{selectedModule.helpTitle?.trim() || 'Read Help Guide'}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{selectedModule.helpDescription?.trim() || 'Detailed guide on domain, design, products and more.'}</p></div></div>
            <div className="mt-3 grid gap-2">
              {(helpLinks.length ? helpLinks : [
                { label: 'How to build your website', url: '' },
                { label: 'How to connect your own domain', url: '' },
                { label: 'Add products to your store', url: '' },
                { label: 'Customize your theme', url: '' },
                { label: 'Go live and start selling', url: '' },
              ]).slice(0, 5).map((link, index) => link.url
                ? <a key={`${link.label}-${index}`} href={safeLink(link.url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-700 underline"><BookOpen size={13}/>{link.label}</a>
                : <span key={`${link.label}-${index}`} className="flex items-center gap-2 text-xs text-blue-700"><BookOpen size={13}/>{link.label}</span>)}
            </div>
          </article>
          <article id="help" className="rounded-xl bg-[#effaf4] p-4 sm:p-5">
            <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><MessageCircle size={17}/></span><div><h3 className="text-sm font-bold text-slate-900">{selectedModule.supportTitle?.trim() || 'Need Help?'}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{selectedModule.supportDescription?.trim() || 'Our support team is here for you.'}</p></div></div>
            <div className="mt-3 grid gap-2">
              {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded bg-emerald-600 py-2.5 text-xs font-semibold text-white"><MessageCircle size={14}/>{selectedModule.supportWhatsappLabel?.trim() || 'Chat on WhatsApp'}</a>}
              {selectedModule.supportEmail && <a href={`mailto:${selectedModule.supportEmail}`} className="flex items-center justify-center gap-2 rounded border border-slate-300 bg-white py-2.5 text-xs font-semibold text-slate-700"><Mail size={14}/>{selectedModule.supportEmailLabel?.trim() || 'Email Support'}</a>}
              {(!whatsapp || !selectedModule.supportEmail) && <a href={selectedModule.supportEmail ? `mailto:${selectedModule.supportEmail}` : '#help'} className="flex items-center justify-center gap-2 rounded border border-slate-300 bg-white py-2.5 text-xs font-semibold text-slate-700"><CircleHelp size={14}/>{selectedModule.helpCenterLabel?.trim() || 'Visit Help Center'}</a>}
              <span className="flex items-center justify-center gap-2 rounded border border-slate-200 bg-white/70 py-2.5 text-xs text-slate-500"><Mail size={13}/>{selectedModule.supportEmail || 'Support is ready to help'}</span>
            </div>
          </article>
        </section>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-400"><span>Signed in as {user?.email || 'your WEPZO account'}</span><span>·</span><span>{selectedModule.name} setup</span></div>
      </div>
    </div>
  </main>;
}
