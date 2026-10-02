import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import api from '../api/axios';
import { useModuleStore } from '../store/useStore';
import { getAdminModuleKey, getAdminModulePath } from '../constants/adminModules';

const DEFAULT_MODULE_OPTIONS = [
  { _id: 'quick-commerce', name: 'Quick Commerce', slug: 'quick-commerce', type: 'quick-commerce' },
  { _id: 'e-commerce', name: 'E-Commerce', slug: 'e-commerce', type: 'e-commerce' },
  { _id: 'store-singlepage-web', name: 'Store Singlepage Web', slug: 'store-singlepage-web', type: 'store-singlepage-web' },
  { _id: 'marketing', name: 'Marketing', slug: 'marketing', type: 'marketing' },
  { _id: 'general', name: 'Information Web', slug: 'general', type: 'general' },
];

export default function ModuleSwitcher() {
  const navigate = useNavigate();
  const { activeModule, setActiveModule } = useModuleStore();
  const [modules, setModules] = useState(DEFAULT_MODULE_OPTIONS);
  const activeModuleKey = getAdminModuleKey(activeModule);
  let currentUser = null;
  try { currentUser = JSON.parse(localStorage.getItem('user') || 'null'); } catch { currentUser = null; }
  const lockedSlug = currentUser?.employeeId
    ? String(currentUser.selectedModuleSlug || currentUser.websiteModuleSlug || 'ecommerce').toLowerCase()
    : '';

  useEffect(() => {
    const loadModules = () => {
      api.get('/website-modules').then(({ data }) => {
        const available = Array.isArray(data) ? data : [];
        const active = available.filter(module => module.status !== false && module.status !== 'false' && module.status !== 'inactive');
        const byId = new Map(active.map(module => [String(module._id || module.id || module.slug).toLowerCase(), module]));
        DEFAULT_MODULE_OPTIONS.forEach(module => {
          const key = getAdminModuleKey(module);
          if (![...byId.values()].some(option => getAdminModuleKey(option) === key)) byId.set(module.slug, module);
        });
        const options = [...byId.values()].filter(module => !lockedSlug || String(module.slug || module.type || '').toLowerCase() === lockedSlug);
        setModules(options.length ? options : DEFAULT_MODULE_OPTIONS.filter(module => !lockedSlug || String(module.slug).toLowerCase() === lockedSlug));
        const selectedKey = lockedSlug ? getAdminModuleKey({ slug: lockedSlug }) : activeModuleKey;
        const selected = options.find(module => getAdminModuleKey(module) === selectedKey);
        if (!selected) {
          const fallback = (lockedSlug && options[0]) || options.find(module => ['qcommerce', 'quick-commerce', 'quick_commerce'].includes(String(module.slug || '').toLowerCase()) || String(module.name || '').toLowerCase().includes('quick commerce'))
            || options.find(module => getAdminModuleKey(module) === 'quick-commerce') || options[0];
          if (fallback) setActiveModule(fallback);
        }
      }).catch(() => setModules(lockedSlug
        ? DEFAULT_MODULE_OPTIONS.filter(module => String(module.slug).toLowerCase() === lockedSlug)
        : DEFAULT_MODULE_OPTIONS));
    };
    loadModules();
    window.addEventListener('wepzo:website-modules-updated', loadModules);
    return () => window.removeEventListener('wepzo:website-modules-updated', loadModules);
  }, [activeModuleKey, lockedSlug, setActiveModule]);

  const selectedSlug = useMemo(() => {
    const selected = modules.find(module => getAdminModuleKey(module) === activeModuleKey);
    return String(selected?.slug || selected?.type || modules[0]?.slug || modules[0]?.type || 'quick-commerce').toLowerCase();
  }, [modules, activeModuleKey]);

  const selectModule = event => {
    const module = modules.find(option => String(option.slug || option.type).toLowerCase() === event.target.value);
    if (!module) return;
    setActiveModule(module);
    navigate(getAdminModulePath(module));
  };

  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
      <LayoutGrid size={16} className="shrink-0 text-slate-500" />
      <select aria-label="Active website module" value={selectedSlug} onChange={selectModule} disabled={!!lockedSlug} className="max-w-44 cursor-pointer bg-transparent outline-none disabled:cursor-default">
        {modules.map(module => <option key={module._id || module.id || module.slug} value={String(module.slug || module.type).toLowerCase()}>{module.name || module.slug}</option>)}
      </select>
    </label>
  );
}
