import React, { useState } from 'react'
import { marketingRequest } from '../BrandingContext.jsx'

export default function CustomerAuth({ customer, onClose, onSignedIn, onSignedOut }) {
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const identifier = String(form.get('identifier') || '').trim()
    const isEmail = identifier.includes('@')
    const credentials = {
      ...(isEmail ? { email: identifier } : { phone: identifier }),
      password: form.get('password'),
      ...(mode === 'register' ? { name: form.get('name') } : {}),
    }
    try {
      const result = await marketingRequest(`/shop/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(credentials),
      })
      localStorage.setItem('wepzo-shop-token', result.token)
      localStorage.setItem('wepzo-shop-customer', JSON.stringify(result.user))
      onSignedIn(result.user)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const signOut = () => {
    localStorage.removeItem('wepzo-shop-token')
    localStorage.removeItem('wepzo-shop-customer')
    onSignedOut()
  }

  return <div className="auth-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="auth-close" type="button" aria-label="Close" onClick={onClose}>×</button>
      {customer ? <><span className="auth-kicker">YOUR WEPZO ACCOUNT</span><h2 id="auth-title">Welcome, {customer.name}</h2><p>You’re signed in to this website.</p><button className="button button-primary auth-submit" type="button" onClick={signOut}>Log out</button></> : <>
        <span className="auth-kicker">YOUR WEPZO ACCOUNT</span>
        <h2 id="auth-title">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p>{mode === 'login' ? 'Log in to continue to your account.' : 'Create an account for this website.'}</p>
        <form onSubmit={submit}>
          {mode === 'register' && <label>Your name<input name="name" autoComplete="name" placeholder="Full name" required /></label>}
          <label>Email or mobile number<input name="identifier" autoComplete="username" placeholder="you@example.com or 9876543210" required /></label>
          <label>Password<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="6" placeholder="At least 6 characters" required /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'} <span>→</span></button>
        </form>
        <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}</button>
      </>}
    </section>
  </div>
}
