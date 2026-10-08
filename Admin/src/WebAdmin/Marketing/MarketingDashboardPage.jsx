import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, CalendarClock, CreditCard, Megaphone, RefreshCw, Users, Wallet } from 'lucide-react';
import api from '../../api/axios';

const number = value => new Intl.NumberFormat('en-IN', { notation: Number(value) > 999999 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(Number(value || 0));
const money = (value, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
const COLORS = ['#2563eb', '#f97316'];

export default function MarketingDashboardPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [campaignCount, setCampaignCount] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [analyticsResponse, campaignResponse] = await Promise.all([api.get('/marketing/dashboard/analytics'), api.get('/promotions/campaigns')]);
      setAnalytics(analyticsResponse.data);
      setCampaignCount(Array.isArray(campaignResponse.data) ? campaignResponse.data.length : 0);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Marketing analytics could not be loaded.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const userChart = [{ name: 'Users', active: analytics?.users?.active || 0, inactive: analytics?.users?.inactive || 0 }];

  return <section className="mx-auto max-w-7xl space-y-5 pb-10">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Admin / Web / Marketing</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Marketing workspace</h1><p className="mt-2 text-sm text-slate-600">User growth, subscriptions, post reach, and advertising spend.</p></div><button type="button" disabled={loading} onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>Refresh analytics</button></header>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Users} title="Marketing users" value={analytics?.users?.total} detail={`${number(analytics?.users?.active)} active · ${number(analytics?.users?.inactive)} inactive`} color="text-violet-700" onClick={() => navigate('/marketing/users')}/>
      <Metric icon={CreditCard} title="Active subscriptions" value={analytics?.subscriptions?.active} detail={`${number(analytics?.subscriptions?.inactive)} inactive / no plan`} color="text-emerald-700" onClick={() => navigate('/marketing/subscriptions?status=paid')}/>
      <Metric icon={Wallet} title="Paid subscription amount" value={money(analytics?.subscriptions?.paidAmount, analytics?.subscriptions?.currency)} detail="Current verified user purchases" color="text-orange-600" onClick={() => navigate('/marketing/subscriptions?status=paid')}/>
      <Metric icon={CalendarClock} title="Assigned content" value={analytics?.content?.total} detail={`${number(analytics?.content?.published)} published platform posts`} color="text-blue-700" onClick={() => navigate('/marketing/content-add')}/>
      <Metric icon={Activity} title="Total reach" value={number(analytics?.content?.reach)} detail={`${number(analytics?.content?.views)} views across published posts`} color="text-sky-700" onClick={() => document.getElementById('marketing-performance')?.scrollIntoView({ behavior: 'smooth' })}/>
      <Metric icon={Megaphone} title="Campaigns" value={campaignCount} detail="Marketing workspace campaigns" color="text-indigo-700" onClick={() => navigate('/promotions/campaigns')}/>
      <Metric icon={Activity} title="Comments & shares" value={`${number(analytics?.content?.comments)} / ${number(analytics?.content?.shares)}`} detail="From connected platform insights" color="text-pink-700" onClick={() => navigate('/marketing/content-add')}/>
      <Metric icon={Wallet} title="Ad spend accounts" value={number(analytics?.adSpend?.length)} detail="Meta and Google Ads connections" color="text-amber-700" onClick={() => document.getElementById('marketing-ad-spend')?.scrollIntoView({ behavior: 'smooth' })}/>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
      <article id="marketing-performance" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="font-semibold text-slate-900">Post and Reel performance</h2><p className="mt-1 text-xs text-slate-500">Views and reach for the latest six months with published data.</p></div><div className="h-72">{analytics?.monthly?.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.monthly} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{ fontSize: 11 }}/><YAxis tick={{ fontSize: 10 }} tickFormatter={number}/><Tooltip formatter={value => number(value)}/><Legend/><Line type="monotone" dataKey="reach" name="Reach" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }}/><Line type="monotone" dataKey="views" name="Views" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3 }}/></LineChart></ResponsiveContainer> : <EmptyChart loading={loading} text="No published post metrics yet."/>}</div></article>
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="font-semibold text-slate-900">User status</h2><p className="mt-1 text-xs text-slate-500">Active and inactive Marketing accounts.</p></div><div className="h-56">{analytics?.users?.total ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ name: 'Active', value: analytics.users.active }, { name: 'Inactive', value: analytics.users.inactive }]} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3}>{[0, 1].map(index => <Cell key={index} fill={COLORS[index]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer> : <EmptyChart loading={loading} text="No Marketing users yet."/>}</div></article>
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="font-semibold text-slate-900">Most reached posts and reels</h2><p className="mt-1 text-xs text-slate-500">Ranked by reach, with views as a fallback when reach is unavailable.</p></div>{analytics?.topPosts?.length ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.topPosts} layout="vertical" margin={{ top: 4, right: 14, left: 10, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={number}/><YAxis type="category" dataKey="title" width={110} tick={{ fontSize: 10 }} tickFormatter={value => value.length > 18 ? `${value.slice(0, 18)}…` : value}/><Tooltip formatter={(value, _name, item) => [`${number(value)} · ${item.payload.rankMetric}`, 'Performance']}/><Bar dataKey="rankValue" name="Reach / views" fill="#2563eb" radius={[0, 5, 5, 0]}/></BarChart></ResponsiveContainer></div> : <EmptyChart loading={loading} text="No published posts to rank yet."/>}</article>
      <article id="marketing-ad-spend" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="font-semibold text-slate-900">Ad spend by platform</h2><p className="mt-1 text-xs text-slate-500">Provider-reported spend for the last 30 days.</p></div>{analytics?.adSpend?.length ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.adSpend} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="platform" tick={{ fontSize: 11 }}/><YAxis tick={{ fontSize: 10 }} tickFormatter={number}/><Tooltip formatter={(value, _name, item) => item.payload.amount == null ? 'No spend data' : money(value, item.payload.currency)}/><Bar dataKey="amount" name="Spend" fill="#f97316" radius={[5, 5, 0, 0]}/></BarChart></ResponsiveContainer></div> : <EmptyChart loading={loading} text="Connect an Ads account to load spend."/>}</article>
    </div>

    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Top content</h2><p className="mt-1 text-xs text-slate-500">Highest-reach published posts and reels, with user and platform details.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr>{['Content','User','Platform','Type','Reach','Views','Status'].map(title => <th key={title} className="px-4 py-3 font-semibold">{title}</th>)}</tr></thead><tbody>{(analytics?.topPosts || []).map(post => <tr key={post.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold text-slate-800">{post.title}</td><td className="px-4 py-3">{post.userName || '—'}</td><td className="px-4 py-3">{post.platform}</td><td className="px-4 py-3">{post.contentType}</td><td className="px-4 py-3 font-semibold">{number(post.reach)}</td><td className="px-4 py-3">{number(post.views)}</td><td className="px-4 py-3">{post.status}</td></tr>)}{!loading && !analytics?.topPosts?.length && <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">No published posts yet.</td></tr>}</tbody></table></div></article>
    {analytics?.adSpend?.some(entry => entry.message) && <p className="text-xs text-amber-700">{analytics.adSpend.filter(entry => entry.message).map(entry => `${entry.platform}: ${entry.message}`).join(' · ')}</p>}
    {analytics?.refreshedAt && <p className="text-right text-[10px] text-slate-400">Last refreshed {new Date(analytics.refreshedAt).toLocaleString('en-IN')}</p>}
  </section>;
}

function Metric({ icon: Icon, title, value, detail, color, onClick }) {
  return <button type="button" onClick={onClick} className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"><div className="flex items-center gap-2 text-xs text-slate-500"><Icon size={16} className={color}/>{title}</div><p className="mt-3 text-2xl font-bold text-slate-900">{value ?? '—'}</p><p className="mt-1 text-[11px] text-slate-500">{detail}</p></button>;
}

function EmptyChart({ loading, text }) {
  return <div className="grid h-full place-items-center rounded-lg bg-slate-50 text-sm text-slate-500">{loading ? 'Loading analytics…' : text}</div>;
}
