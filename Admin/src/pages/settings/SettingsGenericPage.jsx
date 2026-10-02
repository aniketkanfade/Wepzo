import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, RotateCcw, Save, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import NavyToggle from '../../WebAdmin/Qucik commerce/components/NavyToggle';
import { SETTINGS_PAGE_FORMS, SETTINGS_FORM_DEFAULTS } from '../../constants/settingsHub';
import { LIST_CARD_BORDER as CARD_BORDER, listBtnNavy, listBtnOutline } from '../../constants/listTheme';

const PRIORITY_SECTIONS = [
  ['bestStoresNearby', 'Best Stores Nearby', 'Customer-favorite nearby stores, ranked by proximity, orders, and reviews.', 'Distance and total orders'],
  ['recommendedStore', 'Recommended Store', 'Stores selected by Admin as recommendations.', 'Oldest recommended stores'],
  ['specialOffers', 'Special Offers', 'Discounted items offered to customers.', 'Highest discount amount'],
  ['mostPopularItem', 'Most Popular Item', 'Frequently ordered items with strong reviews and ratings.', 'Higher ordered items'],
  ['bestReviewedItem', 'Best Reviewed Item', 'Highly rated and reviewed customer favorites.', 'Top ratings'],
  ['justForYou', 'Just for You', 'Discounted items selected for customers.', 'Latest'],
  ['newOnSomoo', 'New on Somoo', 'Recently added stores near the customer.', 'Latest joined stores'],
  ['allStores', 'All Stores', 'All stores available to customers.', 'Active stores'],
  ['categorySubcategoryProducts', 'Category / Subcategory Wise Product List', 'Latest items within a selected category or subcategory.', 'Latest created items'],
  ['productSearch', 'Product Search List', 'Items returned from the customer search bar.', 'Active items'],
  ['basicMedicineNearby', 'Basic Medicine Nearby', 'Nearby stores that provide basic medicine.', 'Total orders'],
  ['commonCondition', 'Common Condition', 'Frequently used customer conditions.', 'Active conditions'],
  ['brand', 'Brand', 'Well-known brands.', 'Active brands'],
  ['brandWiseProducts', 'Brand Wise Product List', 'Products grouped by brand.', 'Latest created items'],
  ['topOfferNearMe', 'Top Offer Near Me', 'Nearby stores ranked by discounts and proximity.', 'Discount and distance'],
];

const DEFAULT_AUTOMATED_REASONS = [
  'Order placed by mistake',
  'Refund not processed',
  'Wrong quantity received',
  'Poor packaging quality',
  'Delivery delayed',
  'Missing items in order',
  'Item is damaged or broken',
  'Received wrong item',
  'Order not delivered',
].map((message, index) => ({ id: `default-${index + 1}`, default: message, en: message, hi: '', status: true }));

