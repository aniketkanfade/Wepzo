import { X } from 'lucide-react';

export default function SimpleFormModal({ title, fields, values, onChange, onSubmit, onClose, submitLabel = 'Save' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'textarea' ? (
                <textarea value={values[f.key] || ''} onChange={e => onChange(f.key, e.target.value)} rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 resize-none" />
              ) : f.type === 'select' ? (
                <select value={values[f.key] || f.options?.[0] || ''} onChange={e => onChange(f.key, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 bg-white">
                  {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={f.type || 'text'} value={values[f.key] || ''} onChange={e => onChange(f.key, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" />
              )}
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={onSubmit} className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold">{submitLabel}</button>
        </div>
      </div>
    </div>
  );
}
