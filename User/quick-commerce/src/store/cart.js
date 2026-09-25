import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const itemKey = item => String(item.cartKey || item.id);

export const useCart = create(persist((set, get) => ({
  items: [],
  couponCode: '',
  setCouponCode: couponCode => set({ couponCode: String(couponCode || '').trim().toUpperCase() }),
  add: (product, qty = 1) => {
    const items = [...get().items];
    const cartKey = product.variantId ? `${product.id}::${product.variantId}` : String(product.id);
    const index = items.findIndex(item => itemKey(item) === cartKey);
    if (index >= 0) items[index] = { ...items[index], qty: items[index].qty + qty };
    else items.push({
      cartKey,
      id: product.id,
      productId: product.productId,
      variantId: product.variantId || '',
      name: product.name,
      image: product.image,
      price: product.price,
      mrp: product.mrp,
      unit: product.unit,
      qty,
    });
    set({ items });
  },
  setQty: (cartKey, qty) => {
    if (qty < 1) return set({ items: get().items.filter(item => itemKey(item) !== String(cartKey)) });
    set({ items: get().items.map(item => itemKey(item) === String(cartKey) ? { ...item, qty } : item) });
  },
  remove: cartKey => set({ items: get().items.filter(item => itemKey(item) !== String(cartKey)) }),
  clear: () => set({ items: [], couponCode: '' }),
  count: () => get().items.reduce((total, item) => total + item.qty, 0),
  subtotal: () => get().items.reduce((total, item) => total + item.price * item.qty, 0),
}), { name: 'wepzo-qc-cart' }));
