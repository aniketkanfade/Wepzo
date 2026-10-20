import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const itemKey = item => String(item.cartKey || item.id);
const storeIdOf = product => String(product.storeId || product.store?._id || product.store?.storeId || '');
const storeNameOf = product => String(product.storeName || (typeof product.store === 'string' ? product.store : product.store?.name) || '');
const sameStore = (left, right) => {
  const leftId = storeIdOf(left);
  const rightId = storeIdOf(right);
  if (leftId && rightId) return leftId === rightId;
  const leftName = storeNameOf(left).trim().toLowerCase();
  const rightName = storeNameOf(right).trim().toLowerCase();
  if (leftName && rightName) return leftName === rightName;
  return !leftId && !rightId && !leftName && !rightName;
};
const cartItemFromProduct = (product, qty) => ({
  cartKey: product.variantId ? `${product.id}::${product.variantId}` : String(product.id),
  id: product.id,
  productId: product.productId,
  moduleSlug: product.moduleSlug || 'grocery',
  variantId: product.variantId || '',
  name: product.name,
  image: product.image,
  price: product.price,
  mrp: product.mrp,
  unit: product.unit,
  storeId: storeIdOf(product),
  store: storeNameOf(product),
  qty,
});
const upsertProduct = (items, product, qty) => {
  const cartItem = cartItemFromProduct(product, qty);
  const index = items.findIndex(item => itemKey(item) === cartItem.cartKey);
  if (index >= 0) items[index] = { ...items[index], qty: items[index].qty + qty };
  else items.push(cartItem);
  return items;
};

export const useCart = create(persist((set, get) => ({
  items: [],
  couponCode: '',
  pendingAdd: null,
  setCouponCode: couponCode => set({ couponCode: String(couponCode || '').trim().toUpperCase() }),
  add: (product, qty = 1, options = {}) => {
    const items = [...get().items];
    if (items.length && items.some(item => !sameStore(item, product))) {
      set({ pendingAdd: { product, qty, checkout: options.checkout === true } });
      return false;
    }
    set({ items: upsertProduct(items, product, qty), pendingAdd: null });
    return true;
  },
  confirmPendingAdd: () => {
    const pendingAdd = get().pendingAdd;
    if (!pendingAdd) return null;
    set({ items: upsertProduct([], pendingAdd.product, pendingAdd.qty), couponCode: '', pendingAdd: null });
    return pendingAdd;
  },
  cancelPendingAdd: () => set({ pendingAdd: null }),
  setQty: (cartKey, qty) => {
    if (qty < 1) return set({ items: get().items.filter(item => itemKey(item) !== String(cartKey)) });
    set({ items: get().items.map(item => itemKey(item) === String(cartKey) ? { ...item, qty } : item) });
  },
  remove: cartKey => set({ items: get().items.filter(item => itemKey(item) !== String(cartKey)) }),
  clear: () => set({ items: [], couponCode: '' }),
  count: () => get().items.reduce((total, item) => total + item.qty, 0),
  subtotal: () => get().items.reduce((total, item) => total + item.price * item.qty, 0),
}), {
  name: 'wepzo-qc-cart',
  partialize: state => ({ items: state.items, couponCode: state.couponCode }),
}));
