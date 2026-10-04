export default function CustomerAuthModal({ open, onClose, mode, setMode, submitAuth, busy }) {
  if (!open) return null

  return <div className="modal-backdrop fixed inset-0 z-30 flex items-center justify-center bg-slate-900/70 p-4" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <div className="modal relative rounded-lg bg-white p-8 shadow-2xl">
      <button className="close modal-close" onClick={onClose}>Ã—</button>
      <span className="eyebrow">YOUR LITTLE CORNER</span>
      <h2>{mode === 'login' ? <>Welcome <em>back.</em></> : <>Join the <em>everyday.</em></>}</h2>
      <p>Sign in to check out and keep your orders close.</p>
      <form onSubmit={submitAuth}>
        {mode === 'register' && <label className="field">Your name<input name="name" placeholder="Full name" required /></label>}
        <label className="field">Email address<input type="email" name="email" placeholder="you@example.com" required /></label>
        <label className="field">Password<input type="password" name="password" placeholder="At least 6 characters" minLength="6" required /></label>
        <button className="button button-dark wide" disabled={busy}>
          {busy ? 'One momentâ€¦' : mode === 'login' ? 'Sign in' : 'Create account'} <span>*</span>
        </button>
      </form>
      <button className="text-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'New here? Create an account' : 'Already with us? Sign in'}
      </button>
    </div>
  </div>
}
