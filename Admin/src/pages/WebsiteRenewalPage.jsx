import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarClock, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import { clearPaymentReturnDetails, launchPaymentCheckout, paymentReturnDetails, paymentReturnUrl } from '../utils/paymentCheckout';

export default function WebsiteRenewalPage() {
  const navigate = useNavigate();
  const [website, setWebsite] = useState(null);
  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const paymentReturnHandledRef = useRef(false);
  const selectedPlan = plans.find(plan => String(plan._id) === String(planId)) || plans[0];
  const price = useMemo(() => selectedPlan?.priceMode === 'fixed' ? Number(selectedPlan.fixedAmount) || 0 : 0, [selectedPlan]);

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

  useEffect(() => {
    const { purchaseId, gateway } = paymentReturnDetails();
    if (!purchaseId || !['phonepe', 'cashfree'].includes(gateway) || paymentReturnHandledRef.current) return;
    paymentReturnHandledRef.current = true;
    setPaying(true);
    api.get('/websites')
      .then(({ data }) => {
        const pendingWebsite = (Array.isArray(data) ? data : []).find(item => String(item.purchase?._id || '') === purchaseId);
        if (!pendingWebsite) throw new Error('The renewal linked to this payment could not be found.');
        return api.post(`/websites/${pendingWebsite._id}/checkout/verify`, { purchaseId });
      })
      .then(() => navigate('/website-dashboard', { replace: true }))
      .catch(requestError => setError(requestError.response?.data?.message || requestError.message || 'Renewal payment could not be verified.'))
      .finally(() => { clearPaymentReturnDetails(); setPaying(false); });
  }, [navigate]);

  const renew = async () => {
    if (!website || !selectedPlan) return;
    setPaying(true);
    setError('');
    try {
      const { data: order } = await api.post(`/websites/${website._id}/checkout`, { purchaseType: 'subscription', planId: selectedPlan._id, renewal: true, returnUrl: paymentReturnUrl() });
      if (order.free) {
        navigate('/website-dashboard', { replace: true });
        return;
      }
      await launchPaymentCheckout(order, {
        prefill: { name: website.ownerName || '', email: website.ownerEmail || '', contact: website.ownerPhone || '' },
        onDismiss: () => setPaying(false),
        onFailure: paymentError => { setError(paymentError.message || 'Payment failed. You can retry.'); setPaying(false); },
        onVerified: async response => {
          await api.post(`/websites/${website._id}/checkout/verify`, response);
          navigate('/website-dashboard', { replace: true });
        },
      });
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
        {plans.map(plan => <button key={plan._id} type="button" onClick={() => setPlanId(plan._id)} className={`mb-2 flex w-full items-center justify-between rounded-xl border p-4 text-left ${String(selectedPlan?._id) === String(plan._id) ? 'border-orange-400 bg-orange-500/10' : 'border-slate-700 bg-slate-900/40 hover:bg-slate-800'}`}><span><strong className="block text-sm">{plan.name}</strong><span className="mt-1 block text-xs text-slate-400">Extends for {plan.durationValue || 30} {plan.durationUnit || 'day'}{Number(plan.durationValue || 30) === 1 ? '' : 's'}</span></span><strong className="text-sm">{plan.priceMode === 'free' ? 'Free' : `₹${Number(plan.fixedAmount || 0).toLocaleString('en-IN')}`}</strong></button>)}
        {selectedPlan && <button type="button" onClick={renew} disabled={paying || !plans.length || (price <= 0 && selectedPlan.priceMode !== 'free')} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={16}/>{paying ? 'Opening secure checkout...' : selectedPlan.priceMode === 'free' ? `Renew Free Plan · ${selectedPlan.durationValue || 30} ${selectedPlan.durationUnit || 'day'}${Number(selectedPlan.durationValue || 30) === 1 ? '' : 's'}` : `Pay ₹${price.toLocaleString('en-IN')} and renew`}</button>}
      </>}
      {error && <p role="alert" className="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}
    </section>
  </main>;
}
