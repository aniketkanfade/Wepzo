import { useEffect, useMemo, useState } from 'react';
import { Check, Save, Send, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import NavyToggle from '../../WebAdmin/Qucik commerce/components/NavyToggle';
import { LIST_CARD_BORDER as CARD_BORDER, listBtnNavy } from '../../constants/listTheme';
import SettingsGenericPage from './SettingsGenericPage';
import { numericInputValue } from '../../utils/numericInput';
import { useAuthStore } from '../../store/useStore';

const smsTemplates = [
  { id: 'customer_registration_otp', topic: 'Customer Registration OTP', templateKey: 'smsTemplateCustomerRegistrationOtp', messageKey: 'smsMessageCustomerRegistrationOtp', message: 'Welcome to Somoo! Your registration OTP is #OTP#. Enter this code to complete your account registration. Do not share this OTP with anyone. Valid for 10 minutes.' },
  { id: 'customer_login_otp', topic: 'Customer Login OTP', templateKey: 'smsTemplateCustomerLoginOtp', messageKey: 'smsMessageCustomerLoginOtp', message: 'Your Somoo login OTP is #OTP#. Use this code to securely access your account. Do not share this OTP with anyone. Valid for 10 minutes.' },
  { id: 'customer_forgot_password_otp', topic: 'Customer Forgot Password', templateKey: 'smsTemplateCustomerForgotPassword', messageKey: 'smsMessageCustomerForgotPassword', message: 'Your Somoo password reset OTP is #OTP#. Enter this code to reset your account password. Do not share this OTP with anyone. Valid for 10 minutes.' },
  { id: 'admin_forgot_password_otp', topic: 'Admin Forgot Password', templateKey: 'smsTemplateAdminForgotPassword', messageKey: 'smsMessageAdminForgotPassword', message: 'Your Somoo Admin password reset OTP is #OTP#. Use this code to reset your admin account password. Do not share this OTP with anyone. Valid for 10 minutes.' },
  { id: 'deliveryman_forgot_password_otp', topic: 'Deliveryman Forgot Password', templateKey: 'smsTemplateDeliverymanForgotPassword', messageKey: 'smsMessageDeliverymanForgotPassword', message: 'Your Somoo Delivery Partner password reset OTP is #OTP#. Use this code to reset your password. Do not share this OTP with anyone. Valid for 10 minutes.' },
  { id: 'customer_delivery_verification_otp', topic: 'Order Delivery Verification OTP', templateKey: 'smsTemplateDeliveryVerificationOtp', messageKey: 'smsMessageDeliveryVerificationOtp', message: 'Your Somoo delivery verification OTP is #OTP#. Share this code with the delivery partner only after receiving your order. Valid for 10 minutes.' },
  { id: 'store_order_received', topic: 'Store Order Received', templateKey: 'smsTemplateStoreOrderReceived', messageKey: 'smsMessageStoreOrderReceived', message: 'New order #ORDER_ID# received at #STORE_NAME#. Customer: #CUSTOMER_NAME#. Amount: Rs.#ORDER_AMOUNT#. Please confirm on SOMOO Store App.' },
  { id: 'customer_order_delivered', topic: 'Customer Order Delivered', templateKey: 'smsTemplateCustomerOrderDelivered', messageKey: 'smsMessageCustomerOrderDelivered', message: 'Hi #CUSTOMER_NAME#, your order #ORDER_ID# from #STORE_NAME# has been delivered successfully. Thank you for shopping with SOMOO.' },
  { id: 'customer_password_reset', topic: 'Customer Forgot Password', templateKey: 'smsTemplateCustomerPasswordReset', messageKey: 'smsMessageCustomerPasswordReset', message: 'Your password reset OTP is #OTP#' },
  { id: 'admin_password_reset', topic: 'Admin Forgot Password', templateKey: 'smsTemplateAdminPasswordReset', messageKey: 'smsMessageAdminPasswordReset', message: 'Your admin password reset OTP is #OTP#' },
  { id: 'deliveryman_password_reset', topic: 'Deliveryman Forgot Password', templateKey: 'smsTemplateDeliverymanPasswordReset', messageKey: 'smsMessageDeliverymanPasswordReset', message: 'Your deliveryman password reset OTP is #OTP#' },
];

const defaultWhatsAppOptions = [
  { title: 'Track Order', reply: 'Please share your order ID to track your order.', active: true },
  { title: 'Talk to Support', reply: 'Our support team will contact you shortly.', active: true },
  { title: 'Business Hours', reply: 'Support hours: 9 AM to 9 PM.', active: true },
];

const configurationOnlyNotice = {
  maps: 'Map credentials are saved securely, but the current storefront map still uses its existing map provider.',
  whatsapp: 'Twilio and WhatsApp settings are saved securely; automated WhatsApp messaging and inbound chat webhooks are not connected yet.',
  delivery: 'Partner credentials and dispatch preferences are saved securely; Porter, Shadowfax, and Shiprocket booking/dispatch APIs are not connected yet.',
  social: 'These Google, Facebook/Instagram, and LinkedIn app credentials are also used by Marketing workspace Connect account. Register each Marketing callback URL from Marketing → Social APIs in the provider console.',
  recaptcha: 'reCAPTCHA settings are saved securely; form verification is not connected yet.',
  firebase: 'Firebase settings are saved securely; Firebase phone OTP is not connected yet.',
  storage: 'Storage credentials are saved securely; existing uploads still use local storage.',
};

const sections = [
  { id: 'sms', label: 'SMS Module', title: 'SMS Gateway Setup', tabs: ['Configuration', 'SMS Templates', 'Test Message'], fields: [
    { key: 'smsGatewayEnabled', label: 'SMS Gateway', type: 'toggle' },
    { key: 'smsGateway', label: 'SMS Provider', type: 'select', options: ['MSG91', 'Twilio', 'Textlocal', 'Custom'] },
    { key: 'smsApiKey', label: 'API key', type: 'secret', providers: ['MSG91', 'Textlocal', 'Custom'] },
    { key: 'smsSenderId', label: 'Messaging sender ID / Twilio number', providers: ['MSG91', 'Twilio', 'Textlocal', 'Custom'] },
    { key: 'smsApiUrl', label: 'SMS API URL', type: 'url', providers: ['Custom'] },
    { key: 'twilioAccountSid', label: 'Twilio Account SID', providers: ['Twilio'] },
    { key: 'twilioAuthToken', label: 'Twilio Auth Token', type: 'secret', providers: ['Twilio'] },
  ] },
  { id: 'mail', label: 'Mail Config', title: 'Mail Gateway Setup', tabs: ['Configuration', 'Send Test Mail'], fields: [
    { key: 'mailEnabled', label: 'Mail Gateway', type: 'toggle' },
    { key: 'mailerName', label: 'Mailer Name', span: 3 },
    { key: 'smtpHost', label: 'Host', span: 1, required: true },
    { key: 'smtpDriver', label: 'Driver', type: 'select', options: ['smtp'], span: 1 },
    { key: 'smtpPort', label: 'Port', type: 'number', span: 1, required: true },
    { key: 'smtpUser', label: 'Username', span: 3, required: true },
    { key: 'smtpFrom', label: 'Email ID', type: 'email', span: 1, required: true },
    { key: 'smtpEncryption', label: 'Encryption', type: 'select', options: ['tls', 'ssl'], span: 1 },
    { key: 'smtpPassword', label: 'Password', type: 'secret', span: 1, required: true },
  ] },
  { id: 'maps', label: 'Map APIs', title: 'Map API Setup', tabs: ['Configuration'], fields: [
    { key: 'googleMapsClientKey', label: 'Map API key (Client)', type: 'secret' },
    { key: 'googleMapsKey', label: 'Map API key (Server)', type: 'secret' },
    { key: 'mapProvider', label: 'Map Provider', type: 'select', options: ['Google Maps', 'Mapbox', 'Other'] },
    { key: 'mapboxAccessToken', label: 'Mapbox Access Token', type: 'secret' },
  ] },
  { id: 'whatsapp', label: 'Twilio WhatsApp & IVR', title: 'Twilio WhatsApp & IVR Setup', tabs: ['Configuration'], fields: [
    { key: 'twilioEnabled', label: 'Twilio', type: 'toggle' },
    { key: 'twilioAccountSid', label: 'Account SID' },
    { key: 'twilioAuthToken', label: 'Auth Token', type: 'secret' },
    { key: 'twilioPhoneNumber', label: 'Twilio Phone Number' },
    { key: 'whatsappEnabled', label: 'WhatsApp Status', type: 'toggle' },
    { key: 'whatsappFromNumber', label: 'WhatsApp From Number' },
    { key: 'whatsappChatOptions', label: 'WhatsApp Chat Options', type: 'options' },
  ] },
  { id: 'delivery', label: 'Delivery Partners', title: 'Delivery Partner Setup', tabs: ['General Settings', 'Porter', 'Shadowfax', 'Shiprocket'], fields: [], fieldsByTab: {
    'General Settings': [
      { key: 'deliveryPartnerEnabled', label: 'Status', type: 'toggle' },
      { key: 'deliveryPartnerAutoDispatch', label: 'Auto dispatch on confirm', type: 'toggle' },
      { key: 'deliveryPartnerAllowUnpaid', label: 'Allow portal assign on unpaid / COD orders', type: 'toggle' },
      { key: 'deliveryPartnerCheckServiceability', label: 'Check serviceability before dispatch', type: 'toggle' },
      { key: 'deliveryPartnerPorterEnabled', label: 'Porter', type: 'toggle' },
      { key: 'deliveryPartnerShadowfaxEnabled', label: 'Shadowfax', type: 'toggle' },
      { key: 'deliveryPartnerShiprocketEnabled', label: 'Shiprocket', type: 'toggle' },
    ],
    Porter: [
      { key: 'porterEnabled', label: 'Porter Status', type: 'toggle' },
      { key: 'porterApiKey', label: 'API Key', type: 'secret', span: 2 },
      { key: 'porterEnvironment', label: 'Environment', type: 'select', options: ['Production', 'Sandbox'] },
      { key: 'porterVehicle', label: 'Preferred Vehicle (quote)' },
      { key: 'porterRequestIdPrefix', label: 'Request ID prefix' },
      { key: 'porterPickupPincode', label: 'Default Pickup Pincode' },
      { key: 'porterBaseUrl', label: 'Custom Base URL (optional)', type: 'url' },
    ],
    Shadowfax: [
      { key: 'shadowfaxEnabled', label: 'Shadowfax Status', type: 'toggle' },
      { key: 'shadowfaxToken', label: 'API Token', type: 'secret', span: 2 },
      { key: 'shadowfaxEnvironment', label: 'Environment', type: 'select', options: ['Production', 'Sandbox'] },
      { key: 'shadowfaxPickupPincode', label: 'Default Pickup Pincode (optional)' },
      { key: 'shadowfaxBaseUrl', label: 'Custom Base URL (optional)', type: 'url' },
    ],
    Shiprocket: [
      { key: 'shiprocketEnabled', label: 'Shiprocket Status', type: 'toggle' },
      { key: 'shiprocketApiEmail', label: 'API Email', type: 'email' },
      { key: 'shiprocketApiPassword', label: 'API Password', type: 'secret' },
      { key: 'shiprocketPickupLocation', label: 'Pickup Location' },
      { key: 'shiprocketChannelId', label: 'Channel ID (optional)' },
      { key: 'shiprocketCourierPreference', label: 'Courier preference', type: 'select', options: ['Fastest ETA (Air preferred)', 'Cheapest', 'Surface'] },
      { key: 'shiprocketWeightKg', label: 'Weight (kg)', type: 'number' },
      { key: 'shiprocketLengthCm', label: 'Length (cm)', type: 'number' },
      { key: 'shiprocketBreadthCm', label: 'Breadth (cm)', type: 'number' },
      { key: 'shiprocketHeightCm', label: 'Height (cm)', type: 'number' },
    ],
  } },
  { id: 'social', label: 'Social Logins', title: 'Social Login Setup', tabs: ['Configuration'], fields: [
    { key: 'googleLoginEnabled', label: 'Google Login', type: 'toggle' },
    { key: 'googleClientId', label: 'Google Client ID' },
    { key: 'googleClientSecret', label: 'Google Client Secret', type: 'secret' },
    { key: 'facebookLoginEnabled', label: 'Facebook Login', type: 'toggle' },
    { key: 'facebookAppId', label: 'Facebook App ID' },
    { key: 'facebookAppSecret', label: 'Facebook App Secret', type: 'secret' },
    { key: 'linkedinClientId', label: 'LinkedIn Client ID' },
    { key: 'linkedinClientSecret', label: 'LinkedIn Client Secret', type: 'secret' },
    { key: 'appleLoginEnabled', label: 'Apple Login', type: 'toggle' },
    { key: 'appleClientId', label: 'Apple Client ID' },
    { key: 'appleClientSecret', label: 'Apple Client Secret', type: 'secret' },
  ] },
  { id: 'recaptcha', label: 'Recaptcha', title: 'reCAPTCHA Setup', tabs: ['Configuration'], fields: [
    { key: 'recaptchaEnabled', label: 'reCAPTCHA', type: 'toggle' },
    { key: 'recaptchaSiteKey', label: 'Site Key' },
    { key: 'recaptchaSecretKey', label: 'Secret Key', type: 'secret' },
    { key: 'recaptchaVersion', label: 'Version', type: 'select', options: ['v2', 'v3'] },
  ] },
  { id: 'firebase', label: 'Firebase OTP', title: 'Firebase OTP Setup', tabs: ['Configuration'], fields: [
    { key: 'firebaseOtpEnabled', label: 'Firebase OTP', type: 'toggle' },
    { key: 'firebaseProjectId', label: 'Project ID' },
    { key: 'firebaseApiKey', label: 'Web API Key', type: 'secret' },
    { key: 'firebaseAppId', label: 'App ID' },
    { key: 'firebaseServiceAccount', label: 'Service Account JSON', type: 'secret' },
  ] },
  { id: 'storage', label: 'Storage Connection', title: 'Storage Connection Setup', tabs: ['Configuration'], fields: [
    { key: 'storageLocalEnabled', label: 'Local Storage', type: 'toggle' },
    { key: 'storageThirdPartyEnabled', label: '3rd Party Storage', type: 'toggle' },
    { key: 'storageAccessKey', label: 'S3 Key', type: 'secret' },
    { key: 'storageSecretKey', label: 'S3 Secret', type: 'secret' },
    { key: 'storageRegion', label: 'Region' },
    { key: 'storageBucket', label: 'Bucket' },
    { key: 'storageEndpoint', label: 'URL', type: 'url', span: 2 },
  ] },
  { id: 'payments', label: 'Payment Gateway', title: 'Payment Gateway Setup', tabs: ['Configuration'], fields: [] },
];

export default function ThirdPartySettingsPage() {
  const user = useAuthStore(state => state.user);
  const [activeId, setActiveId] = useState(() => user?.role === 'main_admin' ? 'sms' : 'payments');
  const [activeTab, setActiveTab] = useState('Configuration');
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [testRecipient, setTestRecipient] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [testTemplateId, setTestTemplateId] = useState(smsTemplates[0].id);
  const visibleSections = user?.role === 'main_admin' ? sections : sections.filter(item => item.id === 'payments');
  const section = useMemo(() => sections.find(item => item.id === activeId) || sections[0], [activeId]);
  const activeFields = section.fieldsByTab?.[activeTab] || section.fields;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get('/settings/business')
      .then(({ data }) => {
        if (active) setForm({
          ...(data || {}),
          smtpEncryption: ['tls', 'ssl'].includes(data?.smtpEncryption) ? data.smtpEncryption : 'tls',
          whatsappChatOptions: Array.isArray(data?.whatsappChatOptions) ? data.whatsappChatOptions : defaultWhatsAppOptions,
        });
      })
      .catch(requestError => { if (active) setError(requestError.response?.data?.message || requestError.message || 'Settings could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setActiveId(user?.role === 'main_admin' ? 'sms' : 'payments');
  }, [user?.role]);

  const updateField = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const tabFields = activeId === 'sms' && activeTab === 'SMS Templates'
        ? smsTemplates.flatMap(template => [template.templateKey, template.messageKey])
        : activeFields.filter(field => !field.readOnly).map(field => field.key);
      const keys = [...new Set([...tabFields])];
      const payload = Object.fromEntries(keys.map(key => [key, form[key] ?? '']));
      if (activeId === 'sms' && activeTab === 'SMS Templates') {
        smsTemplates.forEach(template => {
          payload[template.messageKey] = form[template.messageKey] ?? template.message;
        });
      }
      const { data } = await api.put('/settings/business', payload);
      setForm(current => {
        const next = { ...current, ...data };
        activeFields.filter(field => field.type === 'secret').forEach(field => { next[field.key] = ''; });
        return next;
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (saveError) {
      setError(saveError.response?.data?.message || saveError.message || 'Settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async (type) => {
    const recipient = type === 'mail' ? testRecipient.trim() : (form.smsTestPhone || '').trim();
    setTestSending(true);
    setTestResult('');
    setError('');
    try {
      const endpoint = type === 'mail' ? '/settings/third-party/test-mail' : '/settings/third-party/test-sms';
      const payload = type === 'mail'
        ? { email: recipient }
        : { phone: recipient, templateId: testTemplateId };
      const { data } = await api.post(endpoint, payload);
      setTestResult(data?.message || (type === 'mail' ? 'Test email sent.' : 'Test SMS sent.'));
    } catch (sendError) {
      setError(sendError.response?.data?.message || sendError.message || `Test ${type} failed.`);
    } finally {
      setTestSending(false);
    }
  };

  const setActiveSection = id => {
    setActiveId(id);
    const nextSection = sections.find(item => item.id === id) || sections[0];
    setActiveTab(nextSection.tabs[0]);
    setError('');
    setTestResult('');
  };

  return <main className="min-h-full space-y-4">
    <header>
      <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-800">
        {activeId === 'sms' ? <Smartphone size={20} /> : <ShieldCheck size={20} />}
        {section.title}
      </h1>
      <nav aria-label="Third party integrations" className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visibleSections.map(item => <button key={item.id} type="button" onClick={() => setActiveSection(item.id)}
          aria-pressed={activeId === item.id}
          className={`shrink-0 rounded-full px-4 py-2.5 text-[13px] transition ${activeId === item.id ? 'bg-[#304ca3] font-medium text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          {item.label}
        </button>)}
      </nav>
      {configurationOnlyNotice[activeId] && <p role="note" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{configurationOnlyNotice[activeId]}</p>}
    </header>

    {activeId === 'payments' ? <SettingsGenericPage pageKey="paymentGateway" globalGateway={user?.role === 'main_admin'} /> : <section className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: CARD_BORDER }}>
      <nav aria-label={`${section.label} settings`} className="flex gap-1 border-b border-slate-200 bg-slate-50 px-4">
        {section.tabs.map(tab => <button key={tab} type="button" onClick={() => { setActiveTab(tab); setError(''); setTestResult(''); }}
          aria-current={activeTab === tab ? 'page' : undefined}
          className={`border-b-2 px-1 py-4 text-[13px] ${activeTab === tab ? 'border-blue-700 font-medium text-blue-800' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
          {tab}
        </button>)}
      </nav>
      {loading ? <p className="px-5 py-12 text-center text-sm text-slate-400">Loading configuration...</p> : <>
        {error && <p role="alert" className="mx-5 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        {testResult && <p role="status" className="mx-5 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{testResult}</p>}
        {activeTab === 'Test Message' ? <TestMessagePanel selectedTemplate={testTemplateId} setSelectedTemplate={setTestTemplateId} phone={form.smsTestPhone || ''} setPhone={value => updateField('smsTestPhone', value)} onSend={() => sendTest('sms')} sending={testSending} /> :
          activeTab === 'Send Test Mail' ? <TestMailPanel email={testRecipient} setEmail={setTestRecipient} onSend={() => sendTest('mail')} sending={testSending} /> :
          activeTab === 'SMS Templates' ? <div className="overflow-x-auto p-3 sm:p-4">
            <table className="w-full min-w-[900px] table-fixed border-collapse text-left">
              <thead className="bg-slate-50 text-xs font-medium text-slate-600">
                <tr>
                  <th className="w-12 px-3 py-2">Sl</th>
                  <th className="w-[30%] px-3 py-2">Topic</th>
                  <th className="w-[26%] px-3 py-2">Template Id</th>
                  <th className="px-3 py-2">Template Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {smsTemplates.map((template, index) => (
                  <tr key={template.id}>
                    <td className="px-3 py-4 text-sm text-slate-700">{index + 1}</td>
                    <td className="px-3 py-4">
                      <div className="text-sm font-semibold text-slate-800">{template.topic}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{template.id}</div>
                    </td>
                    <td className="px-3 py-4">
                      <input aria-label={`${template.topic} template ID`} value={form[template.templateKey] || ''} onChange={event => updateField(template.templateKey, event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    </td>
                    <td className="px-3 py-3">
                      <textarea aria-label={`${template.topic} template message`} rows={3} value={form[template.messageKey] ?? template.message} onChange={event => updateField(template.messageKey, event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-5 outline-none focus:border-blue-500" />
                      <p className="mt-1 text-[11px] text-slate-400">Use #OTP# for the OTP code. Other supported placeholders include #ORDER_ID#, #STORE_NAME#, #CUSTOMER_NAME# and #ORDER_AMOUNT#.</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div> : <div className={`grid gap-x-5 gap-y-6 p-5 ${activeId === 'mail' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {activeFields.filter(field => !field.providers || field.providers.includes(form.smsGateway || 'MSG91')).map(field => <Field key={field.key} field={field} value={field.readOnly ? callbackUrl(field.key) : field.type === 'options' && !form[field.key] ? defaultWhatsAppOptions : form[field.key]} configured={form[`${field.key}Configured`]} onChange={updateField} />)}
        </div>}
        {!['Test Message', 'Send Test Mail'].includes(activeTab) && <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4">
          <p className="text-xs text-slate-500">{activeTab === 'SMS Templates' ? 'Use #OTP# for OTP templates and configure the matching template IDs with your SMS provider.' : 'Secrets are encrypted on the backend. Leave an existing secret blank to keep it unchanged.'}</p>
          <button type="button" onClick={save} disabled={saving} className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${listBtnNavy}`}>
            <Save size={15} />{saved ? <><Check size={15} />Saved</> : saving ? 'Saving...' : activeTab === 'SMS Templates' ? 'Update' : 'Save Configuration'}
          </button>
        </footer>}
      </>}
    </section>}
  </main>;
}

function Field({ field, value, configured, onChange }) {
  const label = `${field.label}${field.required ? ' *' : ''}`;
  const spanClass = field.span === 3 ? 'sm:col-span-2 lg:col-span-3' : field.span === 2 ? 'sm:col-span-2' : '';
  if (field.type === 'toggle') return <label className={`flex items-center justify-between gap-4 text-sm text-slate-700 ${spanClass || 'sm:col-span-2'}`}>
    <span>{field.label}</span><NavyToggle checked={!!value} onChange={next => onChange(field.key, next)} />
  </label>;
  if (field.type === 'options') return <WhatsAppOptionsField value={value} onChange={next => onChange(field.key, next)} />;
  if (field.type === 'select') return <label className="block text-[13px] text-slate-700">
    {label}<select required={field.required} value={field.options.includes(value) ? value : field.options[0]} onChange={event => onChange(field.key, event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500">
      {field.options.map(option => <option key={option}>{option}</option>)}
    </select>
  </label>;
  if (field.multiline || field.type === 'textarea') return <label className={`block text-[13px] text-slate-700 ${spanClass || (field.multiline ? 'sm:col-span-2' : '')}`}>
    {label}
    <textarea rows={4} value={value || ''} readOnly={field.readOnly} onChange={event => onChange(field.key, event.target.value)} className={`mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${field.readOnly ? 'bg-slate-50' : ''}`} />
  </label>;
  const inputProps = {
    value: field.type === 'number' ? numericInputValue(value) : field.type === 'secret' && configured && !value ? '' : value || '',
    onChange: event => onChange(field.key, event.target.value),
    placeholder: field.type === 'secret' && configured && !value ? 'Configured — enter a new value to replace' : '',
    readOnly: field.readOnly,
    required: field.required,
    className: `mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${field.readOnly ? 'bg-slate-50' : 'bg-white'}`,
  };
  return <label className={`block text-[13px] text-slate-700 ${spanClass || (field.multiline ? 'sm:col-span-2' : '')}`}>
    {label}
    <input type={field.type === 'number' ? 'number' : field.type === 'secret' ? 'password' : field.type === 'url' ? 'url' : field.type === 'email' ? 'email' : 'text'} {...inputProps} />
  </label>;
}

function WhatsAppOptionsField({ value, onChange }) {
  const options = Array.isArray(value) ? value : defaultWhatsAppOptions;
  const updateOption = (index, changes) => onChange(options.map((option, optionIndex) => optionIndex === index ? { ...option, ...changes } : option));
  return <div className="space-y-3 sm:col-span-2">
    <div className="flex items-center justify-between">
      <div><h3 className="text-sm font-semibold text-slate-800">WhatsApp Chat Options</h3><p className="mt-1 text-xs text-slate-500">Customers can reply with an option number or title. Inactive options are hidden.</p></div>
      <button type="button" onClick={() => onChange([...options, { title: '', reply: '', active: true }])} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${listBtnNavy}`}>Add Option</button>
    </div>
    {options.map((option, index) => <div key={`${index}-${option.title}`} className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[1fr_2fr_auto_auto] md:items-center">
      <label className="text-xs text-slate-600">Option Title<input value={option.title || ''} onChange={event => updateOption(index, { title: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
      <label className="text-xs text-slate-600">Reply Message<input value={option.reply || ''} onChange={event => updateOption(index, { reply: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={option.active !== false} onChange={event => updateOption(index, { active: event.target.checked })} />Active</label>
      <button type="button" aria-label="Remove option" onClick={() => onChange(options.filter((_, optionIndex) => optionIndex !== index))} className="rounded-lg bg-rose-500 p-2 text-white"><Trash2 size={16} /></button>
    </div>)}
  </div>;
}

function TestMessagePanel({ selectedTemplate, setSelectedTemplate, phone, setPhone, onSend, sending }) {
  const inputClass = 'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500';
  return <div className="max-w-4xl space-y-6 p-5">
    <p className="text-sm text-slate-500">A test SMS will be sent through the saved, enabled provider to this number.</p>
    <label className="block text-sm text-slate-700">
      Select SMS template <span className="text-rose-600">*</span>
      <select className={inputClass} value={selectedTemplate} onChange={event => setSelectedTemplate(event.target.value)}>
        {smsTemplates.map(template => <option key={template.id} value={template.id}>{template.topic}</option>)}
      </select>
    </label>
    <label className="block text-sm text-slate-700">
      Phone <span className="text-rose-600">*</span>
      <span className="mt-2 flex overflow-hidden rounded-lg border border-slate-300 focus-within:border-blue-500">
        <span className="flex items-center border-r border-slate-300 bg-slate-50 px-4 text-sm text-slate-700">+91</span>
        <input type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={event => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Ex: 9876543210" className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none" />
      </span>
      <span className="mt-2 block text-xs text-slate-400">Enter 10 digit Indian mobile number without country code</span>
    </label>
    <div>
      <button type="button" onClick={onSend} disabled={sending || phone.length !== 10} className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${listBtnNavy}`}>
        <Send size={15} />{sending ? 'Sending...' : 'Send Test SMS'}
      </button>
      <p className="mt-2 text-xs text-slate-500">Save and enable the SMS configuration first. A random OTP is used for #OTP# placeholders.</p>
    </div>
  </div>;
}

function TestMailPanel({ email, setEmail, onSend, sending }) {
  return <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_260px] md:items-end">
    <p className="text-sm text-slate-500 md:col-span-2">Save and enable the SMTP configuration first. The test message uses your configured sender.</p>
    <label className="block text-sm text-slate-700">Email
      <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Ex: john@email.com" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
    </label>
    <button type="button" onClick={onSend} disabled={sending || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)} className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${listBtnNavy}`}>
      <Send size={15} />{sending ? 'Sending...' : 'Send Mail'}
    </button>
  </div>;
}
