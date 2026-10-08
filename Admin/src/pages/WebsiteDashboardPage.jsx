import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Check, ExternalLink, Globe2, Layers3, LogOut, Pencil, RefreshCw, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import { useAuthStore, useBuilderStore } from '../store/useStore';
import { getAdminModuleKey } from '../constants/adminModules';

const daysUntil = value => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? Math.ceil((time - Date.now()) / 86400000) : null;
};
const dateLabel = value => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set';
const amountLabel = amount => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

export default function WebsiteDashboardPage() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const resetBuilder = useBuilderStore(state => state.reset);
  const navigate = useNavigate();
  const [website, setWebsite] = useState(null);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/websites'), api.get('/website-subscription-plans')])
      .then(([websiteResponse, plansResponse]) => {
        if (!active) return;
        const list = Array.isArray(websiteResponse.data) ? websiteResponse.data : [];
        const ownWebsite = list.find(item => String(item._id) === String(user?.websiteId)) || list[0];
        if (!ownWebsite) {
          navigate('/website-builder', { replace: true });
          return;
        }
        setWebsite(ownWebsite);
        setPlans(Array.isArray(plansResponse.data) ? plansResponse.data : []);
      })
      .catch(requestError => { if (active) setError(requestError.response?.data?.message || 'Website details could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [navigate, user?.websiteId]);

  const purchase = website?.purchase || {};
  const expiry = purchase.expiresAt;
  const remaining = daysUntil(expiry);
  const domainExpiry = website?.domain?.expiresAt;
  const domainRemaining = daysUntil(domainExpiry);
  const currentPlan = plans.find(plan => String(plan._id) === String(purchase.planId));
  const planPrice = useMemo(() => {
    if (currentPlan?.priceMode === 'fixed') return Number(currentPlan.fixedAmount) || Number(purchase.amount) || 0;
    if (purchase.percent) return Number(purchase.amount) / (Number(purchase.percent) / 100);
    return Number(purchase.amount) || 0;
  }, [currentPlan, purchase.amount, purchase.percent]);
  const websiteModuleKey = getAdminModuleKey({ slug: website?.websiteModuleSlug || website?.moduleType, name: website?.moduleName });
  const viewUrl = website?.domain?.fullDomain
    ? `${/^https?:\/\//i.test(website.domain.fullDomain) ? '' : 'https://'}${website.domain.fullDomain}`
    : websiteModuleKey === 'e-commerce'
      ? (() => {
          const url = new URL(import.meta.env.VITE_ECOMMERCE_PREVIEW_URL || 'http://localhost:5173/', window.location.origin);
          url.searchParams.set('published', '1');
          url.searchParams.set('websiteId', website?._id || '');
          if (website?.websiteModuleId) url.searchParams.set('moduleId', website.websiteModuleId);
          return url.href;
        })()
      : `/published-websites/${website?._id}`;
  const marketingWorkspaceUrl = useMemo(() => {
    if (websiteModuleKey !== 'marketing') return '';
    const url = new URL(import.meta.env.VITE_MARKETING_APP_URL || 'http://localhost:3001/', window.location.origin);
    url.searchParams.set('websiteId', website?._id || '');
    if (website?.websiteModuleId) url.searchParams.set('websiteModuleId', website.websiteModuleId);
    url.hash = '/login';
    return url.href;
  }, [website, websiteModuleKey]);
  const logoutUser = () => { resetBuilder(); logout(); navigate('/login', { replace: true }); };

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#090f1b] text-sm text-slate-300">Loading your website...</main>;
  if (error) return <main className="grid min-h-screen place-items-center bg-[#090f1b] px-5"><div role="alert" className="max-w-md rounded-xl border border-rose-400/30 bg-rose-950/50 p-5 text-sm text-rose-200">{error}<button onClick={() => window.location.reload()} className="ml-3 underline">Retry</button></div></main>;
  if (!website) return null;

  const published = website.status === 'published';
  const subscription = purchase.type === 'subscription';
  const renewalLabel = remaining === null ? 'Subscription term not set' : remaining <= 0 ? 'Expired' : `${remaining} Days`;
  const domainLabel = domainRemaining === null ? 'No expiry date' : domainRemaining <= 0 ? 'Expired' : `${domainRemaining} Days`;

  return <main className="min-h-screen bg-[#090f1b] px-4 py-8 text-white sm:px-6">
    <div className="mx-auto max-w-3xl space-y-3">
      <header className="flex items-center justify-between px-1 pb-2"><div className="flex items-center gap-2 font-bold tracking-wide"><span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500"><Globe2 size={17}/></span>WEPZO</div><button type="button" onClick={logoutUser} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"><LogOut size={14}/> Sign out</button></header>

      <section className="rounded-xl bg-[#111a2a] p-3 shadow-xl shadow-black/20 sm:p-4">
        <div className="mb-3 flex items-start justify-between"><div><h1 className="font-semibold">{website.name || 'My Website'}</h1><p className="mt-1 text-xs text-slate-400">Manage your website, domain and plan</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${published ? 'bg-emerald-900/70 text-emerald-300' : 'bg-amber-900/70 text-amber-300'}`}>{published ? 'Live' : 'Setup in progress'}</span></div>
        <div className="rounded-lg bg-[#1d293b] p-2.5">
          <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-2"><Globe2 size={14} className="mt-0.5 shrink-0 text-slate-400"/><div className="min-w-0"><p className="truncate text-xs font-semibold">{website.domain?.fullDomain || website.domain?.name || 'Domain not connected'}</p><p className="mt-1 text-[10px] text-slate-400">{website.domain?.type === 'custom' ? 'Custom domain' : website.domain?.type === 'subdomain' ? 'Wepzo subdomain' : 'Connect a domain in the designer'}</p></div></div>{published && <a aria-label="Open website in new tab" href={viewUrl} target="_blank" rel="noreferrer" className="rounded p-1 text-slate-300 hover:bg-slate-700"><ExternalLink size={14}/></a>}</div>
          <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => navigate('/website-builder')} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-600 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-700"><Pencil size={12}/> Edit Website</button><a href={published ? viewUrl : undefined} target={published ? '_blank' : undefined} rel="noreferrer" aria-disabled={!published} onClick={event => { if (!published) event.preventDefault(); }} className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${published ? 'bg-slate-100 text-slate-900 hover:bg-white' : 'cursor-not-allowed bg-slate-700 text-slate-400'}`}><ExternalLink size={12}/> View Website</a></div>
          {marketingWorkspaceUrl && <a href={marketingWorkspaceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 py-2 text-[11px] font-semibold text-white hover:bg-orange-400"><ExternalLink size={13}/> Open Marketing Workspace</a>}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-[#1d293b] p-2.5"><CalendarClock size={15} className="text-orange-300"/><p className="mt-1 text-[10px] text-slate-400">Plan Renewal</p><p className="mt-1 text-base font-bold">{subscription ? renewalLabel : 'No renewal'}</p><p className="mt-1 text-[9px] text-orange-200">{expiry ? `Renews by ${dateLabel(expiry)}` : purchase.status === 'paid' ? 'One-time purchase' : 'No active plan'}</p></div>
          <div className="rounded-lg bg-[#1d293b] p-2.5"><ShieldCheck size={15} className="text-emerald-300"/><p className="mt-1 text-[10px] text-slate-400">Domain Expiry</p><p className="mt-1 text-base font-bold">{domainLabel}</p><p className="mt-1 text-[9px] text-emerald-200">{domainExpiry ? `Expires ${dateLabel(domainExpiry)}` : published ? 'SSL status: HTTPS' : 'Domain not active'}</p></div>
        </div>

        <div className="mt-2 rounded-lg bg-[#1d293b] p-2.5">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold">{purchase.planName || 'Website plan'}</p><p className="mt-1 text-[10px] text-slate-400">{subscription ? 'Website hosting and builder' : 'Website hosting and builder'}</p></div><strong className="shrink-0 text-xs">{planPrice ? `${amountLabel(planPrice)}${subscription ? `/${purchase.subscriptionDurationUnit || 'term'}` : ''}` : 'Plan pending'}</strong></div>
          <div className="mt-3 h-1 rounded-full bg-slate-700"><div className="h-1 rounded-full bg-orange-500" style={{ width: `${subscription && remaining !== null ? Math.max(0, Math.min(100, (remaining / Math.max(1, Number(purchase.subscriptionDurationValue) || 30)) * 100)) : purchase.status === 'paid' ? 100 : 0}%` }}/></div>
          <div className="mt-2 flex justify-between text-[9px] text-slate-400"><span>Subscription period</span><span>{expiry ? `Expires ${dateLabel(expiry)}` : purchase.status === 'paid' ? 'Paid' : 'Payment required'}</span></div>
          <button type="button" disabled={!subscription || !plans.length} onClick={() => navigate('/website-renewal')} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-100 py-1.5 text-[10px] font-semibold text-slate-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">Renew Subscription <RefreshCw size={12}/></button>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-[#1d293b] p-2 text-center"><Layers3 size={14} className="mx-auto text-orange-300"/><p className="mt-1 text-[9px] text-slate-300">Pages</p><p className="mt-1 text-sm font-bold">{Math.max(1, website.pages?.length || 0)}</p></div>
          <div className="rounded-lg bg-[#1d293b] p-2 text-center"><Globe2 size={14} className="mx-auto text-orange-300"/><p className="mt-1 text-[9px] text-slate-300">Storage</p><p className="mt-1 text-sm font-bold">Not tracked</p></div>
          <div className="rounded-lg bg-[#1d293b] p-2 text-center"><Check size={14} className="mx-auto text-emerald-300"/><p className="mt-1 text-[9px] text-slate-300">SSL</p><p className="mt-1 text-sm font-bold">{published ? 'Active' : 'Pending'}</p></div>
        </div>
        <p className="mt-2 text-center text-[9px] text-slate-500">{user?.email || 'Your Wepzo website account'}</p>
      </section>
    </div>
  </main>;
}
