import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Info, RefreshCw, Search, Settings } from 'lucide-react';
import api from '../../api/axios';
import { SETTINGS_HUB_CARDS, SETTINGS_FORM_DEFAULTS } from '../../constants/settingsHub';
import { LIST_CARD_BORDER as CARD_BORDER } from '../../constants/listTheme';

function formatBackup(value) {
  if (!value) return SETTINGS_FORM_DEFAULTS.lastBackupAt;
  return value;
}

export default function SettingsHubPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [info, setInfo] = useState({ ...SETTINGS_FORM_DEFAULTS });
  const [refreshing, setRefreshing] = useState(false);

  const loadInfo = () => {
    setRefreshing(true);
    return api.get('/settings/business')
      .then(r => setInfo({ ...SETTINGS_FORM_DEFAULTS, ...(r.data || {}) }))
      .catch(() => {})
      .finally(() => setRefreshing(false));
  };

  useEffect(() => { loadInfo(); }, []);

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SETTINGS_HUB_CARDS;
    return SETTINGS_HUB_CARDS.filter(c =>
      c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Settings size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your website settings, system configurations and preferences</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-xs text-gray-400 hidden sm:block">Home / <span className="text-gray-600">Settings</span></p>
          <div className="relative w-full lg:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search settings..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map(card => (
          <button
            key={card.key}
            type="button"
            onClick={() => navigate(card.path)}
            className="flex items-start gap-3 text-left bg-white rounded-xl border p-4 shadow-sm hover:shadow-md hover:border-blue-100 transition"
            style={{ borderColor: CARD_BORDER }}
          >
            <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.iconBg} ${card.iconColor}`}>
              <card.icon size={18} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-semibold text-gray-800 text-sm">{card.label}</span>
              <span className="block text-xs text-gray-500 mt-0.5 leading-relaxed">{card.desc}</span>
            </span>
            <ChevronRight size={16} className="text-gray-300 mt-1 shrink-0" />
          </button>
        ))}
        {cards.length === 0 && (
          <p className="text-sm text-gray-400 col-span-full py-8 text-center">No settings matched “{query}”</p>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: CARD_BORDER }}>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: CARD_BORDER }}>
          <div className="flex items-center gap-2 text-[#1a3a8a] font-semibold">
            <Info size={16} /> System Information
          </div>
          <button type="button" onClick={loadInfo} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1a3a8a]">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 px-5 py-4">
          {[
            ['Platform Name', (info.platformName || 'WEPZO').toUpperCase()],
            ['Version', info.appVersion || 'v1.0.0'],
            ['Environment', info.environment || 'Production'],
            ['PHP Version', info.phpVersion || '8.1.0'],
            ['Database', info.dbVersion || 'MySQL 8.0'],
            ['Server', info.serverOs || 'Linux'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] text-gray-400">{label}</p>
              <p className="text-sm font-semibold text-gray-800 mt-1 flex items-center gap-1.5">
                {label === 'Environment' && <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />}
                {value}
              </p>
            </div>
          ))}
        </div>
        <div className="px-5 pb-4 text-xs text-gray-500">
          Last Backup: <span className="font-medium text-gray-700">{formatBackup(info.lastBackupAt)}</span>
          <Link to="/settings/backup" className="ml-3 text-blue-600 hover:underline">Manage backups</Link>
        </div>
      </div>
    </div>
  );
}
