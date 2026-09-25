import { Store, Tag, Calendar, Check, X, Edit, Package } from 'lucide-react';
import ViewableImage from './ViewableImage';

const statusStyle = {
  Pending: 'bg-blue-100 text-blue-700 border-blue-200',
  Approved: 'bg-green-100 text-green-700 border-green-200',
  Rejected: 'bg-red-100 text-red-700 border-red-200',
};

export default function ProductRequestDetailModal({
  item,
  onClose,
  onApprove,
  onReject,
  onEdit,
}) {
  if (!item) return null;

  const images = [item.image, ...(item.images || [])].filter(Boolean);
  const discount = item.discount || 0;
  const finalPrice = item.discountType === 'Flat'
    ? Math.max(0, (item.price || 0) - discount)
    : Math.round((item.price || 0) * (1 - discount / 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white shrink-0">
          <div>
            <p className="text-[10px] font-semibold text-primary-600 uppercase tracking-wide">Website Preview</p>
            <h2 className="text-base font-bold text-gray-900">Product Detail — Aise Dikhega</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="bg-gray-50 p-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-100">
                <ViewableImage
                  src={images[0]}
                  images={images}
                  title={item.name}
                  alt={item.name}
                  className="w-full max-w-[280px] aspect-square object-cover rounded-xl border border-gray-200 shadow-md"
                />
                {images.length > 1 && (
                  <div className="flex gap-1.5 mt-3 flex-wrap justify-center">
                    {images.map((img, idx) => (
                      <ViewableImage
                        key={idx}
                        src={img}
                        images={images}
                        index={idx}
                        alt=""
                        className="w-12 h-12 object-cover rounded-md border border-gray-200"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="p-5">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border mb-3 ${statusStyle[item.status] || statusStyle.Pending}`}>
                  {item.status}
                </span>
                <h3 className="text-xl font-bold text-gray-900 leading-tight">{item.name}</h3>
                {item.shortDesc && (
                  <p className="text-sm text-gray-500 mt-2 leading-relaxed">{item.shortDesc}</p>
                )}

                <div className="mt-4 flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl font-bold text-primary-600">₹{finalPrice.toLocaleString('en-IN')}</span>
                  {discount > 0 && (
                    <>
                      <span className="text-sm text-gray-400 line-through">₹{(item.price || 0).toLocaleString('en-IN')}</span>
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                        {item.discountType === 'Flat' ? `₹${discount} off` : `${discount}% off`}
                      </span>
                    </>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-gray-600">
                    <Store size={14} className="text-teal-500 shrink-0" />
                    <span className="text-teal-600 font-medium">{item.store}</span>
                  </p>
                  <p className="flex items-center gap-2 text-gray-600">
                    <Tag size={14} className="text-primary-500 shrink-0" />
                    {item.mainCategory}{item.subCategory ? ` · ${item.subCategory}` : ''}
                  </p>
                  <p className="flex items-center gap-2 text-gray-500">
                    <Calendar size={14} className="shrink-0" />
                    Requested: {item.requestedOn}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 bg-gray-50/80 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'SKU', value: item.sku || '—' },
                { label: 'Brand', value: item.brand || '—' },
                { label: 'Unit', value: item.unit || '—' },
                { label: 'Stock', value: item.stock ?? '—' },
              ].map(row => (
                <div key={row.label} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{row.label}</p>
                  <p className="text-sm font-semibold text-gray-800 capitalize truncate">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {(onEdit || onReject || onApprove) && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t border-gray-100 bg-white shrink-0">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Package size={12} /> Review karein phir approve ya reject karein
            </p>
            <div className="flex flex-wrap gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-blue-200 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-50 transition"
                >
                  <Edit size={14} /> Edit
                </button>
              )}
              {onReject && (
                <button
                  type="button"
                  onClick={() => onReject(item)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition"
                >
                  <X size={14} /> Reject
                </button>
              )}
              {onApprove && (
                <button
                  type="button"
                  onClick={() => onApprove(item)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition"
                >
                  <Check size={14} /> Approve
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
