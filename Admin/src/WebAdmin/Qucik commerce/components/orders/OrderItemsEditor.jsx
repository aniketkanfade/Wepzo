import { useEffect, useMemo, useState } from 'react';
import { Loader2, Minus, Plus, Search, Trash2, X } from 'lucide-react';
import api from '../../../../api/axios';

function money(value) {
  return `₹ ${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function orderLines(order) {
  const source = Array.isArray(order?.details) && order.details.length
    ? order.details
    : Array.isArray(order?.products) ? order.products : [];
  return source.map((item, existingIndex) => ({
    key: `existing-${existingIndex}`,
    source: 'existing',
    existingIndex,
    productId: item.id || item.productId || item._id || '',
    variantId: String(item.variantId || ''),
    name: item.name || item.productName || 'Product',
    image: item.image || item.thumbnail || item.images?.[0] || '',
    variant: item.variant || item.variantName || item.unit || item.packSize || '',
    unit: item.unit || '',
    qty: Math.max(1, Number(item.qty) || 1),
    price: Number(item.price ?? item.unitPrice) || 0,
  }));
}

function variantLabel(variant) {
  return Object.entries(variant?.attributes || {}).map(([key, value]) => `${key}: ${value}`).join(' · ')
    || variant?.name || variant?.sku || '';
}

function variantsFor(product) {
  const variants = Array.isArray(product.variants) ? product.variants.filter(variant => variant.status !== false) : [];
  if (!variants.length) return [{ id: '', label: product.unit || 'Standard', price: Number(product.price) || 0, image: product.image || '', stock: product.stock }];
  return variants.map((variant, index) => ({
    id: String(variant.id || variant._id || `v-${index}`),
    label: variantLabel(variant) || product.unit || 'Variant',
    price: Number(variant.price) || Number(product.price) || 0,
    image: variant.image || product.image || '',
    stock: variant.stock ?? product.stock,
  }));
}

function salePrice(price, discount, discountType) {
  const amount = Number(price) || 0;
  const value = Number(discount) || 0;
  if (value <= 0) return amount;
  if (discountType === 'Percent' || !discountType) return Math.max(1, Math.round(amount * (1 - value / 100)));
  return Math.max(1, amount - value);
}

function isActive(value) {
  return value !== false && !['false', 'inactive', 'disabled', '0'].includes(String(value ?? '').trim().toLowerCase());
}

function belongsToOrderWebsite(product, order) {
  const productWebsiteId = String(product.websiteId || '');
  const orderWebsiteId = String(order.websiteId || '');
  return orderWebsiteId
    ? productWebsiteId === orderWebsiteId || (!productWebsiteId && order.websiteAllowsSharedCatalog === true)
    : !productWebsiteId;
}

function belongsToOrderStore(product, order) {
  if (!order.storeId && !order.store) return true;
  const storeIds = [product.storeId, product.storeRef?._id, product.storeRef?.storeId].filter(value => value != null).map(String);
  if (order.storeId && storeIds.includes(String(order.storeId))) return true;
  return !!(order.store && String(product.store || '').trim().toLowerCase() === String(order.store).trim().toLowerCase());
}

function normalizeCatalogProduct(product) {
  const variants = (Array.isArray(product.variants) ? product.variants : [])
    .filter(variant => isActive(variant.status))
    .map((variant, index) => ({
      ...variant,
      id: String(variant.id || variant._id || `v-${index}`),
      label: variantLabel(variant) || variant.name || variant.sku || '',
      price: salePrice(variant.price ?? product.price, variant.discount ?? product.discount, variant.discountType || product.discountType),
      image: variant.image || product.image || product.images?.[0] || '',
      stock: variant.stock ?? product.stock,
    }));
  return {
    ...product,
    price: salePrice(product.price, product.discount, product.discountType),
    image: product.image || product.images?.[0] || '',
    stock: product.stock == null ? null : Number(product.stock),
    variants,
  };
}

function catalogHasStock(product) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  return variants.length
    ? variants.some(variant => variant.stock == null || Number(variant.stock) > 0)
    : product.stock == null || Number(product.stock) > 0;
}

function lineMatchesProduct(line, product, variant) {
  if (String(line.productId) !== String(product._id)) return false;
  if (line.variantId) return String(line.variantId) === String(variant.id || '');
  return !variant.id || String(line.variant || line.unit || '').trim().toLowerCase() === String(variant.label || '').trim().toLowerCase();
}

export default function OrderItemsEditor({ order, onClose, onSave, onPreviewImage }) {
  const [lines, setLines] = useState(() => orderLines(order));
  const [catalog, setCatalog] = useState([]);
  const [search, setSearch] = useState('');
  const [variantChoice, setVariantChoice] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadCatalog = async () => {
      try {
        const { data } = await api.get(`/orders/${encodeURIComponent(order._id)}/items/catalog`);
        if (Array.isArray(data) && data.length) return data;
      } catch (err) {
        if ([403, 409].includes(err.response?.status)) throw err;
      }

      try {
        const params = new URLSearchParams();
        if (order.storeId) params.set('storeId', order.storeId);
        else if (order.store) params.set('store', order.store);
        const query = params.toString();
        let { data } = await api.get(`/product-items${query ? `?${query}` : ''}`);
        if ((!Array.isArray(data) || !data.length) && query) {
          ({ data } = await api.get('/product-items'));
        }
        return (Array.isArray(data) ? data : [])
          .filter(product => isActive(product.status) && belongsToOrderWebsite(product, order) && belongsToOrderStore(product, order))
          .map(normalizeCatalogProduct)
          .filter(catalogHasStock);
      } catch (fallbackError) {
        throw fallbackError;
      }
    };

    loadCatalog()
      .then(data => { if (active) setCatalog(Array.isArray(data) ? data : []); })
      .catch(err => { if (active) setError(err.response?.data?.message || err.message || 'Product list could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [order._id, order.storeId, order.store, order.websiteId, order.websiteAllowsSharedCatalog]);

  const visibleCatalog = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? catalog.filter(product => `${product.name} ${product.sku || ''} ${product.mainCategory || ''}`.toLowerCase().includes(query)) : catalog;
  }, [catalog, search]);

  const oldItemsTotal = useMemo(() => orderLines(order).reduce((total, line) => total + line.price * line.qty, 0), [order]);
  const newItemsTotal = useMemo(() => lines.reduce((total, line) => total + line.price * line.qty, 0), [lines]);
  const itemDifference = newItemsTotal - oldItemsTotal;

  const addProduct = (product) => {
    const variant = variantsFor(product)[Number(variantChoice[product._id]) || 0];
    const key = `${product._id}:${variant.id}`;
    setLines(current => {
      const found = current.findIndex(line => line.key === key || lineMatchesProduct(line, product, variant));
      const limit = variant.stock == null ? 999 : Math.min(999, Number(variant.stock));
      if (limit <= 0) return current;
      if (found >= 0) return current.map((line, index) => index === found ? { ...line, qty: Math.min(limit, line.qty + 1), stock: line.stock ?? variant.stock } : line);
      return [...current, {
        key,
        source: 'catalog',
        productId: product._id,
        variantId: variant.id,
        name: product.name,
        image: variant.image,
        variant: variant.label,
        unit: product.unit || '',
        qty: 1,
        price: variant.price,
        stock: variant.stock,
      }];
    });
  };

  const updateQty = (key, amount) => setLines(current => current
    .map(line => line.key === key ? { ...line, qty: Math.max(1, Math.min(999, line.qty + amount)) } : line));

  const save = async () => {
    setError('');
    setSaving(true);
    const requestId = window.crypto?.randomUUID?.() || `items-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const items = lines.map(line => line.source === 'existing'
      ? { existingIndex: line.existingIndex, qty: line.qty }
      : { productId: line.productId, variantId: line.variantId, qty: line.qty });
    const result = await onSave(order._id, { items, requestId });
    setSaving(false);
    if (!result?.ok) {
      setError(result?.message || 'Order items could not be updated.');
      return;
    }
    onClose();
  };

  const paidOnline = String(order.paymentStatus || '').toLowerCase() === 'paid'
    && (String(order.payment || '').toLowerCase() === 'online' || !!order.paymentGateway);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="order-items-title">
      <section className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="order-items-title" className="text-lg font-bold text-slate-900">Add or remove products</h2>
            <p className="mt-1 text-xs text-slate-500">Order #{order.orderNo || order.orderId} · items can be changed before Handover.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-2">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div><h3 className="font-semibold text-slate-800">Products in this order</h3><p className="mt-0.5 text-xs text-slate-500">Remove a product or change its quantity.</p></div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{lines.length} items</span>
            </div>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {lines.map(line => (
                <div key={line.key} className="flex items-center gap-3 p-3">
                  {line.image ? <button type="button" onClick={() => onPreviewImage(line.image)} className="shrink-0"><img src={line.image} alt={line.name} className="h-12 w-12 rounded-lg border border-slate-100 object-cover" /></button>
                    : <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-100" />}
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{line.name}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{line.variant || 'Standard'} · {money(line.price)} each</p></div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => updateQty(line.key, -1)} disabled={line.qty <= 1} aria-label="Decrease quantity" className="rounded-md border border-slate-200 p-1.5 text-slate-600 disabled:opacity-35"><Minus size={13} /></button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums">{line.qty}</span>
                    <button type="button" onClick={() => updateQty(line.key, 1)} disabled={line.qty >= 999 || (line.stock != null && line.qty >= Number(line.stock))} aria-label="Increase quantity" className="rounded-md border border-slate-200 p-1.5 text-slate-600 disabled:opacity-35"><Plus size={13} /></button>
                  </div>
                  <button type="button" onClick={() => setLines(current => current.filter(item => item.key !== line.key))} aria-label={`Remove ${line.name}`} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"><Trash2 size={15} /></button>
                </div>
              ))}
              {!lines.length && <p className="p-6 text-center text-sm text-slate-500">Keep at least one product in the order.</p>}
            </div>
          </section>

          <section>
            <div className="mb-3"><h3 className="font-semibold text-slate-800">Add another product</h3><p className="mt-0.5 text-xs text-slate-500">Showing available products for this store.</p></div>
            <label className="relative mb-3 block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search products" className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary-400" /></label>
            <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {loading && <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading products...</div>}
              {!loading && visibleCatalog.map(product => {
                const variants = variantsFor(product);
                const selected = Math.min(Number(variantChoice[product._id]) || 0, variants.length - 1);
                const variant = variants[selected];
                const selectedQty = lines.find(line => line.key === `${product._id}:${variant.id}` || lineMatchesProduct(line, product, variant))?.qty || 0;
                const stockReached = selectedQty >= 999 || (variant.stock != null && selectedQty >= Number(variant.stock));
                return <div key={product._id} className="flex items-center gap-3 p-3">
                  {product.image ? <button type="button" onClick={() => onPreviewImage(product.image)} className="shrink-0"><img src={product.image} alt={product.name} className="h-12 w-12 rounded-lg border border-slate-100 object-cover" /></button> : <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-100" />}
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{product.name}</p><p className="mt-0.5 text-[11px] text-slate-500">{money(variant.price)} · {variant.stock == null ? 'Stock not tracked' : `${variant.stock} in stock`}</p>
                    {variants.length > 1 && <select value={selected} onChange={event => setVariantChoice(current => ({ ...current, [product._id]: Number(event.target.value) }))} className="mt-1 max-w-full rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-700">{variants.map((option, index) => <option key={option.id || index} value={index}>{option.label} · {money(option.price)}</option>)}</select>}
                  </div>
                  <button type="button" onClick={() => addProduct(product)} disabled={stockReached} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary-50 px-3 py-2 text-xs font-bold text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={14} /> {selectedQty ? 'Add more' : 'Add'}</button>
                </div>;
              })}
              {!loading && !visibleCatalog.length && <p className="p-6 text-center text-sm text-slate-500">No available products found.</p>}
            </div>
          </section>
        </div>

        <footer className="border-t border-slate-100 bg-slate-50 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-600">
              <p>Item subtotal: <b>{money(oldItemsTotal)}</b> → <b>{money(newItemsTotal)}</b> ({itemDifference > 0 ? '+' : ''}{money(itemDifference)})</p>
              {paidOnline && <p className="mt-1 font-semibold text-slate-600">After the full bill is recalculated, any extra due is collected as COD or a lower bill is refunded to the original payment method.</p>}
              <p className="mt-1 text-[11px] text-slate-400">The updated total and exact payment adjustment appear after saving.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={save} disabled={saving || !lines.length} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving && <Loader2 size={15} className="animate-spin" />}{saving ? 'Updating...' : 'Save and update bill'}</button>
            </div>
          </div>
          {error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        </footer>
      </section>
    </div>
  );
}
