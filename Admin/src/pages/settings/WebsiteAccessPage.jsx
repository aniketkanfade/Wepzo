import { useEffect, useMemo, useState } from 'react';
import { Check, ShieldCheck, Save } from 'lucide-react';
import api from '../../api/axios';
import { useModuleStore } from '../../store/useStore';
import { getAdminSidebarMenu } from '../../WebAdmin/Qucik commerce/components/Sidebar';
import { WEBSITE_HEADER_ACCESS_OPTIONS } from '../../constants/websiteAccess';
import { getAdminModulePath } from '../../constants/adminModules';
import { LIST_CARD_BORDER as CARD_BORDER, listBtnNavy } from '../../constants/listTheme';

function leafPaths(item) {
  return [
    ...(item.path && item.path !== '#' ? [item.path] : []),
    ...(item.children || []).flatMap(leafPaths),
  ];
}

function AccessTree({ items, selected, onToggle, depth = 0 }) {
  return <div className={depth ? 'ml-4 border-l border-slate-100 pl-3' : ''}>
    {items.map((item, index) => {
      const paths = leafPaths(item);
      if (!paths.length) return null;
      const checked = paths.every(path => selected.includes(path));
      const partial = !checked && paths.some(path => selected.includes(path));
      const hasChildren = item.children?.length > 0;
      return <div key={`${item.label}-${index}`} className="py-1.5">
        <label className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 ${hasChildren ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
          <input type="checkbox" checked={checked} ref={node => { if (node) node.indeterminate = partial; }} onChange={() => onToggle(paths, !checked)} className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"/>
          <span className={`text-sm ${hasChildren ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{item.label}</span>
          {hasChildren && <span className="ml-auto text-[11px] text-slate-400">{paths.filter(path => selected.includes(path)).length}/{paths.length}</span>}
        </label>
        {hasChildren && <AccessTree items={item.children} selected={selected} onToggle={onToggle} depth={depth + 1}/>}
      </div>;
    })}
  </div>;
}

export default function WebsiteAccessPage() {
  const { activeModule } = useModuleStore();
  const [modules, setModules] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [headerAccess, setHeaderAccess] = useState([]);
  const [sidebarAccess, setSidebarAccess] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const selectedModule = useMemo(() => modules.find(module => module.slug === selectedSlug), [modules, selectedSlug]);
  const sidebarMenu = useMemo(() => selectedModule ? getAdminSidebarMenu(selectedModule) : [], [selectedModule]);
  const headerAccessOptions = useMemo(() => selectedModule ? [
    { path: getAdminModulePath(selectedModule), label: `${selectedModule.name} Admin` },
    ...WEBSITE_HEADER_ACCESS_OPTIONS,
  ] : WEBSITE_HEADER_ACCESS_OPTIONS, [selectedModule]);
  const activeSlug = String(activeModule?.slug || activeModule?.type || '').toLowerCase();

  useEffect(() => {
    api.get('/website-modules').then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setModules(list);
      if (!list.length) return;

      const normalizedActive = activeSlug && list.some(module => String(module.slug || module.type || '').toLowerCase() === activeSlug);
      const defaultSlug = normalizedActive
        ? list.find(module => String(module.slug || module.type || '').toLowerCase() === activeSlug)?.slug
        : list[0]?.slug;

      setSelectedSlug(current => {
        if (current && list.some(module => module.slug === current)) return current;
        return defaultSlug || '';
      });
    }).catch(() => setModules([])).finally(() => setLoading(false));
  }, [activeSlug]);

  useEffect(() => {
    const access = selectedModule?.access || {};
    setHeaderAccess(Array.isArray(access.header) ? access.header : []);
    setSidebarAccess(Array.isArray(access.sidebar) ? access.sidebar : []);
  }, [selectedModule]);

  const toggle = (setter, values, enabled) => setter(current => enabled
    ? [...new Set([...current, ...values])]
    : current.filter(path => !values.includes(path)));

  const save = async () => {
    if (!selectedModule) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/website-modules/${selectedModule._id}`, {
        access: { header: headerAccess, sidebar: sidebarAccess },
      });
      setModules(current => current.map(module => module._id === data._id ? data : module));
      window.dispatchEvent(new Event('wepzo:website-modules-updated'));
    } catch (error) {
      alert(error.response?.data?.message || 'Website access save nahi ho paya');
    } finally {
      setSaving(false);
    }
  };

  return <div className="mx-auto max-w-[1250px] space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2 text-slate-900"><ShieldCheck size={22} className="text-blue-800"/><h1 className="text-xl font-bold">Website Access</h1></div><p className="mt-1 text-sm text-slate-500">Choose which Header links and Sidebar pages users of each website module can open.</p></div>
      <button type="button" disabled={!selectedModule || saving} onClick={save} className={'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ' + listBtnNavy}><Save size={16}/>{saving ? 'Saving...' : 'Save Access'}</button>
    </div>

    <section className="rounded-xl border bg-white p-5 shadow-sm" style={{ borderColor: CARD_BORDER }}>
      <div className="block max-w-md">
        <span className="mb-1.5 block text-xs font-semibold text-slate-600">Website Module</span>
        <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">
          {loading ? 'Loading module...' : (selectedModule?.name || 'No module selected')}
        </div>
      </div>
      {!loading && !modules.length && <p className="mt-3 text-sm text-amber-700">Pehle Website Module page se module add karein.</p>}
      {selectedModule && <p className="mt-3 text-xs text-slate-500">{selectedModule.name} ke signup accounts ko neeche diye gaye pages hi milenge.</p>}
    </section>

    {selectedModule && <div className="grid gap-5 lg:grid-cols-2">
      <section className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: CARD_BORDER }}>
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Header Access</h2><p className="mt-1 text-xs text-slate-500">Choose which top navigation links appear for this module.</p></div>
        <div className="max-h-[620px] overflow-y-auto p-4"><AccessTree items={headerAccessOptions} selected={headerAccess} onToggle={(paths, enabled) => toggle(setHeaderAccess, paths, enabled)}/></div>
      </section>
      <section className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: CARD_BORDER }}>
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Sidebar Access</h2><p className="mt-1 text-xs text-slate-500">Enable a group to give all its pages, or choose individual nested pages.</p></div>
        <div className="max-h-[620px] overflow-y-auto p-4"><AccessTree items={sidebarMenu} selected={sidebarAccess} onToggle={(paths, enabled) => toggle(setSidebarAccess, paths, enabled)}/></div>
      </section>
    </div>}
    {selectedModule && <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800"><Check size={15}/> Module access saves with the selected Website Module and applies to its signup accounts.</div>}
  </div>;
}
