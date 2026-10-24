import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronRight, LogIn, Menu, Play, Store, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { PUBLIC_WELCOME_DEFAULTS } from '../lib/publicWelcomePage';

function rows(value, minimum = 0) {
  const parsed = String(value || '').split('\n').map(line => line.split('|').map(part => part.trim())).filter(line => line.some(Boolean));
  return parsed.length ? parsed : Array.from({ length: minimum }, () => []);
}

function safeImage(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function safeHref(value) {
  const href = String(value || '').trim();
  if (href.startsWith('#')) return href;
  try {
    const url = new URL(href);
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : '#top';
  } catch {
    return '#top';
  }
}

export default function PublicWelcomeLandingPage({ content: suppliedContent }) {
  const [content, setContent] = useState({ ...PUBLIC_WELCOME_DEFAULTS, ...suppliedContent });
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const previewMode = Boolean(suppliedContent);

  useEffect(() => {
    if (previewMode) {
      setContent({ ...PUBLIC_WELCOME_DEFAULTS, ...suppliedContent });
      return undefined;
    }
    let active = true;
    api.get('/public/welcome-page')
      .then(({ data }) => { if (active) setContent({ ...PUBLIC_WELCOME_DEFAULTS, ...(data || {}) }); })
      .catch(error => console.error('Public welcome page could not be loaded:', error.response?.data?.message || error.message));
    return () => { active = false; };
  }, [previewMode, suppliedContent]);

  const trustPoints = rows(content.trustPoints, 4);
  const steps = rows(content.steps, 4);
  const features = rows(content.features, 6);
  const footerLinks = rows(content.footerLinks);
  const heroImage = safeImage(content.heroImage);
  const palette = {
    '--welcome-primary': content.primaryColor,
    '--welcome-secondary': content.secondaryColor,
    '--welcome-background': content.pageBackground,
    '--welcome-text': content.textColor,
  };

  return <main id="top" style={palette} className="min-h-screen bg-[var(--welcome-background)] text-[var(--welcome-text)]">
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-2xl font-black tracking-tight text-[var(--welcome-secondary)]">{content.brandName || 'WEPZO'}</Link>
        <nav className="hidden items-center gap-7 md:flex">
          <a href="#top" className="text-sm font-semibold text-[var(--welcome-primary)]">Home</a>
          <a href="#steps" className="text-sm font-medium text-slate-600 hover:text-[var(--welcome-secondary)]">How It Works</a>
          <a href="#features" className="text-sm font-medium text-slate-600 hover:text-[var(--welcome-secondary)]">Features</a>
          <a href="#contact" className="text-sm font-medium text-slate-600 hover:text-[var(--welcome-secondary)]">Contact</a>
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <button type="button" onClick={() => navigate('/login')} className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Login</button>
          <button type="button" onClick={() => navigate('/register')} className="rounded-lg bg-[var(--welcome-primary)] px-5 py-2 text-sm font-bold text-white hover:brightness-95">Sign Up</button>
        </div>
        <button type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 sm:hidden">{menuOpen ? <X size={21}/> : <Menu size={21}/>}</button>
      </div>
      {menuOpen && <nav className="grid gap-1 border-t border-slate-100 bg-white p-3 sm:hidden">
        {['Home|#top', 'How It Works|#steps', 'Features|#features', 'Contact|#contact'].map(item => {
          const [label, href] = item.split('|');
          return <a key={label} href={href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{label}</a>;
        })}
        <div className="mt-1 flex gap-2"><button type="button" onClick={() => navigate('/login')} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold">Login</button><button type="button" onClick={() => navigate('/register')} className="flex-1 rounded-lg bg-[var(--welcome-primary)] py-2 text-sm font-bold text-white">Sign Up</button></div>
      </nav>}
    </header>

    <section className="relative overflow-hidden bg-gradient-to-br from-white via-orange-50/70 to-blue-50/80">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-16">
        <div className="relative z-10">
          <p className="mb-4 inline-flex rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-800">{content.heroEyebrow}</p>
          <h1 className="max-w-2xl text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.55rem]">{content.heroTitle}</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">{content.heroDescription}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate('/register')} className="inline-flex items-center gap-2 rounded-xl bg-[var(--welcome-primary)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:brightness-95">{content.primaryButton}<ArrowRight size={17}/></button>
            <a href="#steps" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:border-slate-400"><Play size={16} fill="currentColor"/>{content.secondaryButton}</a>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {trustPoints.slice(0, 4).map((point, index) => <div key={`${point[0]}-${index}`} className="rounded-xl border border-white/80 bg-white/80 p-3 shadow-sm">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-50 text-[var(--welcome-primary)]"><Check size={17}/></span>
              <p className="mt-2 text-xs font-bold text-slate-800">{point[0] || 'Easy Setup'}</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">{point[1] || 'Get started in minutes'}</p>
            </div>)}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-orange-200/60 to-blue-100/70 blur-2xl"/>
          {heroImage
            ? <img src={heroImage} alt="WEPZO store dashboard preview" className="relative max-h-[430px] w-full rounded-2xl object-contain drop-shadow-2xl"/>
            : <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl sm:p-4">
              <div className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-white"><Store size={18}/><span className="font-bold">{content.brandName || 'WEPZO'} Store Manager</span><span className="ml-auto rounded-full bg-emerald-400/20 px-2 py-1 text-[10px] font-bold text-emerald-300">LIVE</span></div>
              <div className="grid grid-cols-[1fr_auto] gap-3 py-4">
                <div><p className="text-xs font-semibold text-slate-400">YOUR BUSINESS DASHBOARD</p><p className="mt-1 text-xl font-extrabold text-slate-900">Everything in one place</p><p className="mt-1 text-xs text-slate-500">Orders, products and customers at a glance.</p></div>
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-100 text-2xl">🛍️</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['Orders|📦|bg-blue-50', 'Products|🥬|bg-emerald-50', 'Customers|👥|bg-violet-50'].map(item => {
                  const [label, emoji, tone] = item.split('|');
                  return <div key={label} className={`rounded-xl ${tone} p-3`}><span className="text-2xl">{emoji}</span><p className="mt-2 text-xs font-bold text-slate-800">{label}</p><p className="text-[10px] text-slate-500">Manage with ease</p></div>;
                })}
              </div>
              <div className="mt-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 p-4 text-white"><p className="text-xs font-semibold text-white/80">YOUR ONLINE STORE</p><p className="mt-1 text-lg font-extrabold">Ready for your next order</p><div className="mt-3 flex gap-2"><span className="h-2 flex-1 rounded-full bg-white/90"/><span className="h-2 w-1/4 rounded-full bg-white/50"/></div></div>
            </div>}
          <div className="absolute -bottom-4 -left-2 hidden rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-xl sm:block"><p className="text-xs font-semibold text-slate-500">Your store, your brand</p><p className="mt-1 text-sm font-extrabold text-slate-900">Start growing today ✨</p></div>
        </div>
      </div>
    </section>

    <section id="steps" className="scroll-mt-20 border-y border-orange-100 bg-orange-50/70 py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center"><h2 className="text-2xl font-black text-slate-900 sm:text-3xl">{content.stepsTitle}</h2><p className="mt-2 text-sm text-slate-600">{content.stepsSubtitle}</p></div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.slice(0, 4).map((step, index) => <article key={`${step[0]}-${index}`} className="relative rounded-xl border border-white bg-white p-4 shadow-sm">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--welcome-primary)] text-sm font-black text-white">{index + 1}</span>
            <h3 className="mt-3 text-sm font-extrabold text-slate-900">{step[0] || 'Get started'}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{step[1] || 'Set up your business easily.'}</p>
            {index < 3 && <ChevronRight size={18} className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-[var(--welcome-primary)] lg:block"/>}
          </article>)}
        </div>
      </div>
    </section>

    <section id="features" className="scroll-mt-20 py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center"><h2 className="text-2xl font-black text-slate-900 sm:text-3xl">{content.featuresTitle}</h2><p className="mt-2 text-sm text-slate-600">{content.featuresSubtitle}</p></div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.slice(0, 6).map((feature, index) => <article key={`${feature[1]}-${index}`} className="flex min-h-28 items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-xl">{feature[0] || '✨'}</span>
            <div><h3 className="text-sm font-extrabold text-slate-900">{feature[1] || 'Business tools'}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{feature[2] || 'Everything your business needs to grow.'}</p></div>
          </article>)}
        </div>
      </div>
    </section>

    <section className="bg-gradient-to-r from-[var(--welcome-primary)] to-orange-500 py-8 text-white sm:py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 text-center sm:px-6 md:flex-row md:text-left lg:px-8">
        <div><h2 className="text-2xl font-black sm:text-3xl">{content.ctaTitle}</h2><p className="mt-2 max-w-2xl text-sm text-white/90">{content.ctaDescription}</p></div>
        <button type="button" onClick={() => navigate('/register')} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[var(--welcome-secondary)] shadow-lg hover:bg-orange-50">{content.ctaButton}<ArrowRight size={16}/></button>
      </div>
    </section>

    <footer id="contact" className="scroll-mt-20 border-t border-slate-200 bg-slate-100 py-7">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div><p className="text-lg font-black text-[var(--welcome-secondary)]">{content.brandName || 'WEPZO'}</p><p className="mt-1 text-xs text-slate-500">{content.footerTagline}</p></div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">{footerLinks.map(([label, href], index) => <a key={`${label}-${index}`} href={safeHref(href)} className="text-xs font-medium text-slate-600 hover:text-[var(--welcome-primary)]">{label}</a>)}</nav>
        <p className="text-[11px] text-slate-500">{content.footerCopyright}</p>
      </div>
      <div className="mx-auto mt-4 max-w-7xl px-4 text-[10px] text-slate-400 sm:px-6 lg:px-8"><Link to="/login" className="inline-flex items-center gap-1 hover:text-slate-600"><LogIn size={12}/> Admin login</Link></div>
    </footer>
  </main>;
}
