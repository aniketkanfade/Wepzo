import { useEffect, useState } from 'react';
import { BookOpen, Eye, ImagePlus, Save, Trash2, Upload } from 'lucide-react';
import api from '../../api/axios';
import { PUBLIC_WELCOME_DEFAULTS } from '../../lib/publicWelcomePage';
import { listBtnNavy } from '../../constants/listTheme';

const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const groups = [
  {
    title: 'Brand and hero section',
    fields: [
      ['brandName', 'Brand name', 'WEPZO'],
      ['heroEyebrow', 'Hero small label', 'Your Business · Your Brand · Your Customers'],
      ['heroTitle', 'Main heading', 'Create Your Own Online Store with WEPZO', true],
      ['heroDescription', 'Main description', 'Tell visitors what they can do with WEPZO.', true],
      ['heroImage', 'Hero image URL (optional)', 'https://example.com/hero-image.png'],
      ['primaryButton', 'Primary button label', 'Get Started Free'],
      ['secondaryButton', 'Secondary button label', 'Watch Demo'],
      ['trustPoints', 'Four highlights (one per line: Title | Description)', 'Easy Setup | Go live in minutes\nNo Technical Skills | Simple and easy to use\nYour Own Domain | Share your own domain\nGrow Your Business | Manage everything in one place', true],
    ],
  },
  {
    title: 'How it works',
    fields: [
      ['stepsTitle', 'Section heading', 'How WEPZO Works'],
      ['stepsSubtitle', 'Section subtitle', 'Get your online store up and running in a few steps.'],
      ['steps', 'Steps (one per line: Title | Description; up to 4)', 'Create Account | Sign up and register your business\nSet Up Store | Add store details, branding and address\nAdd Products | Manage products and inventory\nStart Selling | Receive orders and grow your business', true],
    ],
  },
  {
    title: 'Features',
    fields: [
      ['featuresTitle', 'Section heading', 'Powerful Features for Your Store'],
      ['featuresSubtitle', 'Section subtitle', 'Everything you need to run and grow your business online.'],
      ['features', 'Feature cards (one per line: Emoji | Title | Description; up to 6)', '🛍️ | Product Management | Add, edit and manage products with ease\n📦 | Order Management | Track and manage orders in one place\n🏪 | Inventory Control | Monitor stock and prevent overselling\n👥 | Customer Management | Manage customers and build loyalty\n📊 | Reports & Analytics | Track sales and business growth\n🌐 | Branded Storefront | Get your own website to sell online', true],
    ],
  },
  {
    title: 'Call to action and footer',
    fields: [
      ['ctaTitle', 'Call-to-action heading', 'Ready to Take Your Business Online?'],
      ['ctaDescription', 'Call-to-action description', 'Join WEPZO today and create your branded online store.', true],
      ['ctaButton', 'Call-to-action button label', 'Sign Up Now'],
      ['footerTagline', 'Footer tagline', 'Your Business, Online.'],
      ['footerLinks', 'Footer links (one per line: Label | URL)', 'Home | #top\nFeatures | #features\nContact | mailto:support@wepzo.com', true],
      ['footerCopyright', 'Copyright line', '© 2026 WEPZO. All rights reserved.'],
    ],
  },
];

