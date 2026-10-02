import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import api from '../../api/axios';

export default function MarketingDashboardPage() {
  const [campaigns, setCampaigns] = useState(null);
  useEffect(() => {
    let current = true;
    api.get('/promotions/campaigns').then(({ data }) => {
      if (current) setCampaigns(Array.isArray(data) ? data : []);
    }).catch(() => { if (current) setCampaigns([]); });
    return () => { current = false; };
  }, []);
  return <section className="mx-auto max-w-6xl space-y-5"><header><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Admin / Marketing</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Marketing Dashboard</h1><p className="mt-2 text-sm text-slate-600">Campaign summary for the selected Marketing module.</p></header><article className="max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3 text-slate-600"><Megaphone size={20} className="text-blue-700" /><span className="text-sm font-medium">Campaigns</span></div><p className="mt-4 text-3xl font-bold text-slate-900">{campaigns === null ? '—' : campaigns.length}</p></article></section>;
}