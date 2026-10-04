import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Globe, LoaderCircle } from 'lucide-react';
import api from '../api/axios';
import { useAuthStore, useBuilderStore } from '../store/useStore';

export default function Register() {
  const [modules, setModules] = useState([]);
  const [moduleSlug, setModuleSlug] = useState('');
  const [imageIndex, setImageIndex] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [error, setError] = useState('');
  const [loadingModules, setLoadingModules] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const setAuth = useAuthStore(state => state.setAuth);
  const resetBuilder = useBuilderStore(state => state.reset);
  const navigate = useNavigate();
  const selectedModule = modules.find(module => module.slug === moduleSlug) || modules[0];
  const previewImages = selectedModule ? (Array.isArray(selectedModule.images) && selectedModule.images.length ? selectedModule.images : (selectedModule.image ? [selectedModule.image] : [])) : [];
  const activeImage = previewImages.length ? previewImages[imageIndex % previewImages.length] : '';

  useEffect(() => {
    api.get('/public/website-modules')
      .then(({ data }) => {
        const activeModules = Array.isArray(data) ? data : [];
        setModules(activeModules);
        if (activeModules.length) setModuleSlug(current => current || activeModules[0].slug);
      })
      .catch(err => setError(err.response?.data?.message || 'Website Modules load nahi ho paye'))
      .finally(() => setLoadingModules(false));
  }, []);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    if (!moduleSlug) return setError('Website Module select karein');
    if (password.length < 8) return setError('Password kam se kam 8 characters ka hona chahiye');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password, moduleId: selectedModule?._id, moduleSlug });
      setAuth(data.user, data.token);
      resetBuilder();
      const registeredModule = data.module || selectedModule;
      navigate('/website-builder', {
        state: {
          moduleType: registeredModule?.type || registeredModule?.slug || moduleSlug,
          websiteName: websiteName.trim() || 'My Website',
        },
      });
    } catch (err) {
      const status = err.response?.status;
      const responseMessage = typeof err.response?.data === 'string'
        ? err.response.data
        : err.response?.data?.message;
      if (status === 409) {
        setError('Is module ke liye account pehle se bana hua hai. Sign in karein.');
      } else if (!err.response) {
        setError(`Server se connection nahi ho paya (${err.message || 'network error'}). Backend chalu hai, check karke dobara try karein.`);
      } else {
        setError(responseMessage || `Account create nahi ho paya (HTTP ${status}).`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 text-white lg:px-8">
        <Link to="/login" className="text-xl font-bold tracking-wide">WEPZO<span className="text-blue-400">.</span></Link>
        <p className="text-sm text-slate-300">Already have an account? <Link to="/login" className="ml-1 font-semibold text-white hover:text-blue-300">Sign In</Link></p>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 pb-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-6 text-white sm:p-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200"><Globe size={14}/> WEBSITE BUILDER</div>
          <h1 className="max-w-xl text-3xl font-bold leading-tight sm:text-4xl">Build a website for your business.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Choose a website module to preview its image, video and description, then create your account and start designing.</p>

          <div className="mt-7 flex flex-wrap gap-2">
            {loadingModules ? <span className="text-sm text-slate-300">Loading modules...</span> : modules.map(module => (
              <button key={module._id || module.slug} type="button" onClick={() => { setModuleSlug(module.slug); setImageIndex(0); }} className={`rounded-full border px-4 py-2 text-sm font-medium transition ${module.slug === selectedModule?.slug ? 'border-blue-400 bg-blue-500 text-white' : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'}`}>
                {module.name}
              </button>
            ))}
          </div>

          {selectedModule ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              <div className="relative aspect-video bg-slate-800">
                {selectedModule.videoUrl ? (
                  <video key={selectedModule.videoUrl} controls autoPlay muted loop playsInline preload="metadata" poster={activeImage || undefined} src={selectedModule.videoUrl} className="h-full w-full object-contain" />
                ) : activeImage ? (
                  <img src={activeImage} alt={`${selectedModule.name} website preview ${imageIndex + 1}`} className="h-full w-full object-contain" />
                ) : <div className="flex h-full items-center justify-center text-blue-200"><Globe size={42}/></div>}
                {previewImages.length > 1 && !selectedModule.videoUrl && <>
                  <button type="button" aria-label="Previous website image" onClick={() => setImageIndex(index => (index + previewImages.length - 1) % previewImages.length)} className="absolute left-3 top-1/2 rounded-full bg-white/90 p-2 text-slate-900"><ChevronLeft size={20}/></button>
                  <button type="button" aria-label="Next website image" onClick={() => setImageIndex(index => (index + 1) % previewImages.length)} className="absolute right-3 top-1/2 rounded-full bg-white/90 p-2 text-slate-900"><ChevronRight size={20}/></button>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">{imageIndex + 1} / {previewImages.length}</span>
                </>}
              </div>
              {previewImages.length > 1 && !selectedModule.videoUrl && <div className="flex gap-2 overflow-x-auto border-t border-white/10 p-3">{previewImages.map((image,index)=><button type="button" key={`${image}-${index}`} onClick={()=>setImageIndex(index)} aria-label={`View website image ${index+1}`} className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 ${index===imageIndex?'border-blue-400':'border-transparent'}`}><img src={image} alt="" className="h-full w-full object-cover"/></button>)}</div>}
              {selectedModule.videoUrl && previewImages.length > 0 && <div className="border-t border-white/10 p-4">
                <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-800"><img src={activeImage} alt={`${selectedModule.name} website preview ${imageIndex + 1}`} className="h-full w-full object-contain"/>{previewImages.length > 1 && <><button type="button" aria-label="Previous website image" onClick={() => setImageIndex(index => (index + previewImages.length - 1) % previewImages.length)} className="absolute left-3 top-1/2 rounded-full bg-white/90 p-2 text-slate-900"><ChevronLeft size={20}/></button><button type="button" aria-label="Next website image" onClick={() => setImageIndex(index => (index + 1) % previewImages.length)} className="absolute right-3 top-1/2 rounded-full bg-white/90 p-2 text-slate-900"><ChevronRight size={20}/></button><span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">{(imageIndex % previewImages.length) + 1} / {previewImages.length}</span></>}</div>
                {previewImages.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{previewImages.map((image,index)=><button type="button" key={`${image}-${index}`} onClick={()=>setImageIndex(index)} aria-label={`View website image ${index+1}`} className={`h-12 w-16 shrink-0 overflow-hidden rounded-md border-2 ${index===imageIndex%previewImages.length?'border-blue-400':'border-transparent'}`}><img src={image} alt="" className="h-full w-full object-cover"/></button>)}</div>}
              </div>}
              <div className="p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">Selected Website Module</p>
                <h2 className="mt-2 text-2xl font-bold">{selectedModule.name}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{selectedModule.description || 'Choose this module and customize your website in the builder.'}</p>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-300">{loadingModules ? 'Module previews are loading...' : 'No active Website Modules available right now.'}</div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8 lg:p-9">
          <div className="mb-7">
            <p className="text-sm font-semibold text-blue-700">GET STARTED</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Create your account</h2>
            <p className="mt-2 text-sm leading-5 text-slate-500">Your selected module will open in Website Design after signup.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}{error.includes('Sign in karein') && <Link to="/login" className="ml-2 font-semibold underline">Sign In</Link>}</div>}
            <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Your Name</span><input required autoComplete="name" value={name} onChange={event => setName(event.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" placeholder="Full name" /></label>
            <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Email</span><input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" placeholder="you@example.com" /></label>
            <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Password</span><input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" placeholder="At least 8 characters" /></label>
            <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Website Name <span className="font-normal text-slate-400">(optional)</span></span><input value={websiteName} onChange={event => setWebsiteName(event.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" placeholder="My Website" /></label>
            <button type="submit" disabled={submitting || loadingModules || modules.length === 0} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? <><LoaderCircle size={17} className="animate-spin"/> Creating account...</> : <>Create Account & Start Designing <ArrowRight size={17}/></>}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-gray-600">By creating an account, you can start designing your selected website module.</p>
        </section>
      </main>
    </div>
  );
}