export default function SettingsGenericPage({ pageKey }) {
  const config = SETTINGS_PAGE_FORMS[pageKey];
  const [form, setForm] = useState({ ...SETTINGS_FORM_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reasonLanguage, setReasonLanguage] = useState('default');
  const [reasonDraft, setReasonDraft] = useState({ default: '', en: '', hi: '', userType: '', status: true });
  const [editingReasonId, setEditingReasonId] = useState('');
  const [refundReasonLanguage, setRefundReasonLanguage] = useState('default');
  const [refundReasonDraft, setRefundReasonDraft] = useState({ default: '', en: '', hi: '', status: true });
  const [editingRefundReasonId, setEditingRefundReasonId] = useState('');
  const [refundReasonSearch, setRefundReasonSearch] = useState('');
  const [deliveryReferralExpanded, setDeliveryReferralExpanded] = useState(true);
  const [deliveryLoyaltyExpanded, setDeliveryLoyaltyExpanded] = useState(true);
  const [automatedReasonLanguage, setAutomatedReasonLanguage] = useState('default');
  const [automatedReasonDraft, setAutomatedReasonDraft] = useState({ default: '', en: '', hi: '', status: true });
  const [editingAutomatedReasonId, setEditingAutomatedReasonId] = useState('');
  const [automatedReasonSearch, setAutomatedReasonSearch] = useState('');
  const [customerWalletExpanded, setCustomerWalletExpanded] = useState(true);
  const [customerLoyaltyExpanded, setCustomerLoyaltyExpanded] = useState(true);
  const [customerReferralExpanded, setCustomerReferralExpanded] = useState(true);

  const load = () => api.get('/settings/business').then(r => setForm({ ...SETTINGS_FORM_DEFAULTS, ...(r.data || {}) }));

  useEffect(() => {
    setLoading(true);
    load().catch(() => {}).finally(() => setLoading(false));
  }, [pageKey]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const keys = config.fields.map(f => f.key);
      const payload = {};
      keys.forEach(k => { payload[k] = form[k]; });
      const { data } = await api.put('/settings/business', payload);
      setForm({ ...SETTINGS_FORM_DEFAULTS, ...data });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const runBackupNow = async () => {
    const stamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '');
    try {
      const { data } = await api.put('/settings/business', { lastBackupAt: stamp });
      setForm({ ...SETTINGS_FORM_DEFAULTS, ...data, lastBackupAt: stamp });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Backup failed');
    }
  };

  const inputCls = 'w-full px-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1a3a8a]/20';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5';
  const Icon = config.icon;

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>;

  if (pageKey === 'payment') {
    return <div className="w-full space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900"><Icon size={22} className="text-[#1a3a8a]" />Payment Options</h1>
        <p className="mt-1 text-sm text-gray-500">Set up your business payment options from here</p>
      </div>

      <section className="rounded-xl border bg-slate-50 p-4" style={{ borderColor: CARD_BORDER }}>
        <div className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-3" style={{ borderColor: CARD_BORDER }}>
          <PaymentOption checked={form.codEnabled} onChange={value => set('codEnabled', value)} title="Cash On Delivery" description="Let your customers pay when they receive their orders. A convenient option for those who prefer cash." />
          <PaymentOption checked={form.onlinePaymentEnabled} onChange={value => set('onlinePaymentEnabled', value)} title="Digital Payment" description="Enable customers to pay instantly using online payment gateways. Configure a payment gateway below." />
          <PaymentOption checked={form.offlinePaymentEnabled} onChange={value => set('offlinePaymentEnabled', value)} title="Offline payment" description="Customers can pay outside the system and submit payment proof for admin verification." warning />
        </div>
      </section>

      <section className="rounded-xl border bg-slate-50 p-4" style={{ borderColor: CARD_BORDER }}>
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-slate-600">
          <p className="font-medium">To enable combined payment, activate:</p>
          <ul className="mt-1 list-disc pl-5"><li>Customer Wallet</li><li>At least one payment method above</li></ul>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="text-sm font-semibold text-slate-800">Allow Combined Payment</h2><p className="mt-1 text-xs text-slate-500">Customers can use their wallet balance and another available payment method together.</p></div>
          <div className="flex min-w-44 items-center justify-between rounded-lg border bg-white px-4 py-2.5" style={{ borderColor: CARD_BORDER }}><span className="text-sm text-slate-600">Status</span><NavyToggle checked={!!form.combinedPaymentEnabled} onChange={value => set('combinedPaymentEnabled', value)} /></div>
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!form.customerWalletEnabled} onChange={event => set('customerWalletEnabled', event.target.checked)} className="h-4 w-4 accent-[#1a3a8a]" />Customer Wallet enabled</label>
      </section>

      <section className="rounded-xl border bg-white p-5" style={{ borderColor: CARD_BORDER }}>
        <h2 className="font-semibold text-slate-800">Payment Gateway Setup</h2>
        <p className="mt-1 text-xs text-slate-500">Configure digital payment providers and default payment values.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg border px-4 py-3" style={{ borderColor: CARD_BORDER }}><span className="text-sm text-slate-700">Razorpay</span><NavyToggle checked={!!form.razorpayEnabled} onChange={value => set('razorpayEnabled', value)} /></div>
          <div className="flex items-center justify-between rounded-lg border px-4 py-3" style={{ borderColor: CARD_BORDER }}><span className="text-sm text-slate-700">Stripe</span><NavyToggle checked={!!form.stripeEnabled} onChange={value => set('stripeEnabled', value)} /></div>
          <PaymentField label="Razorpay Key ID" value={form.razorpayKey || ''} onChange={value => set('razorpayKey', value)} />
          <PaymentField label="Payment Currency" value={form.paymentCurrency || 'INR'} onChange={value => set('paymentCurrency', value)} />
          <PaymentField label="Default Commission (%)" value={form.defaultCommission ?? 2.5} type="number" onChange={value => set('defaultCommission', Number(value))} />
          <PaymentField label="Refund Window (days)" value={form.refundWindowDays ?? 7} type="number" onChange={value => set('refundWindowDays', Number(value))} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: CARD_BORDER }}>
          <div className="flex flex-wrap gap-2">{config.relatedLinks?.map(link => <Link key={link.path} to={link.path} className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100">{link.label}</Link>)}</div>
          <div className="flex gap-2">
            <button type="button" onClick={() => load()} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium ${listBtnOutline}`}><RotateCcw size={14} />Reset</button>
            <button type="button" onClick={handleSave} disabled={saving} className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={14} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Information'}</button>
          </div>
        </div>
      </section>
    </div>;
  }

  if (pageKey === 'vendor') {
    const toggle = (key, label) => <div key={key} className="space-y-1.5"><label className="block text-xs font-medium text-slate-600">{label} <span className="text-slate-400" title={label}>ⓘ</span></label><div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"><span className="text-sm text-slate-700">{label}</span><NavyToggle checked={!!form[key]} onChange={value => set(key, value)} /></div></div>;
    const checkbox = (key, label) => <label key={key} className="flex cursor-pointer items-start gap-2.5 px-3 py-2"><input type="checkbox" checked={!!form[key]} onChange={event => set(key, event.target.checked)} className="mt-0.5 h-4 w-4 accent-teal-600" /><span className="text-sm text-slate-700">{label}</span></label>;

    return <div className="w-full space-y-5 pb-8">
      <div><h1 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Icon size={22} className="text-[#1a3a8a]" />Business Setup</h1><p className="mt-1 text-sm text-slate-500">Vendor settings</p></div>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}>
        <h2 className="font-semibold text-slate-800">General Setup</h2><p className="mt-1 text-xs text-slate-500">Manage the basic settings that control how vendors operate in your platform.</p>
        <div className="mt-5 grid gap-x-5 gap-y-4 rounded-lg bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3">
          {toggle('vendorCanCancelOrder', 'Can A Vendor Cancel Order?')}
          {toggle('vendorRegistrationEnabled', 'Vendor self registration')}
          {toggle('vendorProductGalleryEnabled', 'Product Gallery')}
          {toggle('vendorCanAccessAllProducts', 'Access all products')}
          {toggle('vendorCanReplyReviews', 'Vendor Can Reply Review')}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-800">Need Approval For</h2><p className="mt-1 text-xs text-slate-500">Require admin approval before vendor product changes are displayed to customers.</p></div><div className="flex min-w-44 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"><span className="text-sm text-slate-600">Status</span><NavyToggle checked={!!form.vendorApprovalRequired} onChange={value => set('vendorApprovalRequired', value)} /></div></div>
        <div className="mt-4 space-y-4 rounded-lg bg-slate-50 p-4">
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2">
            <div>{checkbox('vendorApprovalNewProduct', 'Add New Product')}<p className="pl-9 text-xs text-slate-500">Admin approval is required when a vendor submits a new product.</p></div>
            <div>{checkbox('vendorApprovalExistingProduct', 'Update Existing Product')}<p className="pl-9 text-xs text-slate-500">Admin approval is required when a vendor updates an existing product.</p></div>
          </div>
          <div><p className="mb-2 text-xs font-semibold text-slate-600">Available Option for Update Existing Product <span className="text-rose-500">*</span></p><div className="grid gap-1 rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-3">{checkbox('vendorUpdatePriceAllowed', 'Update product price')}{checkbox('vendorUpdateVariationAllowed', 'Update product variation')}{checkbox('vendorUpdateProductDetailsAllowed', 'Update anything in product details')}</div></div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}>
        <h2 className="font-semibold text-slate-800">Cash in Hand Controls</h2><p className="mt-1 text-xs text-slate-500">Set vendor cash collection limits.</p>
        <div className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3">
          {toggle('cashInHandEnabled', 'Cash In Hand Overflow')}
          <PaymentField label="Maximum Amount To Hold Cash In Hand (₹)" type="number" value={form.cashInHandMax ?? ''} onChange={value => set('cashInHandMax', value === '' ? '' : Number(value))} />
          <PaymentField label="Minimum Amount To Pay (₹)" type="number" value={form.cashInHandMin ?? ''} onChange={value => set('cashInHandMin', value === '' ? '' : Number(value))} />
        </div>
        <p className="mt-4 rounded-md bg-blue-50 px-3 py-3 text-xs text-blue-800">To set up vendor cash withdrawal methods, visit <Link to="/settings/disbursement" className="font-semibold underline">Disbursement</Link>.</p>
      </section>

      <div className="flex justify-end gap-2"><button type="button" onClick={() => load()} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium ${listBtnOutline}`}><RotateCcw size={14} />Reset</button><button type="button" onClick={handleSave} disabled={saving} className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={14} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Information'}</button></div>
    </div>;
  }

  if (pageKey === 'orders') {
    const reasons = Array.isArray(form.orderCancellationReasons) ? form.orderCancellationReasons : [];
    const setToggle = (key, label) => <div key={key} className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"><span className="text-sm text-slate-700">{label}</span><NavyToggle checked={!!form[key]} onChange={value => set(key, value)} /></div>;
    const setRadio = (key, choices) => <div className="flex min-h-11 flex-wrap items-center gap-5 rounded-md border border-slate-200 bg-white px-3 py-2">{choices.map(([value, label]) => <label key={value} className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="radio" name={key} checked={(form[key] || choices[0][0]) === value} onChange={() => set(key, value)} className="accent-[#2947a8]" />{label}</label>)}</div>;
    const updateReason = () => {
      if (!String(reasonDraft[reasonLanguage] || '').trim() || !reasonDraft.userType) return;
      const next = { ...reasonDraft, id: editingReasonId || String(Date.now()) };
      set('orderCancellationReasons', editingReasonId ? reasons.map(item => item.id === editingReasonId ? next : item) : [...reasons, next]);
      setReasonDraft({ default: '', en: '', hi: '', userType: '', status: true });
      setEditingReasonId('');
    };
    const editReason = reason => {
      setReasonDraft({ default: '', en: '', hi: '', status: true, ...reason });
      setEditingReasonId(reason.id);
      setReasonLanguage(reason.default ? 'default' : reason.en ? 'en' : 'hi');
    };

    return <div className="w-full space-y-5 pb-8">
      <div><h1 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Icon size={22} className="text-[#1a3a8a]" />Business Settings</h1></div>
      <p className="rounded-md bg-blue-50 px-4 py-3 text-xs text-blue-800">All orders can be viewed and managed from the <Link to="/orders" className="font-semibold underline">All Orders</Link> page.</p>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}>
        <h2 className="font-semibold text-slate-800">Order Type</h2><p className="mt-1 text-xs text-slate-600">Choose how customers can place orders.</p>
        <div className="mt-4 space-y-4 rounded-lg bg-slate-50 p-4">
          <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-3">
            <OrderChoice checked={form.homeDeliveryEnabled !== false} onChange={value => set('homeDeliveryEnabled', value)} title="Home Delivery" description="Customers can choose home delivery from the app or website." />
            <OrderChoice checked={form.takeawayEnabled !== false} onChange={value => set('takeawayEnabled', value)} title="Takeaway" description="Customers can choose takeaway during checkout." />
            <OrderChoice checked={form.scheduledOrderEnabled !== false} onChange={value => set('scheduledOrderEnabled', value)} title="Scheduled Order" description="Customers can place an order for a preferred time." />
          </div>
          <label className="block text-xs font-medium text-slate-600">Time Interval For Scheduled Delivery <span title="Minimum time between available scheduled slots">ⓘ</span><div className="mt-1 flex overflow-hidden rounded-md border border-slate-200 bg-white"><input type="number" min="1" value={form.scheduledOrderInterval ?? 1} onChange={event => set('scheduledOrderInterval', Number(event.target.value))} className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none" /><select value={form.scheduledOrderIntervalUnit || 'Hour'} onChange={event => set('scheduledOrderIntervalUnit', event.target.value)} className="border-l border-slate-200 bg-slate-50 px-3 text-sm"><option>Hour</option><option>Minute</option><option>Day</option></select></div></label>
          <p className="rounded-md bg-amber-50 px-3 py-3 text-xs text-slate-700">At least one order delivery method should be enabled.</p>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}>
        <h2 className="font-semibold text-slate-800">Notification Setup</h2><p className="mt-1 text-xs text-slate-500">Manage order notifications for administrators.</p>
        <div className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-2"><div>{setToggle('adminOrderNotificationEnabled', 'Order Notification for Admin')}</div><label className="block text-xs font-medium text-slate-600">Order Notification Type<div className="mt-1">{setRadio('adminOrderNotificationType', [['Manual', 'Manual'], ['Firebase', 'Firebase']])}</div></label></div>
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-3 text-xs text-slate-700">Firebase notifications require Firebase configuration and notification messages to be set up.</p>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-800">Free Delivery Setup</h2><p className="mt-1 text-xs text-slate-500">Enable this option to offer free delivery.</p></div><NavyToggle checked={!!form.freeDeliveryEnabled} onChange={value => set('freeDeliveryEnabled', value)} /></div>
        <div className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-2"><label className="block text-xs font-medium text-slate-600">Choose Free Delivery Option<div className="mt-1">{setRadio('freeDeliveryOption', [['all', 'Set free delivery for all stores'], ['specific', 'Set specific criteria']])}</div></label><p className="flex items-center rounded-lg bg-sky-100 px-4 py-3 text-xs text-slate-700">When active, the business bears the delivery cost.</p></div>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-800">Enable Extra Packaging Charge</h2><p className="mt-1 text-xs text-slate-500">Add an extra packaging fee to eligible orders.</p></div><NavyToggle checked={!!form.extraPackagingChargeEnabled} onChange={value => set('extraPackagingChargeEnabled', value)} /></div>{form.extraPackagingChargeEnabled && <PaymentField label="Extra Packaging Charge" type="number" value={form.extraPackagingCharge ?? 0} onChange={value => set('extraPackagingCharge', Number(value))} />}</section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}><h2 className="font-semibold text-slate-800">Other Setup</h2><p className="mt-1 text-xs text-slate-500">Configure order placement and delivery verification.</p><div className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-3"><div>{setToggle('placeOrderByPrescription', 'Place Order by Prescription')}</div><div>{setToggle('orderDeliveryVerification', 'Order delivery verification')}</div><label className="block text-xs font-medium text-slate-600">Who Will Confirm Order<div className="mt-1">{setRadio('orderConfirmationBy', [['Store', 'Store'], ['Deliveryman', 'Deliveryman']])}</div></label></div></section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}>
        <h2 className="font-semibold text-slate-800">Setup Order Cancellation Messages</h2><p className="mt-1 text-xs text-slate-500">Set cancellation reasons customers can choose when cancelling an order.</p>
        <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <div className="flex gap-5 border-b border-slate-200">{[['default', 'Default'], ['en', 'English (EN)'], ['hi', 'Hindi (HI)']].map(([value, label]) => <button key={value} type="button" onClick={() => setReasonLanguage(value)} className={`border-b-2 px-1 pb-2 text-sm ${reasonLanguage === value ? 'border-[#2947a8] font-semibold text-[#2947a8]' : 'border-transparent text-slate-500'}`}>{label}</button>)}</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2"><label className="block text-xs font-medium text-slate-600">Order Cancellation Reason ({reasonLanguage === 'hi' ? 'Hindi' : reasonLanguage === 'en' ? 'English' : 'Default'})<input value={reasonDraft[reasonLanguage] || ''} onChange={event => setReasonDraft(current => ({ ...current, [reasonLanguage]: event.target.value }))} placeholder="Ex: Item is broken" className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label><label className="block text-xs font-medium text-slate-600">User Type<select value={reasonDraft.userType} onChange={event => setReasonDraft(current => ({ ...current, userType: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Select user type</option><option value="Customer">Customer</option><option value="Store">Store</option><option value="Deliveryman">Deliveryman</option></select></label></div>
          <div className="mt-3 flex justify-end"><button type="button" onClick={updateReason} className={`rounded-lg px-4 py-2 text-sm font-semibold ${listBtnNavy}`}>{editingReasonId ? 'Update Reason' : 'Add Reason'}</button></div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border" style={{ borderColor: CARD_BORDER }}><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">Reason</th><th className="px-4 py-3">User Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{reasons.map(reason => <tr key={reason.id} className="border-t border-slate-100"><td className="px-4 py-3">{reason.default || reason.en || reason.hi}</td><td className="px-4 py-3">{reason.userType}</td><td className="px-4 py-3"><NavyToggle checked={reason.status !== false} onChange={value => set('orderCancellationReasons', reasons.map(item => item.id === reason.id ? { ...item, status: value } : item))} /></td><td className="px-4 py-3"><button type="button" aria-label="Edit reason" onClick={() => editReason(reason)} className="mr-3 text-blue-700"><Pencil size={15} /></button><button type="button" aria-label="Delete reason" onClick={() => set('orderCancellationReasons', reasons.filter(item => item.id !== reason.id))} className="text-rose-600"><Trash2 size={15} /></button></td></tr>)}{reasons.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No cancellation reasons added.</td></tr>}</tbody></table></div>
      </section>

      <div className="flex justify-end gap-2"><button type="button" onClick={() => { setReasonDraft({ default: '', en: '', hi: '', userType: '', status: true }); setEditingReasonId(''); load(); }} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium ${listBtnOutline}`}><RotateCcw size={14} />Reset</button><button type="button" onClick={handleSave} disabled={saving} className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={14} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Information'}</button></div>
    </div>;
  }

  if (pageKey === 'refund') {
    const reasons = Array.isArray(form.refundReasons) ? form.refundReasons : [];
    const visibleReasons = reasons.filter(reason => [reason.default, reason.en, reason.hi].some(value => String(value || '').toLowerCase().includes(refundReasonSearch.toLowerCase())));
    const saveReasonList = async nextReasons => {
      set('refundReasons', nextReasons);
      setSaving(true);
      try {
        const { data } = await api.put('/settings/business', { refundReasons: nextReasons });
        setForm(current => ({ ...current, ...data }));
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2000);
      } catch {
        alert('Refund reason save nahi hua');
      } finally {
        setSaving(false);
      }
    };
    const submitReason = async event => {
      event.preventDefault();
      if (!String(refundReasonDraft[refundReasonLanguage] || '').trim()) return;
      const next = { ...refundReasonDraft, id: editingRefundReasonId || String(Date.now()) };
      const nextReasons = editingRefundReasonId ? reasons.map(reason => reason.id === editingRefundReasonId ? next : reason) : [...reasons, next];
      await saveReasonList(nextReasons);
      setRefundReasonDraft({ default: '', en: '', hi: '', status: true });
      setEditingRefundReasonId('');
    };

    return <div className="w-full space-y-5 pb-8">
      <div><h1 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Icon size={22} className="text-[#1a3a8a]" />Business Settings</h1></div>
      <div className="flex items-center justify-between gap-4 rounded-xl border bg-white px-4 py-3" style={{ borderColor: CARD_BORDER }}><div><h2 className="text-sm font-semibold text-slate-800">Refund Request Mode</h2><p className="mt-1 text-xs text-slate-600">Customers can request a refund only when a refund reason is available.</p></div><div className="flex min-w-56 items-center justify-between rounded-lg border border-slate-200 px-3 py-2"><span className="text-sm text-slate-600">Refund Request Mode</span><NavyToggle checked={!!form.refundRequestMode} onChange={value => set('refundRequestMode', value)} /></div></div>

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: CARD_BORDER }}>
        <div className="border-b px-5 py-4" style={{ borderColor: CARD_BORDER }}><h2 className="font-semibold text-slate-800">Add Refund Reason</h2><p className="mt-1 text-xs text-slate-600">Add reasons customers can select when submitting a refund request.</p></div>
        <form onSubmit={submitReason} className="space-y-4 bg-slate-50 p-5">
          <div className="flex gap-5 border-b border-slate-200">{[['default', 'Default'], ['en', 'English (EN)'], ['hi', 'Hindi (HI)']].map(([value, label]) => <button key={value} type="button" onClick={() => setRefundReasonLanguage(value)} className={`border-b-2 px-1 pb-2 text-sm ${refundReasonLanguage === value ? 'border-[#2947a8] font-semibold text-[#2947a8]' : 'border-transparent text-slate-500'}`}>{label}</button>)}</div>
          <label className="block text-xs font-medium text-slate-600">Refund Reason ({refundReasonLanguage === 'hi' ? 'Hindi' : refundReasonLanguage === 'en' ? 'English' : 'Default'}) <span className="text-slate-400" title="Enter a reason customers can choose">ⓘ</span><span className="text-rose-500"> *</span><textarea required maxLength={150} rows={3} value={refundReasonDraft[refundReasonLanguage] || ''} onChange={event => setRefundReasonDraft(current => ({ ...current, [refundReasonLanguage]: event.target.value }))} placeholder="Ex: Item is broken" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400" /><span className="mt-1 block text-right text-xs text-slate-400">{(refundReasonDraft[refundReasonLanguage] || '').length}/150</span></label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => { setRefundReasonDraft({ default: '', en: '', hi: '', status: true }); setEditingRefundReasonId(''); }} className={`rounded-lg px-4 py-2.5 text-sm ${listBtnOutline}`}>Reset</button><button type="submit" disabled={saving} className={`rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}>{saving ? 'Saving...' : editingRefundReasonId ? 'Update' : 'Save'}</button></div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: CARD_BORDER }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: CARD_BORDER }}><h2 className="font-semibold text-slate-800">Refund Reason List ({visibleReasons.length})</h2><input value={refundReasonSearch} onChange={event => setRefundReasonSearch(event.target.value)} placeholder="Search refund reasons" className="w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">SL</th><th className="px-5 py-3">Reason</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Action</th></tr></thead><tbody>{visibleReasons.map((reason, index) => <tr key={reason.id || index} className="border-t border-slate-100"><td className="px-5 py-3">{index + 1}</td><td className="px-5 py-3">{reason.default || reason.en || reason.hi}</td><td className="px-5 py-3"><NavyToggle checked={reason.status !== false} onChange={value => saveReasonList(reasons.map(item => item.id === reason.id ? { ...item, status: value } : item))} /></td><td className="px-5 py-3"><button type="button" aria-label="Edit refund reason" onClick={() => { setRefundReasonDraft({ default: '', en: '', hi: '', status: true, ...reason }); setEditingRefundReasonId(reason.id); setRefundReasonLanguage(reason.default ? 'default' : reason.en ? 'en' : 'hi'); }} className="mr-3 text-blue-700"><Pencil size={15} /></button><button type="button" aria-label="Delete refund reason" onClick={() => saveReasonList(reasons.filter(item => item.id !== reason.id))} className="text-rose-600"><Trash2 size={15} /></button></td></tr>)}{visibleReasons.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No refund reasons found.</td></tr>}</tbody></table></div>
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm" style={{ borderColor: CARD_BORDER }}><h2 className="font-semibold text-slate-800">Refund Policy</h2><p className="mt-1 text-xs text-slate-500">Existing refund eligibility and processing policy settings are preserved.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5"><span className="text-sm text-slate-700">Enable Refunds</span><NavyToggle checked={!!form.refundEnabled} onChange={value => set('refundEnabled', value)} /></div><PaymentField label="Refund Window (days)" type="number" value={form.refundWindowDays ?? 7} onChange={value => set('refundWindowDays', Number(value))} /><PaymentField label="Refund Processing Time (days)" type="number" value={form.refundProcessingDays ?? 0} onChange={value => set('refundProcessingDays', Number(value))} /><PaymentField label="Auto Approve Below Amount" type="number" value={form.refundAutoApproveLimit ?? 0} onChange={value => set('refundAutoApproveLimit', Number(value))} /><div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5"><span className="text-sm text-slate-700">Require Item Return</span><NavyToggle checked={!!form.refundReturnRequired} onChange={value => set('refundReturnRequired', value)} /></div></div><div className="mt-4 flex justify-end"><button type="button" onClick={handleSave} disabled={saving} className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={14} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Refund Policy'}</button></div></section>
    </div>;
  }

  if (pageKey === 'deliveryman') {
    const toggle = (key, label) => <div key={key} className="space-y-1.5"><label className="block text-xs font-medium text-slate-600">{label} <span title={label} className="text-slate-400">ⓘ</span></label><div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"><span className="text-sm text-slate-700">Status</span><NavyToggle checked={!!form[key]} onChange={value => set(key, value)} /></div></div>;
    const cashField = (key, label, fallback) => <PaymentField label={label} type="number" value={form[key] ?? fallback} onChange={value => set(key, Number(value))} />;

    return <div className="w-full space-y-5 pb-8">
      <div><h1 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Icon size={22} className="text-[#1a3a8a]" />Business Settings</h1></div>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}>
        <h2 className="font-semibold text-slate-800">Basic Setup</h2><p className="mt-1 text-xs text-slate-600">Enable the required options to allow deliverymen to access these app features.</p>
        <div className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-3">{toggle('deliverymanRegistrationEnabled', 'Deliveryman Self Registration')}{cashField('deliverymanMaxAssignedOrders', 'Maximum Assigned Order Limit *', 2)}{toggle('deliverymanCanCancelOrder', 'Deliveryman Can Cancel Order?')}</div>
        <p className="mt-4 rounded-md bg-blue-50 px-3 py-3 text-xs text-blue-800">Configure the registration form from the <Link to="/settings/employees" className="font-semibold underline">Deliveryman Registration Form</Link> page.</p>
        <div className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-3">{toggle('deliverymanAutoAssign', 'Automatically Assign Rider')}{cashField('deliverymanCommissionRate', 'Deliveryman Commission (%)', 15)}{cashField('deliverymanAssignmentRadiusKm', 'Rider Assignment Radius (km)', 10)}{toggle('deliverymanCanReject', 'Allow Rider to Reject Orders')}</div>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-slate-800">Tips For Deliveryman</h2><p className="mt-1 text-xs text-slate-600">Customers can add a tip for delivery during checkout.</p></div><div className="min-w-44">{toggle('deliverymanTipsEnabled', 'Status')}</div></div><p className="mt-4 rounded-md bg-amber-50 px-3 py-3 text-xs text-slate-700">Tips go directly to deliveryman earnings; admin does not receive commission from tips.</p></section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}><h2 className="font-semibold text-slate-800">Deliveryman App Setup</h2><p className="mt-1 text-xs text-slate-500">Set up delivery partner app features.</p><div className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-2">{toggle('deliverymanShowEarnings', 'Show Earnings in App')}{toggle('deliverymanProofOfDelivery', 'Take Picture for Delivery Completing')}</div></section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}><h2 className="font-semibold text-slate-800">Cash in Hand Controls</h2><p className="mt-1 text-xs text-slate-500">Configure cash-in-hand management for delivery.</p><div className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-3">{toggle('deliverymanSuspendCashOverflow', 'Suspend On Cash In Hand Overflow')}{cashField('deliverymanCashInHandMax', 'Cash In Hand Max Amount (₹) *', 1500)}{cashField('deliverymanCashMinPayout', 'Minimum Payable Amount (₹) *', 0)}</div><p className="mt-4 rounded-md bg-blue-50 px-3 py-3 text-xs text-blue-800">Set the maximum cash amount a deliveryman can hold and the minimum payment threshold.</p></section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-800">Loyalty Point</h2><p className="mt-1 text-xs text-slate-600">If enabled, deliverymen earn points for each successful delivery.</p></div><div className="flex items-center gap-3"><button type="button" onClick={() => setDeliveryLoyaltyExpanded(value => !value)} className="text-sm font-medium text-blue-700">{deliveryLoyaltyExpanded ? 'Hide' : 'View'}⌄</button><NavyToggle checked={!!form.deliverymanLoyaltyEnabled} onChange={value => set('deliverymanLoyaltyEnabled', value)} /></div></div>{deliveryLoyaltyExpanded && <div className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-3">{cashField('deliverymanLoyaltyEarnPerOrder', 'Loyalty Point Earn Per Order *', 10)}{cashField('deliverymanLoyaltyCurrencyEquivalent', '₹1.00 Equivalent To Points *', 10)}{cashField('deliverymanLoyaltyMinimumConvert', 'Minimum Point Required To Convert *', 200)}</div>}</section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-800">Deliveryman Referral Earning Settings</h2><p className="mt-1 text-xs text-slate-600">Allow deliverymen to refer friends and family using a unique code and earn rewards.</p></div><div className="flex items-center gap-3"><button type="button" onClick={() => setDeliveryReferralExpanded(value => !value)} className="text-sm font-medium text-blue-700">{deliveryReferralExpanded ? 'Hide' : 'View'}⌄</button><NavyToggle checked={!!form.deliverymanReferralEnabled} onChange={value => set('deliverymanReferralEnabled', value)} /></div></div>{deliveryReferralExpanded && <div className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-2"><div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm font-semibold text-slate-800">Who Share the Code</p><p className="mt-1 text-xs text-slate-500">Set the reward earned by a deliveryman for each successful referral.</p><div className="mt-3">{cashField('deliverymanReferralEarn', 'Earning Per Referral (₹)', 20)}</div></div><div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm font-semibold text-slate-800">Who Use the Code</p><p className="mt-1 text-xs text-slate-500">Set the wallet bonus for a new deliveryman who uses a referral code.</p><div className="mt-3">{cashField('deliverymanReferralBonus', 'Bonus In Wallet (₹)', 50)}</div></div></div>}</section>

      <div className="flex justify-end gap-2"><button type="button" onClick={() => load()} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium ${listBtnOutline}`}><RotateCcw size={14} />Reset</button><button type="button" onClick={handleSave} disabled={saving} className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={14} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Information'}</button></div>
    </div>;
  }

  if (pageKey === 'customer') {
    const toggle = (key, label) => <div key={key} className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"><span className="text-sm text-slate-700">{label}</span><NavyToggle checked={!!form[key]} onChange={value => set(key, value)} /></div>;
    const field = (key, label, fallback = 0) => <PaymentField label={label} type="number" value={form[key] ?? fallback} onChange={value => set(key, Number(value))} />;
    const viewButton = (expanded, onClick) => <button type="button" onClick={onClick} className="text-sm font-medium text-blue-700">{expanded ? 'Hide' : 'View'}⌄</button>;

    return <div className="w-full space-y-5 pb-8">
      <div><h1 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Icon size={22} className="text-[#1a3a8a]" />Business Settings</h1></div>
      <p className="rounded-md bg-blue-50 px-4 py-3 text-xs text-blue-800">See all customers and manage them from the <Link to="/customers" className="font-semibold underline">All Customer List</Link> page.</p>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-slate-800">Guest Checkout</h2><p className="mt-1 text-xs text-slate-600">Allow customers to place orders without creating an account.</p></div><div className="min-w-44">{toggle('customerGuestCheckout', 'Status')}</div></div><p className="mt-4 rounded-md bg-blue-50 px-3 py-3 text-xs text-slate-700">When disabled, customers must sign in before placing orders.</p></section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}><h2 className="font-semibold text-slate-800">General Setup</h2><p className="mt-1 text-xs text-slate-500">Configure customer account and app preferences.</p><div className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-3">{toggle('customerRegistrationEnabled', 'Customer Registration')}{toggle('customerEmailVerification', 'Verify Customer Email')}{toggle('customerPhoneVerification', 'Verify Customer Phone')}{toggle('customerFoodPreferenceEnabled', 'Customer’s Food Preference')}</div></section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-800">Customer Wallet</h2><p className="mt-1 text-xs text-slate-600">When active, customers can earn and use their wallet balance.</p></div><div className="flex items-center gap-3">{viewButton(customerWalletExpanded, () => setCustomerWalletExpanded(value => !value))}<NavyToggle checked={!!form.customerWalletEnabled} onChange={value => set('customerWalletEnabled', value)} /></div></div>{customerWalletExpanded && <div className="mt-4 space-y-4 rounded-lg bg-slate-50 p-4"><div className="grid gap-4 md:grid-cols-2">{toggle('customerRefundToWalletEnabled', 'Refund to Wallet')}{toggle('customerAddFundsEnabled', 'Add Fund to Wallet')}</div><p className="rounded-md bg-blue-50 px-3 py-3 text-xs text-slate-700">Customer wallet balances can be viewed from customer details. Use the customer wallet page to add funds.</p></div>}</section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-800">Customer Loyalty Point</h2><p className="mt-1 text-xs text-slate-600">If enabled, customers earn points after each purchase.</p></div><div className="flex items-center gap-3">{viewButton(customerLoyaltyExpanded, () => setCustomerLoyaltyExpanded(value => !value))}<NavyToggle checked={!!form.customerLoyaltyEnabled} onChange={value => set('customerLoyaltyEnabled', value)} /></div></div>{customerLoyaltyExpanded && <div className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-3">{field('customerLoyaltyCurrencyEquivalent', '1 INR Equivalent Point Amount', 10)}{field('customerLoyaltyEarnPercent', 'Loyalty Point Earn Per Order (%)', 10)}{field('customerLoyaltyMinimumConvert', 'Minimum Points Required To Convert', 100)}</div>}<p className="mt-4 rounded-md bg-blue-50 px-3 py-3 text-xs text-blue-800">Customer loyalty point report is available from the Loyalty Point Report page.</p></section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-800">Customer Referral Earning Settings</h2><p className="mt-1 text-xs text-slate-600">Customers receive wallet rewards for sharing their referral code.</p></div><div className="flex items-center gap-3">{viewButton(customerReferralExpanded, () => setCustomerReferralExpanded(value => !value))}<NavyToggle checked={!!form.customerReferralEnabled} onChange={value => set('customerReferralEnabled', value)} /></div></div>{customerReferralExpanded && <div className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-2"><div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"><div><h3 className="text-sm font-semibold text-slate-800">Who Share the Code</h3><p className="mt-1 text-xs text-slate-500">Reward for a customer whose referral completes signup and first order.</p></div>{field('customerReferralEarn', 'Earning Per Referral (₹)', 20)}</div><div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"><div><h3 className="text-sm font-semibold text-slate-800">Who Use the Code</h3><p className="mt-1 text-xs text-slate-500">Discount for a new customer using a referral code.</p></div>{toggle('customerReferralDiscountEnabled', 'Customer will get Discount on first order') }<div className="grid gap-3 sm:grid-cols-2">{field('customerReferralDiscountPercent', 'Discount Amount (%)', 10)}{field('customerReferralDiscountValidityMonths', 'Validity (months)', 1)}</div></div></div>}</section>

      <div className="flex justify-end gap-2"><button type="button" onClick={() => load()} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium ${listBtnOutline}`}><RotateCcw size={14} />Reset</button><button type="button" onClick={handleSave} disabled={saving} className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={14} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Information'}</button></div>
    </div>;
  }

  if (pageKey === 'priority') {
    const statusControl = (key, label, defaultOn = false) => <div className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"><span className="text-sm text-slate-700">{label}</span><NavyToggle checked={form[key] === undefined ? defaultOn : !!form[key]} onChange={value => set(key, value)} /></div>;
    const exclusiveStatus = (key, pairedKey, label, defaultOn = false) => <div className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"><span className="text-sm text-slate-700">{label}</span><NavyToggle checked={form[key] === undefined ? defaultOn : !!form[key]} onChange={enabled => setForm(current => ({ ...current, [key]: enabled, [pairedKey]: !enabled }))} /></div>;
    const radioSet = (key, options) => <div className="space-y-1 rounded-md border border-slate-200 bg-white p-3">{options.map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-slate-700"><input type="radio" name={key} checked={(form[key] || options[0][0]) === value} onChange={() => set(key, value)} className="h-4 w-4 accent-[#2947a8]" />{label}</label>)}</div>;
    const sortOptions = [['orders', 'Sort by orders'], ['latest', 'Sort by latest created'], ['oldest', 'Sort by first created'], ['reviews', 'Sort by reviews count'], ['ratings', 'Sort by ratings'], ['az', 'Sort by Alphabetical (A to Z)'], ['za', 'Sort by Alphabetical (Z to A)']];
    const productLists = new Set(['mostPopularItem', 'bestReviewedItem', 'justForYou', 'categorySubcategoryProducts', 'productSearch', 'basicMedicineNearby', 'brandWiseProducts']);

    return <div className="w-full space-y-5 pb-8">
      <div><h1 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Icon size={22} className="text-[#1a3a8a]" />Business Settings</h1></div>
      <p className="rounded-md bg-blue-50 px-4 py-3 text-xs text-blue-800">After changing settings on this page, click Save Information to apply them.</p>

      <section className="grid gap-4 rounded-xl border bg-white p-4 shadow-sm lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]" style={{ borderColor: CARD_BORDER }}>
        <div className="py-4"><h2 className="font-semibold text-slate-800">Select System</h2><p className="mt-2 text-sm text-slate-600">Select the listing systems you want to configure.</p></div>
        <div className="space-y-3 rounded-lg bg-slate-50 p-4">
          <div><h3 className="text-sm font-medium text-slate-800">Use default sorting list</h3><p className="mt-1 text-xs text-slate-600">Use the platform’s standard priority for each section.</p>{exclusiveStatus('priorityUseDefaultSorting', 'priorityUseCustomSorting', 'Status', true)}</div>
          <div><h3 className="text-sm font-medium text-slate-800">Use custom sorting list</h3><p className="mt-1 text-xs text-slate-600">Set customized conditions for selected sections.</p>{exclusiveStatus('priorityUseCustomSorting', 'priorityUseDefaultSorting', 'Status')}</div>
        </div>
      </section>

      {PRIORITY_SECTIONS.map(([id, title, description, defaultDescription]) => {
        const defaultKey = `priority_${id}_default`;
        const customKey = `priority_${id}_custom`;
        const sortKey = `priority_${id}_sort`;
        const stockKey = `priority_${id}_stockHandling`;
        const storeKey = `priority_${id}_storeHandling`;
        return <section key={id} className="grid gap-4 rounded-xl border bg-white p-4 shadow-sm lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]" style={{ borderColor: CARD_BORDER }}>
          <div className="py-4"><h2 className="font-semibold text-slate-800">{title}</h2><p className="mt-2 text-sm leading-5 text-slate-600">{description}</p></div>
          <div className="space-y-3 rounded-lg bg-slate-50 p-4">
            <div><h3 className="text-sm font-medium text-slate-800">Use default sorting list</h3><p className="mt-1 text-xs text-slate-600">This section is currently sorted by {defaultDescription}.</p>{exclusiveStatus(defaultKey, customKey, 'Status', true)}</div>
            <div><h3 className="text-sm font-medium text-slate-800">Use custom sorting list</h3><p className="mt-1 text-xs text-slate-600">Set customized conditions to show this list.</p>{exclusiveStatus(customKey, defaultKey, 'Status')}</div>
            {form[customKey] && <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3"><div><h4 className="mb-1 text-xs font-semibold text-slate-600">Sort order</h4>{radioSet(sortKey, sortOptions)}</div>{productLists.has(id) && <><div><h4 className="mb-1 text-xs font-semibold text-slate-600">Out-of-stock products</h4>{radioSet(stockKey, [['last', 'Show stockout products last'], ['remove', 'Remove stockout products from the list'], ['none', 'None']])}</div><div><h4 className="mb-1 text-xs font-semibold text-slate-600">Temporarily unavailable stores</h4>{radioSet(storeKey, [['last', 'Show products last if store is temporarily off'], ['remove', 'Remove products if store is temporarily off'], ['none', 'None']])}</div></>}</div>}
          </div>
        </section>;
      })}

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}><div className="grid gap-4 sm:grid-cols-2"><PaymentField label="Default Priority Rank" type="number" value={form.priorityDefaultRank ?? 0} onChange={value => set('priorityDefaultRank', Number(value))} /><div className="grid gap-3 sm:grid-cols-2">{statusControl('priorityListingEnabled', 'Priority Listings')}{statusControl('priorityFeaturedEnabled', 'Featured Listings')}{statusControl('prioritySponsoredEnabled', 'Sponsored Listings')}</div></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => load()} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium ${listBtnOutline}`}><RotateCcw size={14} />Reset</button><button type="button" onClick={handleSave} disabled={saving} className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={14} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Information'}</button></div></section>
    </div>;
  }

  if (pageKey === 'disbursement') {
    const saveBankVerification = async () => {
      if (form.razorpayFullAccountVerification && !String(form.razorpaySourceAccountNumber || '').trim()) {
        alert('Razorpay source account number bharein.');
        return;
      }
      setSaving(true);
      try {
        const payload = {
          bankAccountVerificationEnabled: !!form.bankAccountVerificationEnabled,
          razorpayFullAccountVerification: !!form.razorpayFullAccountVerification,
          razorpaySourceAccountNumber: form.razorpaySourceAccountNumber || '',
        };
        const { data } = await api.put('/settings/business', payload);
        setForm(current => ({ ...current, ...data }));
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2000);
      } catch {
        alert('Bank verification settings save nahi hui.');
      } finally {
        setSaving(false);
      }
    };

    return <div className="w-full space-y-5 pb-8">
      <div><h1 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Icon size={22} className="text-[#1a3a8a]" />Disbursement Setup</h1><p className="mt-1 text-sm text-slate-600">Manage and configure how vendors and delivery partners receive payouts.</p></div>
      <section className="grid gap-4 rounded-xl border bg-white p-4 shadow-sm lg:grid-cols-[minmax(280px,0.65fr)_minmax(0,1.35fr)]" style={{ borderColor: CARD_BORDER }}><div><h2 className="font-semibold text-slate-800">Disbursement Request Type</h2><p className="mt-1 text-sm text-slate-600">Select Manual to approve payouts individually, or Automated to process them automatically.</p></div><div className="flex min-h-12 flex-wrap items-center gap-8 rounded-md border border-slate-200 bg-white px-4 py-2"><label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="radio" name="disbursementRequestType" checked={(form.disbursementRequestType || 'Manual') === 'Manual'} onChange={() => set('disbursementRequestType', 'Manual')} className="h-4 w-4 accent-[#2947a8]" />Manual Request</label><label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="radio" name="disbursementRequestType" checked={form.disbursementRequestType === 'Automated'} onChange={() => set('disbursementRequestType', 'Automated')} className="h-4 w-4 accent-[#2947a8]" />Automated Request</label></div></section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}><h2 className="font-semibold text-slate-800">Payout Schedule and Limits</h2><div className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3"><div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5"><span className="text-sm text-slate-700">Enable Disbursements</span><NavyToggle checked={!!form.disbursementEnabled} onChange={value => set('disbursementEnabled', value)} /></div><label className="block text-xs font-semibold text-slate-600">Payout Schedule<select value={form.disbursementSchedule || 'Weekly'} onChange={event => set('disbursementSchedule', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">{['Daily', 'Weekly', 'Biweekly', 'Monthly'].map(value => <option key={value}>{value}</option>)}</select></label><PaymentField label="Minimum Payout Amount" type="number" value={form.disbursementMinimum ?? 0} onChange={value => set('disbursementMinimum', Number(value))} /><PaymentField label="Processing Time (days)" type="number" value={form.disbursementProcessingDays ?? 0} onChange={value => set('disbursementProcessingDays', Number(value))} /><div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5"><span className="text-sm text-slate-700">Automatically Process Eligible Payouts</span><NavyToggle checked={!!form.disbursementAutoProcess} onChange={value => set('disbursementAutoProcess', value)} /></div></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => load()} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium ${listBtnOutline}`}><RotateCcw size={14} />Reset</button><button type="button" onClick={handleSave} disabled={saving} className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={14} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Information'}</button></div></section>

      <section className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}><h2 className="font-semibold text-slate-800">Bank Account Verification</h2><p className="mt-1 text-xs text-slate-600">When enabled, payout bank details can be verified before saving.</p><div className="mt-4 space-y-4"><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!form.bankAccountVerificationEnabled} onChange={event => set('bankAccountVerificationEnabled', event.target.checked)} className="h-4 w-4 accent-blue-700" />Enable bank account verification for disbursement methods</label><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!form.razorpayFullAccountVerification} onChange={event => set('razorpayFullAccountVerification', event.target.checked)} className="h-4 w-4 accent-blue-700" />Use Razorpay for full account number verification</label><PaymentField label="Razorpay Source Account Number" value={form.razorpaySourceAccountNumber || ''} onChange={value => set('razorpaySourceAccountNumber', value)} /><p className="text-xs text-slate-500">Required only when Razorpay verification is enabled. This account is used for penny-drop validation.</p><div className="flex justify-end"><button type="button" onClick={saveBankVerification} disabled={saving} className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={14} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Bank Verification Settings'}</button></div></div></section>
    </div>;
  }

  if (pageKey === 'automatedMessage') {
    const reasons = Array.isArray(form.automatedMessageReasons) ? form.automatedMessageReasons : DEFAULT_AUTOMATED_REASONS;
    const visibleReasons = reasons.filter(reason => [reason.default, reason.en, reason.hi].some(value => String(value || '').toLowerCase().includes(automatedReasonSearch.toLowerCase())));
    const saveReasons = async nextReasons => {
      setSaving(true);
      try {
        const { data } = await api.put('/settings/business', { automatedMessageReasons: nextReasons });
        setForm(current => ({ ...current, ...data }));
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2000);
      } catch {
        alert('Automated message reason save nahi hua.');
      } finally {
        setSaving(false);
      }
    };
    const submitReason = async event => {
      event.preventDefault();
      if (!String(automatedReasonDraft[automatedReasonLanguage] || '').trim()) return;
      const next = { ...automatedReasonDraft, id: editingAutomatedReasonId || String(Date.now()) };
      const updated = editingAutomatedReasonId ? reasons.map(item => item.id === editingAutomatedReasonId ? next : item) : [...reasons, next];
      await saveReasons(updated);
      setAutomatedReasonDraft({ default: '', en: '', hi: '', status: true });
      setEditingAutomatedReasonId('');
    };

    return <div className="w-full space-y-5 pb-8">
      <div className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}><h1 className="text-lg font-semibold text-slate-900">Automated Message/Reason</h1><p className="mt-1 text-sm text-slate-600">Set predefined reasons customers can choose when reporting an issue with a specific order.</p><p className="mt-4 rounded-md bg-blue-50 px-3 py-3 text-xs text-blue-800">All orders can be seen and managed from the <Link to="/orders" className="font-semibold underline">All Order List</Link> page.</p></div>

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: CARD_BORDER }}>
        <div className="border-b px-5 py-4" style={{ borderColor: CARD_BORDER }}><h2 className="font-semibold text-slate-800">Automated Message Setup</h2><p className="mt-1 text-xs text-slate-600">Add reasons customers can choose when reporting an order issue.</p></div>
        <form onSubmit={submitReason} className="space-y-4 bg-slate-50 p-5">
          <div className="flex gap-5 border-b border-slate-200">{[['default', 'Default'], ['en', 'English (EN)'], ['hi', 'Hindi (HI)']].map(([value, label]) => <button key={value} type="button" onClick={() => setAutomatedReasonLanguage(value)} className={`border-b-2 px-1 pb-2 text-sm ${automatedReasonLanguage === value ? 'border-[#2947a8] font-semibold text-[#2947a8]' : 'border-transparent text-slate-500'}`}>{label}</button>)}</div>
          <label className="block text-xs font-medium text-slate-600">Automated Message/Reason ({automatedReasonLanguage === 'hi' ? 'Hindi' : automatedReasonLanguage === 'en' ? 'English' : 'Default'}) <span className="text-slate-400" title="Text shown to customers when reporting an order issue">ⓘ</span><span className="text-rose-500"> *</span><textarea required maxLength={150} rows={4} value={automatedReasonDraft[automatedReasonLanguage] || ''} onChange={event => setAutomatedReasonDraft(current => ({ ...current, [automatedReasonLanguage]: event.target.value }))} placeholder="Ex: Enter the message" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400" /><span className="mt-1 block text-right text-xs text-slate-400">{(automatedReasonDraft[automatedReasonLanguage] || '').length}/150</span></label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => { setAutomatedReasonDraft({ default: '', en: '', hi: '', status: true }); setEditingAutomatedReasonId(''); }} className={`rounded-lg px-4 py-2.5 text-sm ${listBtnOutline}`}>Reset</button><button type="submit" disabled={saving} className={`rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}>{saving ? 'Saving...' : editingAutomatedReasonId ? 'Update' : 'Save'}</button></div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: CARD_BORDER }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50 px-5 py-4" style={{ borderColor: CARD_BORDER }}><h2 className="font-semibold text-slate-800">Message List <span className="ml-1 rounded bg-slate-200 px-2 py-0.5 text-xs">{visibleReasons.length}</span></h2><input value={automatedReasonSearch} onChange={event => setAutomatedReasonSearch(event.target.value)} placeholder="Search messages" className="w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">SL</th><th className="px-5 py-3">Message</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Action</th></tr></thead><tbody>{visibleReasons.map((reason, index) => <tr key={reason.id || index} className="border-t border-slate-100"><td className="px-5 py-3">{index + 1}</td><td className="px-5 py-3">{reason.default || reason.en || reason.hi}</td><td className="px-5 py-3"><NavyToggle checked={reason.status !== false} onChange={value => saveReasons(reasons.map(item => item.id === reason.id ? { ...item, status: value } : item))} /></td><td className="px-5 py-3"><button type="button" aria-label="Edit automated message" onClick={() => { setAutomatedReasonDraft({ default: '', en: '', hi: '', status: true, ...reason }); setEditingAutomatedReasonId(reason.id); setAutomatedReasonLanguage(reason.default ? 'default' : reason.en ? 'en' : 'hi'); }} className="mr-3 text-blue-700"><Pencil size={15} /></button><button type="button" aria-label="Delete automated message" onClick={() => saveReasons(reasons.filter(item => item.id !== reason.id))} className="text-rose-600"><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>
      </section>
      <div className="flex justify-end"><button type="button" onClick={handleSave} disabled={saving} className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={14} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Information'}</button></div>
    </div>;
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Icon size={22} className="text-[#1a3a8a]" /> {config.title}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{config.subtitle}</p>
      </div>

      {config.relatedLinks?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {config.relatedLinks.map(link => (
            <Link key={link.path} to={link.path} className="text-sm text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-lg">
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4" style={{ borderColor: CARD_BORDER }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {config.fields.map(field => {
            const span = field.span === 2 || field.type === 'toggle' ? 'sm:col-span-2' : '';
            if (field.type === 'toggle') {
              return (
                <label key={field.key} className={`flex items-center justify-between ${span}`}>
                  <span className="text-sm font-medium text-gray-800">{field.label}</span>
                  <NavyToggle checked={!!form[field.key]} onChange={v => set(field.key, v)} />
                </label>
              );
            }
            if (field.type === 'select') {
              return (
                <div key={field.key} className={span}>
                  <label className={labelCls}>{field.label}</label>
                  <select className={inputCls} value={form[field.key] || field.options[0]} onChange={e => set(field.key, e.target.value)}>
                    {field.options.map(opt => <option key={opt}>{opt}</option>)}
                  </select>
                </div>
              );
            }
            if (field.type === 'textarea') {
              return (
                <div key={field.key} className={span}>
                  <label className={labelCls}>{field.label}</label>
                  <textarea rows={3} className={inputCls} value={form[field.key] || ''} onChange={e => set(field.key, e.target.value)} />
                </div>
              );
            }
            return (
              <div key={field.key} className={span}>
                <label className={labelCls}>{field.label}</label>
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                  className={`${inputCls} ${field.readOnly ? 'bg-gray-50' : ''}`}
                  readOnly={field.readOnly}
                  value={form[field.key] ?? ''}
                  onChange={e => set(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                />
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {pageKey === 'backup' && (
            <button type="button" onClick={runBackupNow} className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold ${listBtnNavy}`}>
              Create Backup Now
            </button>
          )}
          <button type="button" onClick={() => load()} className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium ${listBtnOutline}`}>
            <RotateCcw size={14} /> Reset
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}>
            <Save size={14} /> {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentOption({ checked, onChange, title, description, warning = false }) {
  return <label className="flex cursor-pointer items-start gap-2 rounded-md p-2.5 hover:bg-slate-50">
    <input type="checkbox" checked={!!checked} onChange={event => onChange(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-teal-600" />
    <span><span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">{title}{warning && <span className="text-amber-500" aria-label="Requires payment verification">⚠</span>}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span></span>
  </label>;
}

function PaymentField({ label, value, onChange, type = 'text' }) {
  return <label className="block text-xs font-semibold text-slate-600">{label}<input type={type} value={value} onChange={event => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-blue-400" /></label>;
}

function OrderChoice({ checked, onChange, title, description }) {
  return <label className="flex cursor-pointer items-start gap-2.5 rounded-md p-2.5 hover:bg-slate-50"><input type="checkbox" checked={!!checked} onChange={event => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-teal-600" /><span><span className="text-sm font-medium text-slate-800">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span></span></label>;
}
