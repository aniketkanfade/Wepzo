import { useEffect, useMemo, useState } from 'react'
import { Globe2, Save, ExternalLink } from 'lucide-react'
import api from '../../api/axios'
import defaultContent from '../../../../shared/webPageDefaults.json'

const sections = [
  ['brand', 'Brand & contact details'],
  ['navigation', 'Header navigation'],
  ['home', 'Homepage content'],
  ['services', 'Services'],
  ['solutions', 'Solutions'],
  ['benefits', 'Why choose us'],
  ['projects', 'Portfolio & case studies'],
  ['testimonials', 'Testimonials'],
  ['team', 'Leadership & team'],
  ['about', 'About us'],
  ['industries', 'Industries'],
  ['careers', 'Careers & open positions'],
  ['contact', 'Contact & contact FAQs'],
  ['faqs', 'FAQ page'],
  ['privacy', 'Privacy policy'],
  ['terms', 'Terms & conditions'],
  ['footer', 'Footer & social links'],
]

function mergeDefaults(defaults, value) {
  if (Array.isArray(defaults)) return Array.isArray(value) ? value : defaults
  if (!defaults || typeof defaults !== 'object') return value === undefined ? defaults : value
  return Object.fromEntries(Object.entries(defaults).map(([key, child]) => [key, mergeDefaults(child, value?.[key])]))
}

export default function WebPageContentPage() {
  const storedUser = useMemo(() => { try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null } }, [])
  const isMainAdmin = storedUser?.role === 'main_admin'
  const [websites, setWebsites] = useState([])
  const [websiteId, setWebsiteId] = useState(storedUser?.role === 'website_user' ? (storedUser.websiteId || '') : (new URLSearchParams(location.search).get('websiteId') || ''))
  const [content, setContent] = useState(defaultContent)
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api.get('/websites').then(({ data }) => {
      const list = Array.isArray(data) ? data : []
      setWebsites(list)
      if (storedUser?.role === 'website_user' && !websiteId) {
        const own = list.find(item => String(item.userId) === String(storedUser.id || storedUser._id))
        if (own) setWebsiteId(own._id)
      }
    }).catch(() => setWebsites([]))
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setNotice('')
    api.get('/web-page/site-content', { params: websiteId ? { websiteId } : {} })
      .then(({ data }) => {
        if (!active) return
        const next = mergeDefaults(defaultContent, data?.content || {})
        setContent(next)
        setDrafts(Object.fromEntries(sections.map(([key]) => [key, JSON.stringify(next[key], null, 2)])))
      })
      .catch(err => { if (active) setError(err.response?.data?.message || 'Web Page content could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [websiteId])

  const save = async event => {
    event.preventDefault(); setError(''); setNotice('')
    let payload = { ...content }
    try {
      for (const [key] of sections) payload[key] = JSON.parse(drafts[key] || 'null')
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Content must be a JSON object.')
    } catch (err) { setError(`Please check the JSON section: ${err.message}`); return }
    setSaving(true)
    try {
      const { data } = await api.put('/web-page/site-content', { websiteId: websiteId || undefined, content: payload })
      const next = mergeDefaults(defaultContent, data.content || {})
      setContent(next)
      setDrafts(Object.fromEntries(sections.map(([key]) => [key, JSON.stringify(next[key], null, 2)])))
      setNotice('Web Page content saved. Your public website reads these saved values.')
    } catch (err) { setError(err.response?.data?.message || 'Web Page content could not be saved.') }
    finally { setSaving(false) }
  }

  return <main className="mx-auto max-w-6xl space-y-5 pb-10">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Admin / Web Page</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Website Content</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Manage the Web Page site's navigation, images, page copy, services, projects, careers and contact details. Content is stored per website.</p></div>
      <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"><Globe2 size={15}/>{websiteId ? 'Tenant website' : 'Platform website'}</span>
    </header>
    {isMainAdmin && <label className="grid max-w-xl gap-1.5 text-xs font-semibold text-slate-600">Choose website<select value={websiteId} onChange={event => { const next = event.target.value; setWebsiteId(next); history.replaceState(null, '', next ? `?websiteId=${encodeURIComponent(next)}` : location.pathname) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal"><option value="">Platform Web Page</option>{websites.map(site => <option key={site._id} value={site._id}>{site.name || 'Untitled website'} · {site.status || 'draft'}</option>)}</select></label>}
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
    <form onSubmit={save} className="space-y-4">
      {sections.map(([key, title], index) => <details key={key} open={index < 3} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer border-b border-slate-100 px-5 py-4 text-sm font-bold text-slate-900">{title}</summary>
        <div className="space-y-3 p-5"><label className="grid gap-2 text-xs font-semibold text-slate-600">{title} data<textarea spellCheck="false" rows={Math.min(28, Math.max(8, (drafts[key] || '').split('\n').length))} value={drafts[key] || ''} onChange={event => setDrafts(current => ({ ...current, [key]: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-3 font-mono text-xs font-normal leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" /></label><p className="text-[11px] text-slate-400">Edit valid JSON. Text, image URLs, buttons and card lists in this section are served from the saved website content.</p></div>
      </details>)}
      <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur"><span className="text-xs text-slate-500">Changes are saved to {websiteId ? 'this tenant website' : 'the platform Web Page website'}.</span><button type="submit" disabled={saving || loading} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save size={16}/>{saving ? 'Saving…' : 'Save website content'}</button></div>
    </form>
    <a href="/website-builder" className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700">Open Website Builder <ExternalLink size={13}/></a>
  </main>
}
