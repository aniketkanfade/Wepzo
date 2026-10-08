import React, { useState } from 'react'
import Brand from '../components/Brand.jsx'
import { marketingRequest } from '../BrandingContext.jsx'

export default function MarketingAuth({ register = false }) {
  const [mode, setMode] = useState(register ? 'register' : 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const result = await marketingRequest(`/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify({
          ...(mode === 'register' ? { name, moduleSlug: 'marketing' } : {}),
          email: email.trim().toLowerCase(),
          password,
          ...(import.meta.env.VITE_WEBSITE_MODULE_ID ? { moduleId: import.meta.env.VITE_WEBSITE_MODULE_ID } : {}),
        }),
      })
      const user = result.user || result.owner
      const moduleSlug = String(user?.selectedModuleSlug || user?.websiteModuleSlug || result.module?.slug || '').toLowerCase()
      if (user?.role !== 'website_user' || !['marketing', 'promotion', 'promotions'].includes(moduleSlug)) {
        throw new Error('This account is not registered for the Marketing module. Choose Marketing when creating your Wepzo account.')
      }
      localStorage.setItem('token', result.token)
      localStorage.setItem('user', JSON.stringify(user))
      window.dispatchEvent(new Event('wepzo-auth-changed'))
      if (user.websiteId) localStorage.setItem('wepzo-website-id', user.websiteId)
      window.location.hash = '/app/dashboard'
    } catch (requestError) {
      const networkFailure = requestError instanceof TypeError || /failed to fetch|networkerror/i.test(requestError.message || '')
      setError(networkFailure ? 'Wepzo API is not reachable. Start the Backend app with “npm run dev” from the Backend folder, then try again.' : (requestError.message || 'Could not sign in to Wepzo. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return <main className="marketing-auth-page"><header><Brand href="#/app/dashboard"/></header><section className="marketing-auth-card"><div className="marketing-auth-mark">W</div><span className="auth-kicker">WEPZO MARKETING</span><h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1><p>{mode === 'login' ? 'Sign in with your Wepzo Marketing account to open your workspace.' : 'Use the same account registered for the Wepzo Marketing module.'}</p><form onSubmit={submit}>{mode === 'register'&&<label>Full name<input autoComplete="name" required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}<label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label>{error&&<p className="auth-error" role="alert">{error}</p>}<button className="button button-primary auth-submit" disabled={busy}>{busy?'Connecting…':mode==='login'?'Sign in to Wepzo':'Create Marketing account'} <span>→</span></button></form><button type="button" className="auth-switch" onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}>{mode==='login'?"Don't have an account? Create one":"Already have an account? Sign in"}</button><small className="marketing-auth-footnote">Your login is checked by Wepzo. Your password is never stored in this Marketing app.</small></section></main>
}
