import { X, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';

export default function ConfirmModal({ title, message, confirmLabel = 'Yes, Confirm', cancelLabel = 'No', onConfirm, onClose, danger, busy = false, error = '' }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => !busy && onClose()}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-modal-title" aria-describedby="confirm-modal-message" className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5" onClick={event => event.stopPropagation()}>
        <div className="flex justify-end px-4 pt-4">
          <button type="button" disabled={busy} aria-label="Close dialog" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 pb-6 text-center">
          <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${danger ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
            {danger ? <Trash2 size={24} /> : <CheckCircle size={24} />}
          </div>
          <h3 id="confirm-modal-title" className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
          <p id="confirm-modal-message" className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
          {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-left text-xs text-rose-700">{error}</p>}
        </div>
        <div className="flex justify-center gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <button type="button" disabled={busy} onClick={onClose}
            className="min-w-28 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50">
            {cancelLabel}
          </button>
          <button type="button" disabled={busy} onClick={onConfirm}
            className={`inline-flex min-w-28 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:cursor-wait disabled:opacity-60 ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-600 hover:bg-primary-700'}`}>
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {busy ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
