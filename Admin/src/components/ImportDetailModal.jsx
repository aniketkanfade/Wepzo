import { X, FileSpreadsheet } from 'lucide-react';

export default function ImportDetailModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Import Details</h2>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <FileSpreadsheet size={24} className="text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 text-sm">{item.fileName}</p>
              <p className="text-xs text-gray-500">{item.importedOn}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-lg font-bold text-gray-900">{item.totalProducts}</p>
              <p className="text-[10px] text-gray-500 uppercase">Total</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-lg font-bold text-green-700">{item.success}</p>
              <p className="text-[10px] text-gray-500 uppercase">Success</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-lg font-bold text-red-600">{item.failed}</p>
              <p className="text-[10px] text-gray-500 uppercase">Failed</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center">Status: <b>{item.status}</b></p>
          {item.errors?.length > 0 && <div className="max-h-36 overflow-auto rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700"><p className="mb-1 font-semibold">Rows that need correction</p>{item.errors.slice(0, 8).map((error, index) => <p key={`${error.row}-${index}`}>Row {error.row}: {error.reason}</p>)}</div>}
        </div>
      </div>
    </div>
  );
}
