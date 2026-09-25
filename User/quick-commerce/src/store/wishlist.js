import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useWishlist = create(persist((set, get) => ({
  items: [],
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
}), { name: 'wepzo-qc-wishlist' }));
