import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, RefreshCw, Search } from 'lucide-react';
import api from '../../api/axios';
import { useAuthStore } from '../../store/useStore';

const dateLabel = value => {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function MarketingInquiriesPage() {
  const user = useAuthStore(state => state.user);
  const isMainAdmin = user?.role === 'main_admin';
  const [websiteId, setWebsiteId] = useState('all');
  const [websites, setWebsites] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isMainAdmin) return;
    api.get('/websites')
      .then(({ data }) => setWebsites(Array.isArray(data) ? data : []))
      .catch(requestError => setError(requestError.response?.data?.message || 'Marketing websites could not be loaded.'));
  }, [isMainAdmin]);

  const loadInquiries = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setRefreshing(true);
    setError('');
    try {
      const params = isMainAdmin ? { websiteId } : undefined;
      const { data } = await api.get('/marketing/inquiries', { params });
      setInquiries(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Inquiries could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isMainAdmin, websiteId]);

  useEffect(() => { loadInquiries(); }, [loadInquiries]);

  const filteredInquiries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return inquiries;
    return inquiries.filter(item => [item.name, item.email, item.phone, item.subject, item.message, item.websiteName, item.websiteId]
      .some(value => String(value || '').toLowerCase().includes(query)));
  }, [inquiries, search]);

  return <main className="mx-auto max-w-7xl space-y-5 pb-10">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Admin / Web / Marketing</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Inquiries</h1><p className="mt-2 text-sm text-slate-600">Messages submitted through the Marketing website contact form.</p></div>
      <button type="button" onClick={() => loadInquiries(false)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/>Refresh</button>
    </header>

    {isMainAdmin && <label className="grid max-w-xl gap-1.5 text-xs font-semibold text-slate-600">Show inquiries for
      <select value={websiteId} onChange={event => setWebsiteId(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-800">
        <option value="all">All Marketing websites</option>
        <option value="platform">Main Admin website</option>
        {websites.map(site => <option key={site._id} value={site._id}>{site.name || 'Marketing website'} ({String(site._id).slice(0, 8)})</option>)}
      </select>
    </label>}

    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-700"><Mail size={18}/></span><div><h2 className="font-semibold text-slate-900">Website inquiries</h2><p className="mt-0.5 text-xs text-slate-500">{loading ? 'Loading…' : `${filteredInquiries.length} ${filteredInquiries.length === 1 ? 'inquiry' : 'inquiries'}`}</p></div></div>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-slate-400"><Search size={15}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search inquiries…" className="w-48 border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"/></label>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr>{[...(isMainAdmin ? ['Website / Tenant ID'] : []), 'Contact', 'Subject & message', 'Received', 'Status'].map(label => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
        <tbody>{filteredInquiries.map(item => <tr key={item._id || item.id} className="border-t border-slate-100 align-top">
          {isMainAdmin && <td className="px-4 py-3"><b className="block text-slate-800">{item.websiteName || 'Main Marketing website'}</b><span className="mt-1 block max-w-44 break-all font-mono text-[10px] text-slate-400">{item.tenantId || 'Platform website'}</span></td>}
          <td className="px-4 py-3"><b className="block text-slate-800">{item.name}</b><a className="mt-1 block text-blue-700 hover:underline" href={`mailto:${item.email}`}>{item.email}</a>{item.phone && <a className="mt-1 block text-slate-500 hover:underline" href={`tel:${item.phone}`}>{item.phone}</a>}</td>
          <td className="max-w-lg whitespace-pre-wrap px-4 py-3"><b className="block text-slate-800">{item.subject || 'Website inquiry'}</b><p className="mt-1 text-slate-600">{item.message}</p></td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{dateLabel(item.createdAt)}</td>
          <td className="px-4 py-3"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold capitalize text-amber-700">{item.status || 'new'}</span></td>
        </tr>)}
        {!loading && !filteredInquiries.length && <tr><td colSpan={isMainAdmin ? 5 : 4} className="px-4 py-12 text-center text-sm text-slate-500">{search ? 'No inquiries match your search.' : 'No inquiries received yet.'}</td></tr>}
      </tbody></table></div>
    </section>
  </main>;
}
