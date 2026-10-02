import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Save, X, UserRound, Globe2, CreditCard, CalendarDays, ExternalLink, Layers3, Settings2 } from 'lucide-react';
import api from '../api/axios';
import { ADMIN_SIDEBAR_MENU } from '../WebAdmin/Qucik commerce/components/Sidebar';
import { WEBSITE_HEADER_ACCESS_OPTIONS, flattenWebsiteHeaderAccessOptions } from '../constants/websiteAccess';

const panel = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
const fieldClass = 'mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400';
const toDate = value => value ? new Date(value).toLocaleString() : '—';
const label = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());

function subscriptionRemaining(expiresAt, now) {
  if (!expiresAt) return 'Awaiting verified payment';
  const remaining = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return 'Expired';
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return `${days} days ${hours} hours ${minutes} minutes`;
}

const flattenMenuAccess = items => items.flatMap(item => item.children?.length ? flattenMenuAccess(item.children) : (item.path && item.path !== '#' ? [{ path: item.path, label: item.label }] : []));

function paymentState(user) {
  const value = String(user?.paymentStatus || user?.subscriptionStatus || '').toLowerCase();
  if (!value) return null;
  if (['success', 'successful', 'paid', 'completed', 'active'].includes(value)) return { text: 'Active', style: 'bg-emerald-100 text-emerald-700' };
  if (['pending', 'processing', 'initiated', 'unpaid'].includes(value)) return { text: 'Pending', style: 'bg-amber-100 text-amber-700' };
  return { text: label(value), style: 'bg-slate-100 text-slate-700' };
}

