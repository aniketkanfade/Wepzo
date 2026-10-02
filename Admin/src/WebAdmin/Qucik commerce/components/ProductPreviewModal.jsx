import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Ruler, Edit } from 'lucide-react';
import VariantSpecPanel, { buildVariantSpecs } from './VariantSpecPanel';
import { getColorHex, hashColor, isColorAttribute } from '../../../utils/colorMap';
import ViewableImage from './ViewableImage';

export default function ProductPreviewModal({ product, onClose }) {
  const navigate = useNavigate();
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  if (!product) return null;

  const variants = product.variants || [];
  const hasVariants = product.hasVariants && variants.length > 0;
  const selected = variants.find(v => v.id === selectedVariantId) || variants[0];
  const displayImage = selected?.image || product.image;
  const displayPrice = selected?.price || product.price;
  const allImages = [...new Set([
    product.image,
    ...(product.images || []),
    ...variants.flatMap(v => [v.image, ...(v.images || [])]),
  ])].filter(Boolean);

  const activeSpecs = hasVariants && selected
    ? buildVariantSpecs(selected)
    : (product.hasSpecifications ? (product.specifications || {}) : {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Product Preview</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex gap-5">
            <ViewableImage
              src={displayImage}
              images={allImages}
              title={product.name}
              alt={product.name}
              className="w-40 h-40 rounded-xl object-cover border border-gray-200 shrink-0"
            />
            <div>
              <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
              <p className="text-2xl font-bold text-primary-600 mt-2">₹{displayPrice || 0}</p>
              <p className="text-sm text-gray-500 mt-1">{product.mainCategory} · {product.brand}</p>
              {product.productCode && (
                <p className="text-xs text-gray-400 mt-1 font-mono">Product Code: {product.productCode}</p>
              )}
            </div>
          </div>

          {hasVariants && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Select Variant</p>
              <div className="flex flex-wrap gap-2">
                {variants.map(v => {
                  const active = (selectedVariantId || variants[0]?.id) === v.id;
                  const label = Object.values(v.attributes).join(' / ');
                  const colorAttr = Object.entries(v.attributes).find(([k]) => isColorAttribute(k));
                  return (
                    <button key={v.id} type="button" onClick={() => setSelectedVariantId(v.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition capitalize
                        ${active ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-600/20' : 'border-gray-200 hover:border-primary-300 text-gray-600'}`}>
                      {v.image ? (
                        <ViewableImage
                          src={v.image}
                          images={v.images?.length ? v.images : [v.image]}
                          title={label}
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover"
                          onClick={e => e.stopPropagation()}
                        />
                      ) : colorAttr ? (
                        <span className="w-6 h-6 rounded-full border border-gray-200"
                          style={{ backgroundColor: getColorHex(colorAttr[1]) || hashColor(colorAttr[1]) }} />
                      ) : null}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {Object.keys(activeSpecs).length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Ruler size={14} /> Specifications
                {hasVariants && selected && <span className="text-xs text-gray-400 font-normal">(for selected variant)</span>}
              </p>
              {hasVariants && selected ? (
                <VariantSpecPanel variant={selected} baseSpecs={product.specifications || {}} compact />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(activeSpecs).filter(([,v]) => v).map(([k, v]) => (
                    <div key={k} className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-xs text-gray-400 capitalize">{k}</p>
                      <p className="text-sm font-semibold text-gray-800 capitalize">{v}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {product._id && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Close</button>
            <button type="button" onClick={() => { onClose(); navigate(`/products/setup/add?edit=${product._id}`); }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              <Edit size={14} /> Edit Product
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
