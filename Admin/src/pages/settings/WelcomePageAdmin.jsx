import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Save } from 'lucide-react';
import api from '../../api/axios';
import { listBtnNavy } from '../../constants/listTheme';

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const emptyContent = {
  welcomeTitle: '',
  welcomeDescription: '',
  welcomeIntro: '',
  builderTip: '',
  addressTitle: '',
  addressDescription: '',
  subdomainTitle: '',
  subdomainDescription: '',
  subdomainBadge: '',
  subdomainBenefitsText: '',
  ownDomainTitle: '',
  ownDomainDescription: '',
  ownDomainBadge: '',
  ownDomainBenefitsText: '',
  continueLabel: '',
  tutorialTitle: '',
  tutorialDescription: '',
  helpTitle: '',
  helpDescription: '',
  helpLinksText: '',
  supportTitle: '',
  supportDescription: '',
  supportEmail: '',
  supportWhatsApp: '',
  supportWhatsappLabel: '',
  supportEmailLabel: '',
  helpCenterLabel: '',
};

export default function WelcomePageAdmin() {
  const [modules, setModules] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [content, setContent] = useState(emptyContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selectedModule = useMemo(() => modules.find(module => String(module._id) === String(selectedId)), [modules, selectedId]);
  const images = Array.isArray(selectedModule?.images) && selectedModule.images.length
    ? selectedModule.images
    : (selectedModule?.image ? [selectedModule.image] : []);

  useEffect(() => {
    let active = true;
    api.get('/website-modules').then(({ data }) => {
      if (!active) return;
      const list = Array.isArray(data) ? data : [];
      setModules(list);
      setSelectedId(list[0]?._id || '');
    }).catch(requestError => {
      if (active) setError(requestError.response?.data?.message || 'Website modules could not be loaded.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const moduleContent = selectedModule || {};
    setContent({
      ...emptyContent,
      ...Object.fromEntries(Object.keys(emptyContent).filter(key => !['helpLinksText', 'subdomainBenefitsText', 'ownDomainBenefitsText'].includes(key)).map(key => [key, moduleContent[key] || ''])),
      helpLinksText: (moduleContent.helpLinks || []).map(link => `${link.label} | ${link.url}`).join('\n'),
      subdomainBenefitsText: (moduleContent.subdomainBenefits || []).join('\n'),
      ownDomainBenefitsText: (moduleContent.ownDomainBenefits || []).join('\n'),
    });
    setNotice('');
  }, [selectedModule]);

  const update = (key, value) => setContent(current => ({ ...current, [key]: value }));
  const helpLinks = content.helpLinksText.split('\n').map(line => {
    const separator = line.indexOf('|');
    return separator < 0 ? null : { label: line.slice(0, separator).trim(), url: line.slice(separator + 1).trim() };
  }).filter(link => link?.label && link.url);

  const save = async event => {
    event.preventDefault();
    if (!selectedModule) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        ...content,
        helpLinks,
        subdomainBenefits: content.subdomainBenefitsText.split('\n').map(value => value.trim()).filter(Boolean).slice(0, 6),
        ownDomainBenefits: content.ownDomainBenefitsText.split('\n').map(value => value.trim()).filter(Boolean).slice(0, 6),
      };
      delete payload.helpLinksText;
      delete payload.subdomainBenefitsText;
      delete payload.ownDomainBenefitsText;
      const { data } = await api.put(`/website-modules/${selectedModule._id}`, payload);
      setModules(current => current.map(module => module._id === data._id ? data : module));
      setNotice('Welcome page saved for this website module.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Welcome page could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, placeholder, multiline = false) => <label key={key} className="block text-sm font-medium text-slate-700">{label}
    {multiline
      ? <textarea rows="3" value={content[key]} onChange={event => update(key, event.target.value)} className={`${inputClass} mt-1`} placeholder={placeholder}/>
      : <input value={content[key]} onChange={event => update(key, event.target.value)} className={`${inputClass} mt-1`} placeholder={placeholder}/>}
  </label>;

  return <main className="mx-auto max-w-6xl space-y-5">
    <header className="flex items-start gap-3">
      <span className="rounded-xl bg-blue-50 p-3 text-blue-800"><BookOpen size={21}/></span>
      <div><h1 className="text-xl font-bold text-slate-900">Welcome Page</h1><p className="mt-1 text-sm text-slate-500">Customize each module’s onboarding copy, subdomain card, tutorial and support links. Module images and video are managed in Website Modules.</p></div>
    </header>

    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
    {loading ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading website modules...</p>
      : !modules.length ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Create a website module before configuring its welcome page.</p>
        : <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <form onSubmit={save} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-medium text-slate-700">Website module
              <select value={selectedId} onChange={event => setSelectedId(event.target.value)} className={`${inputClass} mt-1`}>
                {modules.map(module => <option key={module._id} value={module._id}>{module.name}</option>)}
              </select>
            </label>
            <section className="space-y-3">
              <h2 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">Welcome and builder guidance</h2>
              {field('welcomeTitle', 'Welcome heading', `Welcome to ${selectedModule?.name || 'your website'}!`)}
              {field('welcomeDescription', 'Welcome message', 'Explain what this module can do.', true)}
              {field('welcomeIntro', 'Short introduction', 'A short line shown above the welcome message.', true)}
              {field('builderTip', 'Builder guidance', 'Explain the next steps: design, subdomain and payment.', true)}
            </section>
            <section className="space-y-3">
              <h2 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">Website address choices</h2>
              {field('addressTitle', 'Address section title', 'Choose Your Website Address')}
              {field('addressDescription', 'Address section description', 'Select how you want your store to appear online.')}
              {field('subdomainTitle', 'Subdomain card title', 'Use a WEPZO subdomain')}
              {field('subdomainDescription', 'Subdomain card description', 'Choose a WEPZO web address. Setup charges are shown in the builder before payment.', true)}
              {field('subdomainBadge', 'Subdomain badge', '₹500 setup')}
              <label className="block text-sm font-medium text-slate-700">Subdomain benefits <span className="font-normal text-slate-400">(one per line)</span>
                <textarea rows="3" value={content.subdomainBenefitsText} onChange={event => update('subdomainBenefitsText', event.target.value)} className={`${inputClass} mt-1`} placeholder={'Guided domain setup\nNo technical setup needed\nPrice shown before checkout'}/>
              </label>
              {field('ownDomainTitle', 'Own domain card title', 'Use Your Own Domain')}
              {field('ownDomainDescription', 'Own domain card description', 'Open a sample storefront preview styled with your own domain.', true)}
              {field('ownDomainBadge', 'Own domain badge', 'Recommended')}
              <label className="block text-sm font-medium text-slate-700">Own domain benefits <span className="font-normal text-slate-400">(one per line)</span>
                <textarea rows="3" value={content.ownDomainBenefitsText} onChange={event => update('ownDomainBenefitsText', event.target.value)} className={`${inputClass} mt-1`} placeholder={'See your store design\nTry cart and sample order\nNo real customer data'}/>
              </label>
              {field('continueLabel', 'Continue button label', 'Continue & Build')}
            </section>
            <section className="space-y-3">
              <h2 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">Tutorial and help</h2>
              {field('tutorialTitle', 'Tutorial section title', 'How to build your website')}
              {field('tutorialDescription', 'Tutorial description', 'Watch this short video to get started.', true)}
              {field('helpTitle', 'Help links heading', 'Helpful guides')}
              {field('helpDescription', 'Help links description', 'Guides for your domain, design and products.', true)}
              <label className="block text-sm font-medium text-slate-700">Help links <span className="font-normal text-slate-400">(one per line: Label | URL)</span>
                <textarea rows="4" value={content.helpLinksText} onChange={event => update('helpLinksText', event.target.value)} className={`${inputClass} mt-1`} placeholder={'Getting started | https://example.com/guide\nContact support | https://example.com/support'}/>
              </label>
            </section>
            <section className="space-y-3">
              <h2 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">Support details</h2>
              {field('supportTitle', 'Support heading', 'Need a hand?')}
              {field('supportDescription', 'Support message', 'Our team is here to help you.', true)}
              {field('supportEmail', 'Support email', 'support@example.com')}
              {field('supportWhatsApp', 'WhatsApp number', 'Country code and number, e.g. 919876543210')}
              {field('supportWhatsappLabel', 'WhatsApp button label', 'Chat on WhatsApp')}
              {field('supportEmailLabel', 'Email button label', 'Email Support')}
              {field('helpCenterLabel', 'Help center button label', 'Visit Help Center')}
            </section>
            <div className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              <p className="font-semibold text-slate-700">Module media</p>
              <p className="mt-1">{selectedModule?.description || 'Add a module description from Website Modules.'}</p>
              <p className="mt-1">Preview video: {selectedModule?.videoUrl ? 'Available' : 'Not added'} · Preview images: {images.length}</p>
            </div>
            <button type="submit" disabled={saving || !selectedModule} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${listBtnNavy}`}><Save size={16}/>{saving ? 'Saving...' : 'Save Welcome Page'}</button>
          </form>

          <section className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
            <div className="border-b border-slate-200 bg-white px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Onboarding preview · {selectedModule?.name}</p></div>
            <div className="space-y-4 p-5">
              <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-slate-200">
                {selectedModule?.videoUrl ? <video controls preload="metadata" poster={images[0] || undefined} src={selectedModule.videoUrl} className="h-full w-full object-contain"/>
                  : images[0] ? <img src={images[0]} alt={`${selectedModule?.name} preview`} className="h-full w-full object-cover"/> : <span className="text-sm text-slate-500">Add module media in Website Modules</span>}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">{selectedModule?.name}</p>
              {content.welcomeIntro && <p className="text-sm font-medium text-blue-700">{content.welcomeIntro}</p>}
              <h2 className="text-2xl font-bold text-slate-900">{content.welcomeTitle.trim() || `Welcome to ${selectedModule?.name || 'your website'}!`}</h2>
              <p className="whitespace-pre-line text-sm leading-6 text-slate-600">{content.welcomeDescription.trim() || selectedModule?.description || 'Your welcome message will appear here.'}</p>
              {content.builderTip && <p className="rounded-lg bg-blue-50 p-3 text-sm leading-5 text-blue-900">{content.builderTip}</p>}
              <div className="rounded-xl border border-blue-200 bg-white p-4">
                <p className="font-semibold text-slate-900">{content.addressTitle || 'Choose Your Website Address'}</p>
                <p className="mt-1 text-sm text-slate-600">{content.addressDescription || 'Select how you want your store to appear online.'}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-white p-4">
                <p className="font-semibold text-slate-900">{content.subdomainTitle || 'Use WEPZO Subdomain'}</p>
                <p className="mt-1 text-sm text-slate-600">{content.subdomainDescription || 'Choose a WEPZO web address. Setup charges are shown in the builder before payment.'}</p>
                <span className="mt-2 inline-block rounded bg-orange-100 px-2 py-1 text-xs text-orange-800">{content.subdomainBadge || '₹500 setup'}</span>
                <p className="mt-2 whitespace-pre-line text-xs text-slate-600">{content.subdomainBenefitsText || 'Guided domain setup\nNo technical setup needed\nPrice shown before checkout'}</p>
                <button type="button" disabled className="mt-3 rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white">{content.continueLabel || 'Continue & Build'}</button>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="font-semibold text-slate-900">{content.ownDomainTitle || 'Use Your Own Domain'}</p><p className="mt-1 text-sm text-slate-600">{content.ownDomainDescription || 'Open a sample storefront preview styled with your own domain.'}</p><span className="mt-2 inline-block rounded bg-violet-100 px-2 py-1 text-xs text-violet-800">{content.ownDomainBadge || 'Recommended'}</span><p className="mt-2 whitespace-pre-line text-xs text-slate-600">{content.ownDomainBenefitsText || 'See your store design\nTry cart and sample order\nNo real customer data'}</p></div>
              <div className="rounded-xl bg-white p-4"><p className="font-semibold text-slate-900">{content.tutorialTitle || 'How to build your website'}</p><p className="mt-1 text-sm text-slate-600">{content.tutorialDescription || 'Watch the module video to get started.'}</p></div>
              {(content.helpTitle || content.helpLinksText) && <div className="rounded-xl bg-white p-4"><p className="font-semibold text-slate-900">{content.helpTitle || 'Helpful guides'}</p><p className="mt-1 text-sm text-slate-600">{content.helpDescription || 'Guides for your domain, design and products.'}</p><p className="mt-1 whitespace-pre-line text-sm text-blue-800">{helpLinks.map(link => link.label).join(' · ') || 'Add guide links above.'}</p></div>}
              {(content.supportTitle || content.supportDescription || content.supportEmail || content.supportWhatsApp) && <div className="rounded-xl bg-white p-4"><p className="font-semibold text-slate-900">{content.supportTitle || 'Need a hand?'}</p><p className="mt-1 text-sm text-slate-600">{content.supportDescription}</p><p className="mt-1 text-xs text-slate-500">{[content.supportEmailLabel, content.supportWhatsAppLabel, content.helpCenterLabel].filter(Boolean).join(' · ')}</p></div>}
            </div>
          </section>
        </div>}
  </main>;
}
