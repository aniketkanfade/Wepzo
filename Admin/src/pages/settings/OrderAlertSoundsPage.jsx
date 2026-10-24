import { useEffect, useState } from 'react';
import { Bell, Play, RotateCcw, Save, Truck, Upload, Volume2 } from 'lucide-react';
import api from '../../api/axios';
import { listBtnNavy, listBtnOutline, LIST_CARD_BORDER } from '../../constants/listTheme';
import { getAdminModuleLabel } from '../../constants/adminModules';
import { useModuleStore } from '../../store/useStore';
import { playAdminAlertSound } from '../../lib/orderNotifications';

const EVENT_DEFAULTS = {
  tone: 'classic',
  customAudio: '',
  fileName: '',
};
const DEFAULT_SOUNDS = {
  newOrder: { ...EVENT_DEFAULTS },
  riderUpdate: { ...EVENT_DEFAULTS, tone: 'chime' },
};
const TONES = [
  ['classic', 'Classic ring'],
  ['chime', 'Bright chime'],
  ['urgent', 'Urgent ring'],
  ['soft', 'Soft alert'],
  ['silent', 'Silent'],
  ['custom', 'Uploaded ringtone'],
];
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

function normalizeSounds(value) {
  return Object.fromEntries(Object.entries(DEFAULT_SOUNDS).map(([event, defaults]) => [
    event,
    { ...defaults, ...(value?.[event] || {}) },
  ]));
}

function readAudioFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('audio/')) {
      reject(new Error('Select an audio file for the ringtone.'));
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      reject(new Error('Choose an audio file smaller than 2 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('The audio file could not be read.'));
    reader.readAsDataURL(file);
  });
}

function SoundCard({ title, description, icon: Icon, value, onChange, onPreview, onError }) {
  const upload = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const customAudio = await readAudioFile(file);
      onChange({ tone: 'custom', customAudio, fileName: file.name });
      onError('');
    } catch (error) {
      onError(error.message);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: LIST_CARD_BORDER }}>
      <div className="flex items-start gap-3 border-b bg-slate-50 px-5 py-4" style={{ borderColor: LIST_CARD_BORDER }}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon size={19} /></span>
        <div><h2 className="font-semibold text-slate-800">{title}</h2><p className="mt-1 text-xs text-slate-500">{description}</p></div>
      </div>
      <div className="space-y-4 p-5">
        <label className="block text-xs font-semibold text-slate-600">
          Ringtone
          <select value={value.tone} onChange={event => onChange({ ...value, tone: event.target.value })} className={inputClass}>
            {TONES.map(([tone, label]) => <option value={tone} key={tone}>{label}</option>)}
          </select>
        </label>
        {value.tone === 'custom' && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Upload size={15} /> Choose audio
              <input type="file" accept="audio/*" onChange={upload} className="sr-only" />
            </label>
            <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{value.fileName || 'Upload an audio file (max 2 MB)'}</span>
            {value.customAudio && <button type="button" onClick={() => onChange({ ...value, customAudio: '', fileName: '' })} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Remove</button>}
          </div>
        )}
        <button type="button" onClick={onPreview} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50">
          <Play size={15} /> Preview ringtone
        </button>
      </div>
    </section>
  );
}

export default function OrderAlertSoundsPage() {
  const activeModule = useModuleStore(state => state.activeModule);
  const [sounds, setSounds] = useState(DEFAULT_SOUNDS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const moduleSlug = activeModule?.slug || activeModule?.type || '';
  const moduleId = activeModule?._id || '';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get('/settings/business').then(({ data }) => {
      if (active) setSounds(normalizeSounds(data?.orderAlertSounds));
    }).catch(requestError => {
      if (active) setError(requestError.response?.data?.message || 'Order alert settings could not be loaded.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [moduleId, moduleSlug]);

  const updateSound = (event, update) => setSounds(current => ({
    ...current,
    [event]: { ...current[event], ...update },
  }));

  const preview = async event => {
    try {
      await playAdminAlertSound(sounds[event]);
      setError('');
    } catch (previewError) {
      setError(previewError.message || 'The selected ringtone could not be played.');
    }
  };

  const save = async event => {
    event.preventDefault();
    if (Object.values(sounds).some(sound => sound.tone === 'custom' && !sound.customAudio)) {
      setError('Upload an audio file for each ringtone set to Uploaded ringtone.');
      return;
    }
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const { data } = await api.put('/settings/business', { orderAlertSounds: sounds });
      setSounds(normalizeSounds(data?.orderAlertSounds));
      window.dispatchEvent(new CustomEvent('wepzo:order-alert-sounds-updated', { detail: data?.orderAlertSounds }));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2400);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Order alert settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => setSounds(normalizeSounds(DEFAULT_SOUNDS));
  const moduleName = getAdminModuleLabel(activeModule);

  if (loading) return <div className="py-20 text-center text-slate-400">Loading order alert settings...</div>;

  return (
    <form onSubmit={save} className="mx-auto w-full max-w-4xl space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Volume2 size={20} className="text-blue-700" />Order Alert Ringtones</h1>
          <p className="mt-1 text-sm text-slate-500">Choose the sounds played in the admin panel for {moduleName}. Settings are saved separately for each web module.</p>
        </div>
        <button type="submit" disabled={saving} className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}>
          <Save size={15} />{saved ? 'Saved' : saving ? 'Saving...' : 'Save Ringtones'}
        </button>
      </div>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">Ringtones play while the matching web module is open in the admin panel. Browser and phone settings may still mute audio.</p>
      <SoundCard
        title="New order"
        description="Plays when a new order is detected in this module."
        icon={Bell}
        value={sounds.newOrder}
        onChange={update => updateSound('newOrder', update)}
        onPreview={() => preview('newOrder')}
        onError={setError}
      />
      <SoundCard
        title="Rider / order update"
        description="Plays when an existing order's rider assignment or delivery status changes."
        icon={Truck}
        value={sounds.riderUpdate}
        onChange={update => updateSound('riderUpdate', update)}
        onPreview={() => preview('riderUpdate')}
        onError={setError}
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={reset} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${listBtnOutline}`}><RotateCcw size={14} />Reset defaults</button>
        <button type="submit" disabled={saving} className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}><Save size={14} />{saved ? 'Saved' : saving ? 'Saving...' : 'Save Ringtones'}</button>
      </div>
    </form>
  );
}
