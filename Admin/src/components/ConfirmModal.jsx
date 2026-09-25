import { X, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ConfirmModal({ title, message, confirmLabel = 'Yes, Confirm', cancelLabel = 'No', onConfirm, onClose, danger }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in" onClick={e => e.stopPropagation()}>
        <div className={`px-6 py-5 ${danger ? 'bg-red-50' : 'bg-primary-50'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-sm ${danger ? 'bg-white' : 'bg-white'}`}>
                {danger
                  ? <AlertTriangle size={22} className="text-red-500" />
                  : <CheckCircle size={22} className="text-primary-600" />}
              </div>
              <h3 className="font-bold text-gray-900 text-base">{title}</h3>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/60 rounded-lg text-gray-400 transition">
              <X size={18} />
            </button>
          </div>
        </div>
        <p className="px-6 py-5 text-sm text-gray-600 leading-relaxed">{message}</p>
        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