export default function UserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [modules, setModules] = useState([]);
  const [tenantSystemModules, setTenantSystemModules] = useState([]);
  const [tenantSummary, setTenantSummary] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([api.get('/users'), api.get('/admin/users/' + userId + '/websites'), api.get('/website-modules'), api.get('/plans/all'), api.get('/admin/users/' + userId + '/system-modules'), api.get('/admin/users/' + userId + '/tenant-summary')]).then(results => {
      if (!alive) return;
      setUsers(results[0].status === 'fulfilled' ? results[0].value.data || [] : []);
      setWebsites(results[1].status === 'fulfilled' ? results[1].value.data || [] : []);
      setModules(results[2].status === 'fulfilled' ? results[2].value.data || [] : []);
      setPlans(results[3].status === 'fulfilled' ? results[3].value.data || [] : []);
      setTenantSystemModules(results[4].status === 'fulfilled' ? results[4].value.data || [] : []);
      setTenantSummary(results[5].status === 'fulfilled' ? results[5].value.data || null : null);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [userId]);

  const user = users.find(item => String(item._id) === String(userId));
  const moduleSlug = user?.selectedModuleSlug || user?.websiteModuleSlug || '';
  const chosenModule = modules.find(item => item.slug === moduleSlug) || modules.find(item => item.name === user?.selectedModuleName);
  const chosenModuleName = chosenModule?.name || user?.selectedModuleName || user?.selectedModuleType || '';
  const usersWithModule = moduleSlug
    ? users.filter(item => (item.selectedModuleSlug || item.websiteModuleSlug) === moduleSlug).length
    : chosenModuleName ? users.filter(item => (item.selectedModuleName || item.selectedModuleType) === chosenModuleName).length : 0;
  const selectedWebsites = useMemo(() => {
    if (!user || !moduleSlug) return [];
    return websites.filter(site => String(site.userId?._id || site.userId) === String(userId)
      && (site.websiteModuleSlug
        ? String(site.websiteModuleSlug).toLowerCase() === String(moduleSlug).toLowerCase()
        : [String(moduleSlug).toLowerCase(), String(chosenModule?.type || user.selectedModuleType || '').toLowerCase()].includes(String(site.moduleType || '').toLowerCase())));
  }, [websites, user, userId, moduleSlug, chosenModule?.type]);
  const planId = user?.planId?._id || user?.planId;
  const plan = plans.find(item => String(item._id) === String(planId));
  const payment = paymentState(user);
  const moduleAccess = useMemo(() => {
    const header = Array.isArray(chosenModule?.access?.header) ? chosenModule.access.header : [];
    const sidebar = Array.isArray(chosenModule?.access?.sidebar) ? chosenModule.access.sidebar : [];
    const labels = new Map([
      ...flattenWebsiteHeaderAccessOptions().map(item => [item.path, item.label]),
      ...flattenMenuAccess(ADMIN_SIDEBAR_MENU).map(item => [item.path, item.label]),
    ]);
    return [...new Set([...header, ...sidebar])].map(path => ({ path, label: labels.get(path) || path }));
  }, [chosenModule]);
  const storageName = user?.storagePlan?.name || user?.storagePlanName;
  const storageLimit = user?.storageLimit || user?.storageCapacity;
  const tenantDataCounts = [
    ['Categories', tenantSummary?.counts?.categories],
    ['Subcategories', tenantSummary?.counts?.subCategories],
    ['Child categories', tenantSummary?.counts?.childCategories],
    ['Brands', tenantSummary?.counts?.brands],
    ['Products', tenantSummary?.counts?.products],
    ['Stores', tenantSummary?.counts?.stores],
    ['Orders', tenantSummary?.counts?.orders],
    ['Customers', tenantSummary?.counts?.customers],
    ['Delivery zones', tenantSummary?.counts?.deliveryZones],
  ];

  const saveUser = async event => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const { data } = await api.put(`/users/${userId}`, { name: draft.name, email: draft.email, role: draft.role, status: draft.status });
      setUsers(current => current.map(item => String(item._id) === String(userId) ? { ...item, ...draft, ...data, _id: item._id } : item));
      setEditing(false);
    } catch (err) { setError(err.response?.data?.message || 'User could not be updated.'); }
    finally { setSaving(false); }
  };
  const deleteUser = async () => {
    if (!window.confirm(`Delete ${user?.name || user?.email}? This cannot be undone.`)) return;
    try { await api.delete(`/users/${userId}`); navigate('/users', { replace: true }); }
    catch (err) { setError(err.response?.data?.message || 'User could not be deleted.'); }
  };

  const websitePaymentSummary = selectedWebsites.length > 0 && (
    <section className={panel}>
      <div>
        <h2 className="font-semibold text-slate-900">Website payment and subscription</h2>
        <p className="mt-1 text-sm text-slate-500">Subscription starts at the verified payment time.</p>
      </div>
      <div className="mt-4 space-y-3">
        {selectedWebsites.map(site => {
          const purchase = site.purchase || {};
          const durationValue = Number(purchase.subscriptionDurationValue) || 30;
          const durationUnit = purchase.subscriptionDurationUnit || 'day';
          const remaining = subscriptionRemaining(purchase.expiresAt, clock);
          return (
            <article key={`payment-${site._id}`} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{site.name || 'Website'}</h3>
                  <p className="mt-1 text-sm text-slate-600">Domain: {site.domain?.fullDomain || site.domain?.name || 'Not selected'}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${purchase.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {label(purchase.status || 'not paid')}
                </span>
              </div>
              <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                <div><p className="text-xs text-slate-500">Payment type</p><p className="mt-1 text-sm font-semibold text-slate-800">{purchase.type === 'subscription' ? 'Subscription' : purchase.type === 'full' ? 'Full payment' : '—'}</p></div>
                <div><p className="text-xs text-slate-500">Paid amount</p><p className="mt-1 text-sm font-semibold text-slate-800">₹{Number(purchase.amount || 0).toLocaleString('en-IN')}</p></div>
                <div><p className="text-xs text-slate-500">Plan duration</p><p className="mt-1 text-sm font-semibold text-slate-800">{purchase.type === 'subscription' ? `${purchase.planName || 'Plan'} · ${durationValue} ${durationUnit}${durationValue === 1 ? '' : 's'}` : purchase.type === 'full' ? 'No expiry' : '—'}</p></div>
                <div><p className="text-xs text-slate-500">Time remaining</p><p className={`mt-1 text-sm font-semibold ${remaining === 'Expired' ? 'text-rose-700' : 'text-slate-800'}`}>{purchase.type === 'subscription' ? remaining : purchase.type === 'full' ? 'No expiry' : '—'}</p></div>
              </div>
              {Number(purchase.balanceDue) > 0 && <p className="mt-3 text-xs font-medium text-amber-700">Balance due: ₹{Number(purchase.balanceDue).toLocaleString('en-IN')}</p>}
              {purchase.paidAt && <p className="mt-2 text-xs text-slate-400">Payment verified: {toDate(purchase.paidAt)}{purchase.expiresAt ? ` · Expires: ${toDate(purchase.expiresAt)}` : ''}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );

  if (loading) return <main className="mx-auto max-w-5xl p-6 text-sm text-slate-500">Loading user details...</main>;
  if (!user) return <main className="mx-auto max-w-5xl p-6"><button onClick={() => navigate('/users')} className="inline-flex items-center gap-2 text-sm font-medium text-blue-800"><ArrowLeft size={16}/> Back to users</button><div className={`${panel} mt-5`}>User not found.</div></main>;

  return <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
    <button onClick={() => navigate('/users')} className="inline-flex items-center gap-2 text-sm font-medium text-blue-800 hover:text-blue-950"><ArrowLeft size={16}/> Back to User Management</button>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-slate-500">Dashboard / User Management / User Details</p><h1 className="mt-1 text-2xl font-bold text-slate-900">{user.name}</h1><p className="mt-1 text-sm text-slate-600">{user.email}</p></div><div className="flex gap-2"><button onClick={() => { setDraft({ name:user.name || '', email:user.email || '', role:user.role || 'store_admin', status:user.status || 'active' }); setError(''); setEditing(true); }} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-800"><Pencil size={15}/> Edit</button><button onClick={deleteUser} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700"><Trash2 size={15}/> Delete</button></div></header>
    {error && <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    {websitePaymentSummary}

    {tenantSystemModules.length > 0 && <section className={panel}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Tenant modules</h2><p className="mt-1 text-sm text-slate-500">Modules created for this account.</p></div><span className="text-sm text-slate-500">{tenantSystemModules.length} modules</span></div><div className="mt-3 divide-y divide-slate-100">{tenantSystemModules.map(module => <div key={module._id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium text-slate-900">{module.name}</p><p className="mt-0.5 text-xs text-slate-500">{module.slug}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${module.status === false ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>{module.status === false ? 'Inactive' : 'Active'}</span></div>)}</div></section>}

    {tenantSummary?.websiteId && <section className={panel}><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Tenant data</h2><p className="mt-1 text-sm text-slate-500">Records linked to this website only.</p></div><span className="font-mono text-xs text-slate-400">{tenantSummary.websiteId}</span></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{tenantDataCounts.map(([name, count]) => <div key={name} className="rounded-lg border border-slate-100 px-3 py-2.5"><p className="text-xs text-slate-500">{name}</p><p className="mt-1 text-lg font-semibold text-slate-900">{Number(count) || 0}</p></div>)}</div></section>}

    {editing && <form onSubmit={saveUser} className={`${panel} space-y-4`}><div className="flex items-center justify-between"><h2 className="font-semibold text-slate-900">Edit user</h2><button type="button" onClick={() => setEditing(false)} aria-label="Cancel edit"><X size={18}/></button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Name<input required className={fieldClass} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label className="text-sm font-medium">Email<input required type="email" className={fieldClass} value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})}/></label>{['subdomain_user','website_user'].includes(user.role) ? <label className="text-sm font-medium">Account type<select className={fieldClass} value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value})}><option value="subdomain_user">Subdomain user</option><option value="website_user">Domain user</option></select></label> : <label className="text-sm font-medium">Role<div className={`${fieldClass} bg-slate-50 text-slate-500`}>{label(draft.role)}</div></label>}<label className="text-sm font-medium">Account status<select className={fieldClass} value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div><div className="flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#1a3a8a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save size={15}/>{saving?'Saving...':'Save changes'}</button></div></form>}

    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className={panel}><div className="flex items-center gap-2 text-blue-800"><UserRound size={18}/><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account</span></div><p className="mt-3 text-lg font-semibold text-slate-900">{label(user.role || 'user')}</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${(user.status || 'active') === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{label(user.status || 'active')}</span></div>
      {user.createdAt && <div className={panel}><div className="flex items-center gap-2 text-blue-800"><CalendarDays size={18}/><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registered</span></div><p className="mt-3 text-sm font-semibold text-slate-900">{toDate(user.createdAt)}</p></div>}
      {payment && <div className={panel}><div className="flex items-center gap-2 text-blue-800"><CreditCard size={18}/><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment</span></div><span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${payment.style}`}>{payment.text}</span></div>}
      {plan && <div className={panel}><div className="flex items-center gap-2 text-blue-800"><Layers3 size={18}/><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned plan</span></div><p className="mt-3 text-lg font-semibold text-slate-900">{plan.name}</p><p className="mt-1 text-sm text-slate-600">₹{plan.price} · {plan.duration} {plan.durationUnit || 'days'}</p></div>}
      {(storageName || storageLimit) && <div className={panel}><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Storage plan</div><p className="mt-3 text-lg font-semibold text-slate-900">{storageName || storageLimit}</p>{storageName && storageLimit && <p className="mt-1 text-sm text-slate-600">{storageLimit}</p>}</div>}
    </section>

    <section className={panel}><div className="flex items-start gap-3"><div className="rounded-lg bg-blue-50 p-2 text-blue-800"><Globe2 size={20}/></div><div className="flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected website module</p><h2 className="mt-1 text-xl font-bold text-slate-900">{chosenModuleName ? label(chosenModuleName) : 'No module selected'}</h2><div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-100 pt-4"><div><p className="text-xs text-slate-500">Accounts using this module</p><p className="mt-1 text-lg font-semibold text-slate-900">{usersWithModule}</p></div><div><p className="text-xs text-slate-500">Websites created in this module</p><p className="mt-1 text-lg font-semibold text-slate-900">{selectedWebsites.length}</p></div></div></div></div></section>

    {selectedWebsites.length > 0 && <section className={panel}><h2 className="font-semibold text-slate-900">Websites in selected module</h2><div className="mt-4 space-y-3">{selectedWebsites.map(site => <article key={site._id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{site.name || 'Untitled website'}</h3><p className="mt-1 text-sm text-slate-500">{chosenModuleName || label(site.moduleType)} | Website ID: {site._id}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${site.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{label(site.status || 'draft')}</span>{site.status === 'published' ? <><button type="button" onClick={() => navigate('/published-websites/' + site._id)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a3a8a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-900"><ExternalLink size={13}/> View by ID</button>{(site.domain?.fullDomain || site.domain?.name) && <a href={(String(site.domain.fullDomain || site.domain.name).match(/^https?:\/\//) ? '' : 'https://') + (site.domain.fullDomain || site.domain.name)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50">Open domain</a>}</> : <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">Not published</span>}</div></div><div className="mt-4 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3"><div><p className="text-xs text-slate-500">Components selected</p><p className="mt-1 text-sm font-semibold text-slate-800">{site.components?.length || 0}</p></div><div><p className="text-xs text-slate-500">Website setup amount</p><p className="mt-1 text-sm font-semibold text-slate-800">₹{Number(site.totalAmount || 0).toLocaleString('en-IN')}</p></div><div><p className="text-xs text-slate-500">Domain</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-800">{site.domain?.fullDomain || site.domain?.name || 'No domain'}{site.domain?.fullDomain && <ExternalLink size={13}/>}</p></div></div>{site.createdAt && <p className="mt-3 text-xs text-slate-500">Created {toDate(site.createdAt)}</p>}</article>)}</div></section>}

    {chosenModule && <section className={panel}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Website access</h2><p className="mt-1 text-sm text-slate-500">Pages this account can open for {chosenModuleName}.</p></div><button type="button" onClick={() => navigate('/settings/website-access')} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-50"><Settings2 size={15}/> Manage module access</button></div><div className="mt-4 flex flex-wrap gap-2">{moduleAccess.length ? moduleAccess.map(item=><span key={item.path} title={item.path} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800">{item.label}</span>) : <p className="text-sm text-amber-700">No Header or Sidebar pages are enabled for this module.</p>}</div>{(user.accessSections || []).length > 0 && <div className="mt-4 border-t border-slate-100 pt-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account access sections</p><div className="mt-2 flex flex-wrap gap-2">{user.accessSections.map(section=><span key={section} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{label(section)}</span>)}</div></div>}</section>}
  </main>;
}
