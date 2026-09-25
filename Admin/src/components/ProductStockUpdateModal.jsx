import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import api from '../api/axios';

function variantLabel(v) {
  if (!v?.attributes) return 'Variant';
  return Object.values(v.attributes).join(' / ');
}

export default function ProductStockUpdateModal({ product, onClose, onSaved }) {
  const hasVariants = product?.hasVariants && (product.variants?.length > 0);
  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(product?.price ?? '');
  const [stock, setStock] = useState(product?.stock ?? 0);
  const [variants, setVariants] = useState(
    (product?.variants || []).map(v => ({
      ...v,
      price: v.price ?? '',
      stock: v.stock ?? 0,
    }))
  );
  const [saving, setSaving] = useState(false);

  if (!product) return null;

  const updateVariant = (id, field, value) => {
    setVariants(prev => prev.map(v => (v.id === id ? { ...v, [field]: value } : v)));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Product name zaroori hai');
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim() };
      if (hasVariants) {
        payload.variants = variants.map(v => ({
          ...v,
          price: parseFloat(v.price) || 0,
          stock: Math.max(0, parseInt(v.stock, 10) || 0),
        }));
        const prices = payload.variants.map(v => v.price).filter(p => p > 0);
        payload.price = prices.length ? Math.min(...prices) : parseFloat(price) || 0;
        payload.stock = payload.variants.reduce((s, v) => s + v.stock, 0);
      } else {
        payload.price = parseFloat(price) || 0;
        payload.stock = Math.max(0, parseInt(stock, 10) || 0);
      }
      const { data } = await api.patch(`/product-items/${product._id}/stock`, payload);
      onSaved?.(data);
      onClose();
    } catch {
      alert('Update failed — dubara try karein');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">Update Stock & Price</h3>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Product Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/25"
            />
          </div>

          {hasVariants ? (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Variants — stock & price</p>
              <div className="space-y-2">
                {variants.map(v => (
                  <div key={v.id} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <p className="text-xs font-medium text-gray-700 capitalize truncate">{variantLabel(v)}</p>
                    <input
                      type="number"
                      min="0"
                      value={v.stock}
                      onChange={e => updateVariant(v.id, 'stock', e.target.value)}
                      placeholder="Stock"
                      className="px-2 py-1.5 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-primary-500/30"
                    />
                    <input
                      type="number"
                      min="0"
                      value={v.price}
                      onChange={e => updateVariant(v.id, 'price', e.target.value)}
                      placeholder="₹ Price"
                      className="px-2 py-1.5 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-primary-500/30"
                    />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                Total stock: {variants.reduce((s, v) => s + (parseInt(v.stock, 10) || 0), 0)}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={e => setStock(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/25"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/25"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
