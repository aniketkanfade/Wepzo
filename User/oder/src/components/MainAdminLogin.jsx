import { useState } from 'react'
import BrandLogo from './BrandLogo.jsx'
import StoreSignup from './StoreSignup.jsx'
import { loginLocalStore } from '../platformLocal.js'
import { formatINR } from '../data/store.js'

export default function MainAdminLogin({ onAuthenticated, onStoreReady, amount, plans, onBack }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const response = await fetch('/api/main-admin/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const result = await response.json()
      if (response.ok && result.authenticated === true) {
        onAuthenticated()
        return
      }
      if (response.status !== 401) throw new Error(result.error || 'Could not reach the admin login service.')
      try {
        const storeResponse = await fetch('/api/platform/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
        const storeResult = await storeResponse.json().catch(() => ({}))
        if (storeResponse.ok && storeResult.owner?.storeId) {
          onStoreReady({ ...storeResult.owner, token: storeResult.token })
          return
        }
      } catch { /* fall back to a local free store account */ }
      onStoreReady(await loginLocalStore(email, password))
    } catch (loginError) {
      setError(loginError.message || 'Could not reach the admin login service.')
    } finally {
      setBusy(false)
    }
  }
  if (mode === 'signup') return <StoreSignup amount={amount} subscriptionPlans={plans} onStoreReady={onStoreReady} onBack={() => setMode('login')}/>
  return <section className="login-page"><div className="login-card"><BrandLogo className="auth-brand"/><span className="eyebrow">MORROW ADMIN</span><h1>Admin login</h1><p>Main admin credentials open the main panel. Store owner credentials open that store's panel.</p><form className="login-form" onSubmit={submit}><label>Email address<input autoComplete="username" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address"/></label><label>Password<input autoComplete="current-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password"/></label>{error && <p className="signup-error" role="alert">{error}</p>}<button className="checkout-primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Log in'} <span>→</span></button></form><button className="admin-signup-link" type="button" onClick={() => { setError(''); setMode('signup') }}>Create a store · subscription plans from {formatINR((plans?.find((plan) => plan.id === '1m') || plans?.find((plan) => plan.enabled))?.price ?? amount)}</button><small className="login-note">Main admin login stays active for 7 days on this browser.</small><button className="back-link" onClick={onBack}>Back to store</button></div></section>
}
