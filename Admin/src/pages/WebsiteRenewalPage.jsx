import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarClock, RefreshCw } from 'lucide-react';
import api from '../api/axios';

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function WebsiteRenewalPage() {
  const navigate = useNavigate();
  const [website, setWebsite] = useState(null);
  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const selectedPlan = plans.find(plan => String(plan._id) === String(planId)) || plans[0];
  const price = useMemo(() => {
    if (!selectedPlan || !website) return 0;
    const full = Math.max(0, Number(website.totalAmount) || 0);
    return selectedPlan.priceMode === 'fixed'
      ? Math.min(full, Number(selectedPlan.fixedAmount) || 0)
      : Math.round(full * Number(selectedPlan.percent || 0)) / 100;
  }, [selectedPlan, website]);

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/websites'), api.get('/website-subscription-plans')])
      .then(([websiteResponse, plansResponse]) => {
        if (!active) return;
        const ownWebsite = (Array.isArray(websiteResponse.data) ? websiteResponse.data : []).find(item => item.purchase?.type === 'subscription');
        if (!ownWebsite) {
          setError('No subscription website is linked to this account.');
          return;
        }
        const activePlans = Array.isArray(plansResponse.data) ? plansResponse.data : [];
        setWebsite(ownWebsite);
        setPlans(activePlans);
        setPlanId(ownWebsite.purchase?.planId || activePlans.find(item => item.isDefault)?._id || activePlans[0]?._id || '');
      })
      .catch(requestError => { if (active) setError(requestError.response?.data?.message || 'Renewal details could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const renew = async () => {
    if (!website || !selectedPlan) return;
    setPaying(true);
    setError('');
    try {
      const { data: order } = await api.post(`/websites/${website._id}/checkout`, { purchaseType: 'subscription', planId: selectedPlan._id, renewal: true });
      if (!await loadCheckout() || !window.Razorpay) throw new Error('Payment checkout could not be loaded. Check your connection and retry.');
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: `Renew ${selectedPlan.name} subscription`,
        order_id: order.orderId,
        prefill: { name: website.ownerName || '', email: website.ownerEmail || '' },
        theme: { color: '#f97316' },
        modal: { ondismiss: () => setPaying(false) },
        handler: async response => {
          try {
            await api.post(`/websites/${website._id}/checkout/verify`, response);
            navigate('/website-dashboard', { replace: true });
          } catch (verifyError) {
            setError(verifyError.response?.data?.message || 'Payment was received but could not be verified. Contact support before paying again.');
            setPaying(false);
          }
        },
      });
      checkout.on('payment.failed', event => { setError(event.error?.description || 'Payment failed. You can retry.'); setPaying(false); });
      checkout.open();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Renewal checkout could not be started.');
      setPaying(false);
    }
  };

  return <main className="grid min-h-screen place-items-center bg-[#090f1b] px-4 py-8 text-white">
    <section className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#111a2a] p-6 shadow-2xl">
      <button type="button" onClick={() => navigate('/website-dashboard')} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft size={16}/> Back to website</button>
      <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-orange-500/15 p-3 text-orange-300"><CalendarClock size={20}/></span><div><h1 className="text-xl font-bold">Renew subscription</h1><p className="mt-1 text-sm text-slate-400">{website?.name || 'Your website'}</p></div></div>
      {loading ? <p className="text-sm text-slate-400">Loading renewal plans...</p> : <>
        {!plans.length && <p className="text-sm text-slate-300">No active renewal plans are available. Contact your administrator.</p>}
        {plans.map(plan => <button key={plan._id} type="button" onClick={() => setPlanId(plan._id)} className={`mb-2 flex w-full items-center justify-between rounded-xl border p-4 text-left ${String(selectedPlan?._id) === String(plan._id) ? 'border-orange-400 bg-orange-500/10' : 'border-slate-700 bg-slate-900/40 hover:bg-slate-800'}`}><span><strong className="block text-sm">{plan.name}</strong><span className="mt-1 block text-xs text-slate-400">Extends for {plan.durationValue || 30} {plan.durationUnit || 'day'}{Number(plan.durationValue || 30) === 1 ? '' : 's'}</span></span><strong className="text-sm">₹{(plan.priceMode === 'fixed' ? Number(plan.fixedAmount) : (Number(website?.totalAmount || 0) * Number(plan.percent || 0) / 100)).toLocaleString('en-IN')}</strong></button>)}
        {selectedPlan && <button type="button" onClick={renew} disabled={paying || !plans.length || price <= 0} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={16}/>{paying ? 'Opening secure checkout...' : `Pay ₹${price.toLocaleString('en-IN')} and renew`}</button>}
      </>}
      {error && <p role="alert" className="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}
    </section>
  </main>;
}
