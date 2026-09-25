import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, Save, Store, Briefcase, UserCircle, Truck } from 'lucide-react';
import api from '../../api/axios';
import { LIST_NAVY as NAVY, LIST_CARD_BORDER as CARD_BORDER, listBtnNavy } from '../../constants/listTheme';

const META = {
  store: {
    title: 'Store Access',
    subtitle: 'Admin se store panel ke sections control karo',
    icon: Store,
    category: 'store',
    roleSlug: 'store_admin',
  },
  vendor: {
    title: 'Vendor Access',
    subtitle: 'Vendor panel ke modules enable/disable karo',
    icon: Briefcase,
    category: 'vendor',
    roleSlug: 'vendor',
  },
  customer: {
    title: 'Customer Access',
    subtitle: 'Customer app features ka access control',
    icon: UserCircle,
    category: 'customer',
    roleSlug: 'customer',
  },
  'delivery-partner': {
    title: 'Delivery Partner Access',
    subtitle: 'Delivery partner app modules ka access',
    icon: Truck,
    category: 'delivery_partner',
    roleSlug: 'delivery_partner',
  },
};

export default function SettingsAccessPage() {
  const { type } = useParams();
  const meta = META[type] || META.store;
  const Icon = meta.icon;

  const [role, setRole] = useState(null);
  const [sections, setSections] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/roles'),
      api.get('/access', { params: { category: meta.category } }),
    ]).then(([rolesRes, accessRes]) => {
      const r = (rolesRes.data || []).find(x => x.slug === meta.roleSlug) || null;
      setRole(r);
      setSections(accessRes.data || []);
      setSelected([...(r?.accessSections || [])]);
    }).catch(() => {
      setRole(null);
      setSections([]);
    }).finally(() => setLoading(false));
  }, [type, meta.category, meta.roleSlug]);

  const allSlugs = useMemo(() => sections.map(s => s.slug), [sections]);

  const toggle = (slug) => {
    setSelected(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);
  };

  const toggleAll = () => {
    const categoryOn = allSlugs.every(s => selected.includes(s));
    if (categoryOn) setSelected(prev => prev.filter(s => !allSlugs.includes(s)));
    else setSelected(prev => [...new Set([...prev, ...allSlugs])]);
  };

  const handleSave = async () => {
    if (!role) return alert('Role nahi mila');
    setSaving(true);
    try {
      const others = (role.accessSections || []).filter(s => !allSlugs.includes(s));
      const next = [...others, ...selected.filter(s => allSlugs.includes(s))];
      const { data } = await api.put(`/roles/${role._id}`, { accessSections: next });
      setRole(data);
      setSelected(data.accessSections || []);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-gray-400">Loading access...</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Icon size={22} style={{ color: NAVY }} /> {meta.title}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{meta.subtitle}</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: CARD_BORDER }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Shield size={16} style={{ color: NAVY }} />
            {role?.name || meta.title} — modules
          </div>
          <button type="button" onClick={toggleAll} className="text-xs font-semibold text-[#1a3a8a] hover:underline">
            {allSlugs.every(s => selected.includes(s)) ? 'Unselect all' : 'Select all'}
          </button>
        </div>

        {sections.length === 0 ? (
          <p className="text-sm text-gray-400">Is type ke liye koi section nahi</p>
        ) : (
          <div className="space-y-2">
            {sections.map(s => (
              <label key={s.slug} className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                style={{ borderColor: CARD_BORDER }}>
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                  <p className="text-[11px] text-gray-400">{s.slug}</p>
                </div>
                <input type="checkbox" checked={selected.includes(s.slug)} onChange={() => toggle(s.slug)}
                  className="w-4 h-4 accent-[#1a3a8a]" />
              </label>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-5">
          <button type="button" onClick={handleSave} disabled={saving || !role}
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}>
            <Save size={14} /> {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Access'}
          </button>
        </div>
      </div>
    </div>
  );
}
