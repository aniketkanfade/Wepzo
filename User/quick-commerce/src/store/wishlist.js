import { create } from 'zustand';

export const useWishlist = create((set, get) => ({
  items: [],
  replace: items => set({ items: Array.isArray(items) ? items : [] }),
  has: (id) => get().items.some(x => x.id === id),
  toggle: (product) => {
    if (!product?.id) return;
    const items = get().items;
    const exists = items.some(x => x.id === product.id);
    set({
      items: exists
        ? items.filter(x => x.id !== product.id)
        : [...items, {
          id: product.id,
          productId: product.productId,
          name: product.name,
          image: product.image,
          price: product.price,
          mrp: product.mrp,
          unit: product.unit,
          discount: product.discount,
          category: product.category,
        }],
    });
  },
}));
