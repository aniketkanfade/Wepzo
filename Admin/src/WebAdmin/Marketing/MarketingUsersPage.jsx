import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Eye, ExternalLink, MessageCircle, RefreshCw, Search, Share2, Target, Users } from 'lucide-react';
import api from '../../api/axios';

const count = value => Number.isFinite(value) ? new Intl.NumberFormat('en-IN').format(value) : '—';
const dateLabel = value => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not published';
const mediaUrl = value => {
  if (!value || /^(https?:|data:|blob:)/i.test(value)) return value;
  const apiRoot = (import.meta.env.VITE_MARKETING_API_URL || import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '');
  return `${apiRoot}${value.startsWith('/') ? value : `/${value}`}`;
};

export default function MarketingUsersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(() => location.state?.marketingUser || null);
  const [selectedPostId, setSelectedPostId] = useState('');
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    api.get('/marketing/users')
      .then(({ data }) => setUsers(Array.isArray(data) ? data : []))
      .catch(requestError => setError(requestError.response?.data?.message || 'Marketing users could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  const loadDetails = useCallback(async (user, dateFrom = from, dateTo = to) => {
    if (!user) return;
    setSelectedUser(user); setDetailsLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const suffix = params.toString() ? `?${params}` : '';
      const { data } = await api.get(`/marketing/users/${user.id}/details${suffix}`);
      setDetails(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'User content and metrics could not be loaded.');
    } finally { setDetailsLoading(false); }
  }, [from, to]);

  useEffect(() => {
    const user = location.state?.marketingUser;
    if (user) { setSelectedUser(user); loadDetails(user); navigate(location.pathname, { replace: true, state: null }); }
  }, [location.state?.marketingUser, location.pathname, loadDetails, navigate]);

  const filteredUsers = users.filter(user => `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase()));
  const selectedPost = details?.posts?.find(post => post.id === selectedPostId);

  return <section className="mx-auto max-w-6xl space-y-5 pb-10">
    <header><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Admin / Web / Marketing</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Marketing users</h1><p className="mt-2 text-sm text-slate-600">Open a user to review assigned posts and reels with the metrics available from connected platforms.</p></header>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {!selectedUser ? <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">Users</h2><p className="mt-1 text-xs text-slate-500">{loading ? 'Loading…' : `${users.length} Marketing accounts`}</p></div><div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2"><Search size={15} className="text-slate-400"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search users…" className="w-44 border-0 text-sm outline-none"/></div></div>
      <div className="divide-y divide-slate-100">{filteredUsers.map(user=><button type="button" key={user.id} onClick={()=>loadDetails(user)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"><span className="grid h-10 w-10 place-items-center rounded-full bg-violet-50 text-sm font-bold text-violet-700">{user.name?.split(' ').map(part=>part[0]).join('').slice(0,2)||'W'}</span><span className="min-w-0 flex-1"><b className="block text-sm text-slate-900">{user.name}</b><small className="text-xs text-slate-500">{user.email}</small></span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">{user.status || 'active'}</span><span className="text-lg text-slate-400">›</span></button>)}{!loading&&!filteredUsers.length&&<p className="px-5 py-10 text-center text-sm text-slate-500">No Marketing users found.</p>}</div>
    </article> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={()=>{setSelectedUser(null);setSelectedPostId('');setDetails(null);setError('')}} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft size={16}/>All users</button><button type="button" onClick={()=>navigate(`/marketing/users/${selectedUser.id}/accounts`)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Account & billing details</button><button type="button" disabled={detailsLoading} onClick={()=>loadDetails(selectedUser)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"><RefreshCw size={14} className={detailsLoading?'animate-spin':''}/>Refresh metrics</button></div>
      <article className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><span className="grid h-12 w-12 place-items-center rounded-full bg-violet-50 font-bold text-violet-700">{selectedUser.name?.split(' ').map(part=>part[0]).join('').slice(0,2)||'W'}</span><div className="min-w-0 flex-1"><h2 className="font-semibold text-slate-900">{selectedUser.name}</h2><p className="text-xs text-slate-500">{selectedUser.email}</p><p className="mt-1 text-[10px] text-slate-400">Wepzo user ID: {details?.user?.id||selectedUser.id}</p></div><span className="text-xs text-slate-500">{details?.refreshedAt ? `Updated ${new Date(details.refreshedAt).toLocaleString('en-IN')}` : ''}</span></article>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Published from<input type="date" value={from} onChange={event=>setFrom(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700"/></label><label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Published to<input type="date" value={to} onChange={event=>setTo(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700"/></label><button type="button" disabled={detailsLoading} onClick={()=>loadDetails(selectedUser,from,to)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Apply dates</button><button type="button" onClick={()=>{setFrom('');setTo('');loadDetails(selectedUser,'','')}} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Reset</button></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[[Users,'Posts',details?.totals.posts], [Eye,'Views',details?.totals.views], [MessageCircle,'Comments',details?.totals.comments], [Share2,'Shares',details?.totals.shares], [Target,'Reach',details?.totals.reach]].map(([Icon,label,value])=><article key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-xs text-slate-500"><Icon size={16} className="text-orange-500"/>{label}</div><strong className="mt-3 block text-2xl font-bold text-slate-900">{detailsLoading&&!details?'…':count(value)}</strong></article>)}</div>
      <section><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Posts and Reels</h2><p className="mt-1 text-xs text-slate-500">Select a row to open its media preview and metrics.</p></div><span className="text-xs text-slate-500">{details?.posts?.length || 0} platform posts</span></div>
        {detailsLoading&&!details?<div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading posts and platform metrics…</div>:details?.posts?.length?<div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr>{['Content','Platform','Date','Status','Views','Comments','Action'].map(label=><th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{details.posts.map(post=><tr key={post.id} onClick={()=>setSelectedPostId(post.id)} className={`cursor-pointer border-t border-slate-100 hover:bg-blue-50/50 ${selectedPostId===post.id?'bg-blue-50':''}`}><td className="px-4 py-3"><button type="button" onClick={()=>setSelectedPostId(post.id)} className="text-left font-semibold text-slate-800 hover:text-blue-700">{post.title}<small className="mt-1 block font-normal text-slate-500">{post.contentType}</small></button></td><td className="px-4 py-3">{post.platform}</td><td className="px-4 py-3">{dateLabel(post.publishedAt)}</td><td className="px-4 py-3">{post.status}</td><td className="px-4 py-3 font-semibold">{count(post.metrics?.views)}</td><td className="px-4 py-3 font-semibold">{count(post.metrics?.comments)}</td><td className="px-4 py-3 text-blue-700">View details →</td></tr>)}</tbody></table></div>:<div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500"><CalendarDays size={20} className="mx-auto mb-2"/>No assigned posts or reels in this date range.</div>}
      </section>
      {selectedPost&&<article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">{selectedPost.contentType} details</h2><p className="mt-1 text-xs text-slate-500">{selectedPost.title} · {selectedPost.platform} · {dateLabel(selectedPost.publishedAt)}</p></div><div className="grid lg:grid-cols-[1.1fr_1fr]"><div className="relative grid min-h-64 place-items-center overflow-hidden bg-slate-100">{selectedPost.mediaUrl?(selectedPost.mediaType==='video'?<video className="max-h-[560px] w-full object-contain" src={mediaUrl(selectedPost.mediaUrl)} controls preload="metadata"/>:<img className="max-h-[560px] w-full object-contain" src={mediaUrl(selectedPost.mediaUrl)} alt={selectedPost.title}/>):<div className="grid justify-items-center gap-2 text-slate-400"><span className="text-4xl">{selectedPost.contentType==='Reel'?'▶':'▧'}</span><span className="text-xs">No media preview</span></div>}<span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold ${selectedPost.contentType==='Reel'?'bg-orange-500 text-white':'bg-white/95 text-slate-700'}`}>{selectedPost.contentType}</span></div><div className="space-y-5 p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{selectedPost.title}</h3><p className="mt-1 text-xs text-slate-500">Status: {selectedPost.status}</p></div>{selectedPost.providerPostUrl&&<a href={selectedPost.providerPostUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-700 hover:underline">Open post <ExternalLink size={12}/></a>}</div>{selectedPost.caption&&<p className="text-sm leading-6 text-slate-600">{selectedPost.caption}</p>}<div className="grid grid-cols-2 gap-3">{[[Eye,'Views',selectedPost.metrics?.views], [MessageCircle,'Comments',selectedPost.metrics?.comments], [Share2,'Shares',selectedPost.metrics?.shares], [Target,'Reach',selectedPost.metrics?.reach]].map(([Icon,label,value])=><div key={label} className="rounded-lg bg-slate-50 p-3"><span className="flex items-center gap-2 text-xs text-slate-500"><Icon size={15}/>{label}</span><b className="mt-2 block text-xl text-slate-900">{count(value)}</b></div>)}</div>{selectedPost.metrics?.message&&<p className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{selectedPost.metrics.message}</p>}</div></div></article>}
      <p className="text-xs text-slate-500">Date filters select posts by publish date; metrics show the latest totals returned for each post. Metrics appear only when the connected provider grants access. Reach is not available from every platform/API. Reconnect accounts after analytics permissions are enabled.</p>
    </>}
  </section>;
}
