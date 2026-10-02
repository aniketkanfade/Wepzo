import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import api from '../../api/axios';

export default function InformationWebDashboardPage() {
  const [websites, setWebsites] = useState(null);
  useEffect(() => {
    let current = true;
    api.get('/websites').then(({ data }) => {
      if (current) setWebsites(Array.isArray(data) ? data : []);
    }).catch(() => { if (current) setWebsites([]); });
    return () => { current = false; };
  }, []);
  return <section className="mx-auto max-w-6xl space-y-5"><header><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Admin / Information Web</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Information Web Dashboard</h1><p className="mt-2 text-sm text-slate-600">Websites created in the selected Information Web module.</p></header><article className="max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3 text-slate-600"><Globe size={20} className="text-blue-700" /><span className="text-sm font-medium">Websites</span></div><p className="mt-4 text-3xl font-bold text-slate-900">{websites === null ? '—' : websites.length}</p></article></section>;
}