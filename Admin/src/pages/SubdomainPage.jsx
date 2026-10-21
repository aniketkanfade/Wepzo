import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Globe2, Headphones, LogOut, UserCircle2 } from 'lucide-react';
import api from '../api/axios';
import { useAuthStore, useBuilderStore } from '../store/useStore';
import { clearPaymentReturnDetails, launchPaymentCheckout, paymentReturnDetails, paymentReturnUrl } from '../utils/paymentCheckout';

export default function SubdomainPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const resetBuilder = useBuilderStore(state => state.reset);
  const [website, setWebsite] = useState(null);
  const [domainName, setDomainName] = useState(String(location.state?.storeName || '').toLowerCase().replace(/[^a-z0-9-]/g, ''));
  const [baseDomain, setBaseDomain] = useState('wepzo.in');
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const returnHandled = useRef(false);

  useEffect(() => {
    let active = true;
    api.get('/websites').then(({ data }) => {
      const websites = Array.isArray(data) ? data : [];
      const tenantId = user?.websiteId || user?.id || user?._id;
      const tenantWebsite = websites.find(item => String(item._id) === String(tenantId))
        || websites.find(item => String(item.userId || '') === String(user?.id || user?._id || ''))
        || websites[0];
      if (!tenantWebsite) throw new Error('Your account website could not be found. Please sign in again.');
      if (!active) return;
      setWebsite(tenantWebsite);
      setDomainName(current => current || (tenantWebsite.domain?.type === 'subdomain' ? tenantWebsite.domain.name : ''));
    }).catch(requestError => {
      if (active) setError(requestError.response?.data?.message || requestError.message || 'Website could not be loaded.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, user?._id, user?.websiteId]);

  const publishWebsite = async websiteId => {
    const { data } = await api.post(`/websites/${encodeURIComponent(websiteId)}/publish`);
    setWebsite(data);
    setNotice(`Your website is live at ${data.domain?.fullDomain || `${domainName}.${baseDomain}`}.`);
    return data;
  };

  useEffect(() => {
    const { purchaseId, gateway, flow } = paymentReturnDetails();
    if (!purchaseId || !gateway || returnHandled.current || !['full', 'website-payment'].includes(flow)) return;
    returnHandled.current = true;
    setSaving(true);
    api.get('/websites').then(async ({ data }) => {
      const pending = (Array.isArray(data) ? data : []).find(item => String(item.purchase?._id || '') === purchaseId);
      if (!pending) throw new Error('The website purchase for this payment could not be found.');
      setWebsite(pending);
      await api.post(`/websites/${encodeURIComponent(pending._id)}/checkout/verify`, { purchaseId });
      return publishWebsite(pending._id);
    }).catch(requestError => setError(requestError.response?.data?.message || requestError.message || 'Payment could not be verified.'))
      .finally(() => { clearPaymentReturnDetails(); setSaving(false); });
  }, []);

  const checkAvailability = async () => {
    if (!website || !domainName.trim()) return;
    setChecking(true); setError(''); setNotice(''); setAvailability(null);
    try {
      const { data } = await api.get('/domains/availability', { params: { name: domainName.trim(), type: 'subdomain', websiteId: website._id } });
      setAvailability({ ...data, name: domainName.trim() });
      setBaseDomain(data.baseDomain || 'wepzo.in');
      if (!data.available) setError(data.message || 'This subdomain is not available. Try another name.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Subdomain availability could not be checked.');
    } finally { setChecking(false); }
  };

  const saveAndContinue = async () => {
    if (!website || !availability?.available || availability.name !== domainName.trim()) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const { data: savedWebsite } = await api.post(`/websites/${encodeURIComponent(website._id)}/domain`, { domainName: domainName.trim(), type: 'subdomain' });
      setWebsite(savedWebsite);
      if (savedWebsite.purchase?.status === 'paid') {
        await publishWebsite(savedWebsite._id);
        return;
      }
      const { data: order } = await api.post(`/websites/${encodeURIComponent(savedWebsite._id)}/checkout`, { purchaseType: 'full', returnUrl: paymentReturnUrl() });
      if (order.free) {
        setWebsite(order.website);
        setNotice(`Your website is live at ${order.website.domain?.fullDomain || `${domainName}.${baseDomain}`}.`);
        return;
      }
      await launchPaymentCheckout(order, {
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
        onDismiss: () => setSaving(false),
        onFailure: paymentError => { setError(paymentError.message || 'Payment failed. You can retry.'); setSaving(false); },
        onVerified: async response => {
          await api.post(`/websites/${encodeURIComponent(savedWebsite._id)}/checkout/verify`, response);
          await publishWebsite(savedWebsite._id);
          setSaving(false);
        },
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Subdomain setup could not be completed.');
      setSaving(false);
    }
  };

  const signOut = () => { resetBuilder(); logout(); navigate('/login', { replace: true }); };
  const domainReady = Boolean(availability?.available && availability.name === domainName.trim());

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
      <div className="text-[22px] font-black tracking-[-1.3px] text-[#111827]">{"\u25e2"}<span className="text-blue-900">WEP</span><span className="text-orange-500">ZO</span></div>
      <div className="flex items-center gap-4 text-xs"><span className="hidden items-center gap-1.5 sm:flex"><Headphones size={15}/>Need Help?</span><span className="flex items-center gap-1"><UserCircle2 size={19} className="text-blue-600"/>{user?.name?.split(' ')[0] || 'Account'}</span><button type="button" onClick={signOut} aria-label="Sign out" className="text-slate-500 hover:text-slate-900"><LogOut size={16}/></button></div>
    </header>
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <button type="button" onClick={() => navigate('/welcome')} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700"><ArrowLeft size={16}/>Back to setup</button>
        <div className="flex items-start gap-3"><span className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><Globe2 size={22}/></span><div><h1 className="text-xl font-bold">Choose your WEPZO subdomain</h1><p className="mt-1 text-sm leading-6 text-slate-500">Set the web address for the website already linked to your account.</p></div></div>
        <label className="mt-7 block text-sm font-semibold">Website address
          <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"><span className="grid place-items-center bg-slate-50 px-3 text-sm text-slate-500">https://</span><input value={domainName} onChange={event => { setDomainName(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setAvailability(null); setError(''); }} placeholder="your-store" autoComplete="off" className="min-w-0 flex-1 px-3 py-3 text-sm outline-none"/><span className="grid place-items-center bg-slate-50 px-3 text-sm text-slate-600">.{baseDomain}</span></div>
        </label>
        <p className="mt-2 text-xs leading-5 text-slate-500">This address points to your existing account website. Your tenant and website ID stay the same.</p>
        <button type="button" onClick={checkAvailability} disabled={!website || !domainName.trim() || checking || saving} className="mt-4 rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50">{checking ? 'Checking...' : 'Check availability'}</button>
        {availability?.name === domainName.trim() && availability.available && <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700"><Check size={16}/>{availability.fullDomain} is available.</p>}
        {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {loading && <p className="mt-5 text-sm text-slate-500">Loading your account website...</p>}
        {!loading && !website && !error && <p className="mt-4 text-sm text-rose-700">Your account website was not found.</p>}
        {website && <div className="mt-7 rounded-xl bg-slate-50 p-4"><p className="text-xs font-medium text-slate-500">Account website ID</p><p className="mt-1 break-all font-mono text-sm text-slate-800">{website._id}</p></div>}
        <button type="button" onClick={saveAndContinue} disabled={!domainReady || saving || loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Setting up your website...' : website?.purchase?.status === 'paid' ? 'Apply subdomain & publish' : 'Continue'}<ArrowRight size={17}/></button>
      </section>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-bold">Your website</h2><p className="mt-2 text-sm leading-6 text-slate-600">Subdomain and custom domain are two addresses for the same tenant website. Choosing this option does not create another website account.</p><button type="button" onClick={() => navigate('/on-domain', { state: location.state })} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Use your own domain instead<ArrowRight size={16}/></button></aside>
    </div>
  </main>;
}
