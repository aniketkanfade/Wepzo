import { useState } from 'react'
import BrandLogo from './BrandLogo.jsx'
import { loginLocalStore, registerLocalStore } from '../platformLocal.js'
import { formatINR } from '../data/store.js'

export default function StoreSignup({ onStoreReady, onBack, subscriptionPlans = [] }) {
  const [mode, setMode] = useState('signup')
  const [storeName, setStoreName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState(() => subscriptionPlans.find((plan) => plan.id === '1m')?.id || subscriptionPlans.find((plan) => plan.enabled)?.id || '')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const owner = mode === 'signup'
        ? await registerLocalStore({ storeName, ownerName, email, password, selectedPlan: subscriptionPlans.find((plan) => plan.id === selectedPlanId) || subscriptionPlans.find((plan) => plan.enabled) })
        : await loginLocalStore(email, password)
      onStoreReady(owner)
    } catch (submitError) {
      setError(submitError.message || 'Could not complete this request.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="login-page"><button className="back-link" onClick={onBack}>← Back</button><div className="login-card store-signup-card"><BrandLogo className="auth-brand"/><span className="eyebrow">MORROW STORE PLATFORM</span><h1>{mode === 'signup' ? 'Start your own store.' : 'Welcome back.'}</h1><p>{mode === 'signup' ? 'Create your store and manage its products from the store admin.' : 'Log in to manage your store.'}</p><div className="signup-tabs"><button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError('') }}>Create a store</button><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>Store login</button></div><form className="login-form" onSubmit={submit}>{mode === 'signup' && <><label>Store name<input required value={storeName} onChange={(event) => setStoreName(event.target.value)} placeholder="My everyday store"/></label><label>Owner name<input required autoComplete="name" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="Your name"/></label></>}<label>Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></label><label>Password<input required minLength="8" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters"/></label>{mode === 'signup' && <><div className="signup-plan-options"><strong>Subscription plans</strong><div>{subscriptionPlans.filter((plan) => plan.enabled).map((plan) => <button type="button" key={plan.id} className={selectedPlanId === plan.id ? 'selected' : ''} onClick={() => setSelectedPlanId(plan.id)}><span>{plan.label}</span><b>{formatINR(plan.price)}</b></button>)}</div></div><div className="subscription-price"><span>Free store setup</span><strong>₹0 <small>for now</small></strong><p>Plan prices are shown above. Online subscription payment will activate when the platform payment service is connected.</p></div></>}{error && <p className="signup-error" role="alert">{error}</p>}<button className="checkout-primary" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create free store' : 'Log in to admin'} <span>→</span></button></form><small className="login-note">Accounts are stored in this browser until a platform backend is connected.</small></div></section>
}