export default function PublicWelcomePageEditor({ onShowOnboarding }) {
  const [content, setContent] = useState(PUBLIC_WELCOME_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/public/welcome-page').then(({ data }) => {
      if (active) setContent({ ...PUBLIC_WELCOME_DEFAULTS, ...(data || {}) });
    }).catch(requestError => {
      if (active) setError(requestError.response?.data?.message || 'Welcome page settings could not be loaded.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const update = (key, value) => setContent(current => ({ ...current, [key]: value }));
  const uploadLogo = async file => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Choose a PNG, JPG, or WebP logo image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo image must be 5 MB or smaller.');
      return;
    }
    setUploadingLogo(true);
    setError('');
    setNotice('');
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 512 / bitmap.width, 192 / bitmap.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Logo image could not be processed.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const logo = canvas.toDataURL('image/webp', 0.9);
      if (logo.length > 1_500_000) throw new Error('Processed logo is too large. Choose a simpler or smaller image.');
      update('brandLogo', logo);
      setNotice('Logo ready. Save the page to apply it to Admin and the public welcome page.');
    } catch (uploadError) {
      setError(uploadError.message || 'Logo image could not be processed.');
    } finally {
      bitmap?.close();
      setUploadingLogo(false);
    }
  };
  const save = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.put('/public/welcome-page', content);
      setContent({ ...PUBLIC_WELCOME_DEFAULTS, ...(data || {}) });
      window.dispatchEvent(new CustomEvent('wepzo:public-welcome-logo-updated', { detail: data?.brandLogo || '' }));
      setNotice('Public welcome page saved.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Welcome page could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return <main className="mx-auto max-w-7xl space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-orange-50 p-3 text-orange-600"><BookOpen size={21}/></span>
        <div><h1 className="text-xl font-bold text-slate-900">Public Welcome Page</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">This page appears at the site root before visitors log in or register. Update the sections, colors and links here.</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {onShowOnboarding && <button type="button" onClick={onShowOnboarding} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Post-signup welcome settings</button>}
        <button type="button" onClick={() => window.open('/', '_blank', 'noopener,noreferrer')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Eye size={16}/>Preview saved page</button>
      </div>
    </header>

    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
    {loading ? <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading welcome page settings…</div> : <form onSubmit={save} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">Shared Admin and Welcome Page Logo</h2>
          <p className="text-sm text-slate-500">This logo appears in the Admin sidebar, mobile header and public welcome page. Storefront branding is not changed.</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-20 w-44 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
              {content.brandLogo
                ? <img src={content.brandLogo} alt="Selected brand logo preview" className="max-h-full max-w-full object-contain"/>
                : <span className="text-lg font-bold text-primary-600">{content.brandName || 'WEPZO'}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white ${listBtnNavy} ${uploadingLogo ? 'pointer-events-none opacity-50' : ''}`}>
                {uploadingLogo ? <ImagePlus size={16} className="animate-pulse"/> : <Upload size={16}/>}
                {uploadingLogo ? 'Processing…' : 'Upload logo'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploadingLogo} onChange={event => { uploadLogo(event.target.files?.[0]); event.target.value = ''; }}/>
              </label>
              {content.brandLogo && <button type="button" onClick={() => update('brandLogo', '')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Trash2 size={15}/>Remove</button>}
            </div>
          </div>
          <p className="text-xs text-slate-400">PNG, JPG or WebP, up to 5 MB. The image is resized for display before saving.</p>
        </section>
        {groups.map(group => <section key={group.title} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">{group.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map(([key, label, placeholder, multiline]) => <label key={key} className={`block text-sm font-medium text-slate-700 ${multiline ? 'sm:col-span-2' : ''}`}>{label}
              {multiline
                ? <textarea rows={key === 'steps' || key === 'features' || key === 'trustPoints' ? 5 : 3} value={content[key]} onChange={event => update(key, event.target.value)} className={inputClass} placeholder={placeholder}/>
                : <input value={content[key]} onChange={event => update(key, event.target.value)} className={inputClass} placeholder={placeholder}/>}
            </label>)}
          </div>
        </section>)}

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">Page colors</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['primaryColor', 'Primary / button'],
              ['secondaryColor', 'Brand / heading'],
              ['pageBackground', 'Page background'],
              ['textColor', 'Body text'],
            ].map(([key, label]) => <label key={key} className="block text-sm font-medium text-slate-700">{label}
              <span className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
                <input type="color" value={content[key]} onChange={event => update(key, event.target.value)} className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent p-0"/>
                <input value={content[key]} onChange={event => update(key, event.target.value)} pattern="#[0-9A-Fa-f]{6}" className="min-w-0 flex-1 border-0 text-sm outline-none"/>
              </span>
            </label>)}
          </div>
        </section>
      </div>

      <aside className="xl:sticky xl:top-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
          <p className="font-bold">Content format</p>
          <ul className="mt-2 list-inside list-disc space-y-2 text-xs leading-5 text-blue-900">
            <li>Keep each step, feature, highlight or footer link on its own line.</li>
            <li>Separate fields on a line with <code>|</code>.</li>
            <li>Hero image accepts a public HTTP or HTTPS image URL. Leave it blank for the built-in storefront artwork.</li>
            <li>Login and signup buttons always link to the existing secure account pages.</li>
          </ul>
        </div>
        <button type="submit" disabled={saving} className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 ${listBtnNavy}`}><Save size={16}/>{saving ? 'Saving…' : 'Save Public Welcome Page'}</button>
      </aside>
    </form>}
  </main>;
}
