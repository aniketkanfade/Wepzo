import { useEffect, useState } from 'react'
import { Copy, Link2, Save } from 'lucide-react'
import api from '../../api/axios'

const emptyForm = {
  backendPublicUrl: '',
  marketingFrontendUrl: '',
  metaClientId: '',
  metaClientSecret: '',
  googleClientId: '',
  googleClientSecret: '',
  linkedinClientId: '',
  linkedinClientSecret: '',
}

export default function MarketingSocialApisPage() {
  const [form, setForm] = useState(emptyForm)
  const [platforms, setPlatforms] = useState([])
  const [flags, setFlags] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    api.get('/marketing/oauth-config')
      .then(({ data }) => {
        setForm({
          ...emptyForm,
          backendPublicUrl: data.backendPublicUrl || '',
          marketingFrontendUrl: data.marketingFrontendUrl || '',
          metaClientId: data.metaClientId || '',
          googleClientId: data.googleClientId || '',
          linkedinClientId: data.linkedinClientId || '',
        })
        setPlatforms(Array.isArray(data.platforms) ? data.platforms : [])
        setFlags({
          meta: data.metaSecretConfigured,
          google: data.googleSecretConfigured,
          linkedin: data.linkedinSecretConfigured,
        })
      })
      .catch(err => setError(err.response?.data?.message || 'Could not load social API settings.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const copyText = async value => {
    try { await navigator.clipboard.writeText(value); setNotice('Callback URL copied.') } catch { setNotice(value) }
  }
  const save = async event => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const { data } = await api.put('/marketing/oauth-config', form)
      setForm(current => ({
        ...current,
        metaClientSecret: '',
        googleClientSecret: '',
        linkedinClientSecret: '',
        backendPublicUrl: data.backendPublicUrl || current.backendPublicUrl,
        marketingFrontendUrl: data.marketingFrontendUrl || current.marketingFrontendUrl,
        metaClientId: data.metaClientId || '',
        googleClientId: data.googleClientId || '',
        linkedinClientId: data.linkedinClientId || '',
      }))
      setPlatforms(Array.isArray(data.platforms) ? data.platforms : [])
      setFlags({
        meta: data.metaSecretConfigured,
        google: data.googleSecretConfigured,
        linkedin: data.linkedinSecretConfigured,
      })
      setNotice('Social API credentials saved. Marketing users can Connect account and complete platform login.')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save social API credentials.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Admin / Web / Marketing</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Social APIs</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">Save Meta (Instagram + Facebook), Google (YouTube + Ads), and LinkedIn app credentials here. Users then click Connect account, log in on the platform, and return as Connected.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700"><Link2 size={15}/>OAuth login</span>
      </header>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
      <form onSubmit={save} className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Public URLs</h2>
          <p className="mt-1 text-xs text-slate-500">Use the same backend host that Facebook, Google, and LinkedIn can reach. Localhost is allowed in their developer consoles for testing.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Backend public URL<input value={form.backendPublicUrl} onChange={event => update('backendPublicUrl', event.target.value)} placeholder="https://api.your-domain.example" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Marketing website URL<input value={form.marketingFrontendUrl} onChange={event => update('marketingFrontendUrl', event.target.value)} placeholder="https://marketing.your-domain.example" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"/></label>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Meta · Instagram and Facebook</h2>
          <p className="mt-1 text-xs text-slate-500">One Meta app covers Instagram, Facebook Pages, and Meta Ads. {flags.meta ? 'A secret is already saved. Leave the secret blank to keep it.' : 'Paste App ID and App Secret from developers.facebook.com.'}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Meta App ID / Client ID<input value={form.metaClientId} onChange={event => update('metaClientId', event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Meta App Secret<input type="password" autoComplete="new-password" value={form.metaClientSecret} onChange={event => update('metaClientSecret', event.target.value)} placeholder={flags.meta ? 'Saved · enter a new value to replace' : ''} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"/></label>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Google · YouTube and Google Ads</h2>
          <p className="mt-1 text-xs text-slate-500">{flags.google ? 'A Google client secret is already saved.' : 'Use an OAuth 2.0 Web client from Google Cloud Console.'}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Google Client ID<input value={form.googleClientId} onChange={event => update('googleClientId', event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Google Client Secret<input type="password" autoComplete="new-password" value={form.googleClientSecret} onChange={event => update('googleClientSecret', event.target.value)} placeholder={flags.google ? 'Saved · enter a new value to replace' : ''} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"/></label>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">LinkedIn</h2>
          <p className="mt-1 text-xs text-slate-500">{flags.linkedin ? 'A LinkedIn client secret is already saved.' : 'Create an app at linkedin.com/developers and enable Sign In with LinkedIn plus Share on LinkedIn.'}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">LinkedIn Client ID<input value={form.linkedinClientId} onChange={event => update('linkedinClientId', event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">LinkedIn Client Secret<input type="password" autoComplete="new-password" value={form.linkedinClientSecret} onChange={event => update('linkedinClientSecret', event.target.value)} placeholder={flags.linkedin ? 'Saved · enter a new value to replace' : ''} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"/></label>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Callback URLs to register</h2>
          <p className="mt-1 text-xs text-slate-500">Copy each URL into the matching provider app. Instagram and Facebook share the Meta app but need separate callback paths.</p>
          <div className="mt-4 space-y-2">
            {(loading ? [] : platforms).map(item => (
              <div key={item.platform} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
                <div>
                  <b className="text-xs text-slate-800">{item.name}</b>
                  <p className="mt-0.5 break-all font-mono text-[11px] text-slate-500">{item.callbackUrl || 'Save a backend public URL first'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.configured ? 'Ready' : 'Needs credentials'}</span>
                  {item.callbackUrl && <button type="button" onClick={() => copyText(item.callbackUrl)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"><Copy size={12}/>Copy</button>}
                </div>
              </div>
            ))}
          </div>
        </section>
        <div className="sticky bottom-3 flex justify-end rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <button type="submit" disabled={saving || loading} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save size={16}/>{saving ? 'Saving…' : 'Save social APIs'}</button>
        </div>
      </form>
    </main>
  )
}
