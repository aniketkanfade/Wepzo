import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { shop } from '../api';
import { useAuthStore } from '../store/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const setSession = useAuthStore(s => s.setSession);
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: 'customer@wepzo.com', phone: '9876543210', password: 'customer123' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const identifier = form.email.trim();
      const email = identifier.toLowerCase();
      const phone = form.phone.replace(/\D/g, '');
      const loginPhone = identifier.replace(/\D/g, '');
      const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const phoneValid = !phone || /^[6-9]\d{9}$/.test(phone);
      const loginIdentifierValid = email.includes('@') ? emailValid : /^[6-9]\d{9}$/.test(loginPhone);
      if (mode === 'register' && !email && !phone) throw new Error('Valid email ya mobile number bharo');
      if (mode === 'login' && !loginIdentifierValid) throw new Error(email.includes('@') ? 'Valid email address bharo' : 'Valid 10 digit mobile number bharo');
      if (mode === 'register' && !emailValid) throw new Error('Valid email address bharo');
      if (mode === 'register' && !phoneValid) throw new Error('Valid 10 digit mobile number bharo');
      const data = mode === 'login'
        ? await shop.login(email.includes('@') ? { email, password: form.password } : { phone: loginPhone, password: form.password })
        : await shop.register({ ...form, email, phone });
      setSession(data.token, data.user);
      navigate(next);
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Login fail');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border p-6">
        <h1 className="text-xl font-bold mb-1">{mode === 'login' ? 'Sign In' : 'Create account'}</h1>
        <p className="text-xs text-slate-500 mb-4">Order place karne ke liye login zaroori hai.</p>
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => setMode('login')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === 'login' ? 'bg-brand-600 text-white' : 'bg-slate-100'}`}>Login</button>
          <button type="button" onClick={() => setMode('register')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === 'register' ? 'bg-brand-600 text-white' : 'bg-slate-100'}`}>Register</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" className="w-full px-3 py-2 border rounded-lg text-sm" />
          )}
          <input value={form.email} onChange={e => set('email', e.target.value)} placeholder={mode === 'login' ? 'Email or mobile number' : 'Email (optional)'} type="text" inputMode="email" className="w-full px-3 py-2 border rounded-lg text-sm" />
          {mode === 'register' && (
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Mobile number (optional)" inputMode="numeric" maxLength={10} className="w-full px-3 py-2 border rounded-lg text-sm" />
          )}
          <input required value={form.password} onChange={e => set('password', e.target.value)} placeholder="Password" type="password" className="w-full px-3 py-2 border rounded-lg text-sm" />
          {err && <p className="text-xs text-rose-600">{err}</p>}
          <button disabled={busy} className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-bold disabled:opacity-50">
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Register'}
          </button>
        </form>
        <p className="text-[11px] text-slate-400 mt-3">Demo: customer@wepzo.com / customer123</p>
        <Link to="/" className="block text-center text-xs text-brand-700 mt-3">Back to shop</Link>
      </div>
    </div>
  );
}
