import { useState, useEffect } from 'react';
import { X, Star, Edit, Save } from 'lucide-react';
import ViewableImage from './ViewableImage';

export default function ProductReviewDetailModal({ item, onClose, onSave, startEditing = false }) {
  const [editing, setEditing] = useState(startEditing);
  const [form, setForm] = useState({ review: '', rating: 5, status: 'Pending' });

  useEffect(() => {
    if (!item) return;
    setForm({ review: item.review || '', rating: item.rating || 5, status: item.status || 'Pending' });
    setEditing(startEditing);
  }, [item, startEditing]);

  if (!item) return null;

  const Stars = ({ n }) => <span className="text-amber-400 text-lg">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;

  const handleSave = async () => {
    await onSave?.({ ...form, rating: parseInt(form.rating) || 5 });
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">{editing ? 'Edit Review' : 'Review Detail'}</h2>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <ViewableImage src={item.productImage} title={item.productName} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
            <div>
              <p className="font-semibold text-gray-900">{item.productName}</p>
              <p className="text-xs text-gray-500">
                {item.productCode ? `Code: ${item.productCode}` : `SKU: ${item.productSku}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-2.5 bg-gray-50 rounded-lg">
              <p className="text-[10px] text-gray-400 uppercase">Customer</p>
              <p className="font-medium text-gray-800">{item.customerName}</p>
              <p className="text-xs text-gray-500">{item.customerEmail}</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-lg">
              <p className="text-[10px] text-gray-400 uppercase">Date</p>
              <p className="font-medium text-gray-800">{item.date}</p>
            </div>
          </div>

          {editing ? (
            <>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Rating</label>
                <select value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })}
                  className="w-full px-2.5 py-2 border border-gray-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary-500/30">
                  {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Review</label>
                <textarea value={form.review} onChange={e => setForm({ ...form, review: e.target.value })} rows={4}
                  className="w-full px-2.5 py-2 border border-gray-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary-500/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full px-2.5 py-2 border border-gray-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary-500/30">
                  <option>Approved</option><option>Pending</option><option>Rejected</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Rating</p>
                <Stars n={item.rating} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Review</p>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg">{item.review}</p>
              </div>
              {(item.reviewImages || []).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1.5">Review Images</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {item.reviewImages.map((img, idx) => (
                      <ViewableImage key={idx} src={img} images={item.reviewImages} index={idx} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-100" />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Status</p>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  item.status === 'Approved' ? 'bg-green-100 text-green-700'
                    : item.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                }`}>{item.status}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-100">
          {editing ? (
            <>
              <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleSave} className="flex items-center gap-1 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                <Save size={14} /> Save
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 px-3 py-2 text-sm border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50">
              <Edit size={14} /> Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
