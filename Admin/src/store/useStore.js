import { create } from 'zustand';

const normalizeModuleKey = value => {
  const raw = String(value || '').trim().toLowerCase().replace(/_/g, '-');
  if (!raw) return '';
  if (['qcommerce', 'quick-commerce', 'quick_commerce', 'ecommerce', 'e-commerce', 'e_commerce'].includes(raw)) return raw === 'ecommerce' || raw === 'e-commerce' || raw === 'e_commerce' ? 'ecommerce' : 'quick-commerce';
  if (['marketing', 'promotion', 'promotions'].includes(raw)) return 'marketing';
  if (['general', 'information-web', 'information_web', 'website', 'web'].includes(raw)) return 'general';
  return raw;
};

const normalizeModuleType = value => {
  const normalized = normalizeModuleKey(value);
  if (['quick-commerce', 'qcommerce', 'ecommerce'].includes(normalized)) return 'ecommerce';
  if (['marketing', 'promotion', 'promotions'].includes(normalized)) return 'marketing';
  if (['general', 'information-web', 'website'].includes(normalized)) return 'general';
  return normalized || 'ecommerce';
};

const normalizeStoredUser = user => {
  if (!user) return null;
  const selectedModuleId = String(user.selectedModuleId || user.websiteModuleId || '').trim();
  const selectedModuleSlug = normalizeModuleKey(user.selectedModuleSlug || user.websiteModuleSlug || '');
  return {
    ...user,
    selectedModuleId: selectedModuleId || user.selectedModuleId || user.websiteModuleId || '',
    selectedModuleSlug: selectedModuleSlug || user.selectedModuleSlug || user.websiteModuleSlug || 'quick-commerce',
    selectedModuleType: normalizeModuleType(user.selectedModuleType || selectedModuleSlug || user.selectedModuleSlug || user.websiteModuleSlug || 'quick-commerce'),
  };
};

const DEFAULT_ADMIN_MODULE = {
  _id: 'quick-commerce',
  id: 'quick-commerce',
  name: 'Quick Commerce',
  slug: 'quick-commerce',
  type: 'quick-commerce',
};

const savedAdminModule = JSON.parse(localStorage.getItem('adminModule') || 'null');

export const useModuleStore = create(set => ({
  activeModule: savedAdminModule || DEFAULT_ADMIN_MODULE,
  setActiveModule: module => {
    if (!module) return;
    const normalizedModule = {
      ...module,
      slug: normalizeModuleKey(module.slug || module.type || 'quick-commerce'),
      type: normalizeModuleType(module.type || module.slug || 'quick-commerce'),
      name: module.name || 'Quick Commerce',
    };
    localStorage.setItem('adminModule', JSON.stringify(normalizedModule));
    set({ activeModule: normalizedModule });
  },
}));

export const useAuthStore = create(set => ({
  user: normalizeStoredUser(JSON.parse(localStorage.getItem('user') || 'null')),
  token: localStorage.getItem('token') || null,
  setAuth: (user, token) => {
    const normalizedUser = normalizeStoredUser(user);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    localStorage.setItem('token', token);

    const selectedModuleSlug = normalizedUser?.selectedModuleSlug || normalizedUser?.websiteModuleSlug;
    const selectedModuleId = normalizedUser?.selectedModuleId || normalizedUser?.websiteModuleId || selectedModuleSlug;
    if (selectedModuleSlug) {
      const selectedModule = {
        _id: selectedModuleId,
        id: selectedModuleId,
        slug: normalizeModuleKey(selectedModuleSlug),
        name: normalizedUser.selectedModuleName || normalizedUser.selectedModuleSlug || normalizedUser.websiteModuleSlug || 'Website Module',
        type: normalizeModuleType(normalizedUser.selectedModuleType || selectedModuleSlug),
        moduleId: selectedModuleId,
      };
      useModuleStore.getState().setActiveModule(selectedModule);
    }

    set({ user: normalizedUser, token });
  },
  setWebsiteId: websiteId => set(state => {
    if (!state.user) return state;
    const user = { ...state.user, websiteId: String(websiteId || '') };
    localStorage.setItem('user', JSON.stringify(user));
    return { user };
  }),
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('adminModule');
    useModuleStore.getState().setActiveModule(DEFAULT_ADMIN_MODULE);
    set({ user: null, token: null });
  }
}));

export const useBuilderStore = create(set => ({
  website: null,
  selectedModule: null,
  components: [],
  totalAmount: 0,
  domain: null,

  setWebsite: website => {
    if (website?._id && useAuthStore.getState().user?.role === 'website_user') {
      useAuthStore.getState().setWebsiteId(website._id);
    }
    set({
      website,
      components: website?.components || [],
      totalAmount: website?.totalAmount || 0,
      domain: website?.domain || null,
      selectedModule: website?.moduleType || null
    });
  },

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
    website: null, selectedModule: null,
    components: [], totalAmount: 0, domain: null
  })
}));
