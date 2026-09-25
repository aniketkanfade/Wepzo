import { create } from 'zustand';

const DEFAULT_ADMIN_MODULE = {
  _id: 'ecommerce',
  id: 'ecommerce',
  name: 'Quick Commerce',
  slug: 'ecommerce',
  type: 'ecommerce',
};

const savedAdminModule = JSON.parse(localStorage.getItem('adminModule') || 'null');

export const useModuleStore = create(set => ({
  activeModule: savedAdminModule || DEFAULT_ADMIN_MODULE,
  setActiveModule: module => {
    localStorage.setItem('adminModule', JSON.stringify(module));
    set({ activeModule: module });
  },
}));

export const useAuthStore = create(set => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null });
  }
}));

export const useBuilderStore = create(set => ({
  isOpen: false,
  website: null,
  selectedModule: null,
  components: [],
  totalAmount: 0,
  domain: null,

  openBuilder: () => set({ isOpen: true }),
  closeBuilder: () => set({ isOpen: false }),

  setWebsite: website => set({
    website,
    components: website?.components || [],
    totalAmount: website?.totalAmount || 0,
    domain: website?.domain || null,
    selectedModule: website?.moduleType || null
  }),

  setModule: moduleType => set({ selectedModule: moduleType }),

  addComponent: component => set(state => {
    const newComponents = [...state.components, component];
    const total = newComponents.reduce((s, c) => s + (c.price || 0), 0) + (state.domain?.price || 0);
    return { components: newComponents, totalAmount: total };
  }),

  removeComponent: index => set(state => {
    const newComponents = state.components.filter((_, i) => i !== index);
    const total = newComponents.reduce((s, c) => s + (c.price || 0), 0) + (state.domain?.price || 0);
    return { components: newComponents, totalAmount: total };
  }),

  setDomain: domain => set(state => {
    const compTotal = state.components.reduce((s, c) => s + (c.price || 0), 0);
    return { domain, totalAmount: compTotal + (domain?.price || 0) };
  }),

  reset: () => set({
    isOpen: false, website: null, selectedModule: null,
    components: [], totalAmount: 0, domain: null
  })
}));
