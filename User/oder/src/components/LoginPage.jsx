import { useState } from 'react'
import BrandLogo from './BrandLogo.jsx'

export default function LoginPage({ onLogin }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const submit = (event) => {
    event.preventDefault()
    onLogin({ name: name.trim() || email.split('@')[0], email: email.trim(), phone: phone.trim() })
  }
  return <section className="login-page"><div className="login-card"><BrandLogo className="auth-brand"/><span className="eyebrow">WELCOME TO MORROW</span><h1>Good to have you here.</h1><p>Log in to continue to your bag and checkout.</p><form className="login-form" onSubmit={submit}><label>Your name <span>(optional)</span><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Name"/></label><label>Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></label><label>Mobile number<input required type="tel" autoComplete="tel" inputMode="tel" pattern="[0-9+() -]{7,18}" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Enter your mobile number"/></label><label>Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password"/></label><button className="checkout-primary" type="submit">Log in and continue <span>→</span></button></form><small className="login-note">Login demo: connect an authentication service to verify accounts securely.</small></div></section>
}
