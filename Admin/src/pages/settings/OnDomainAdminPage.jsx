import { useEffect, useMemo, useState } from 'react';
import { Archive, Save, UploadCloud } from 'lucide-react';
import api from '../../api/axios';
import { listBtnNavy } from '../../constants/listTheme';

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export default function OnDomainAdminPage() {
  const [modules, setModules] = useState([]);
  const [moduleId, setModuleId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [zipFile, setZipFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selectedModule = useMemo(() => modules.find(module => String(module._id) === String(moduleId)), [modules, moduleId]);

  useEffect(() => {
    let active = true;
    api.get('/website-modules').then(({ data }) => {
      if (!active) return;
      const list = Array.isArray(data) ? data : [];
      setModules(list);
      setModuleId(list[0]?._id || '');
    }).catch(requestError => {
      if (active) setError(requestError.response?.data?.message || 'Website modules could not be loaded.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setTitle(selectedModule?.onDomainTitle || '');
    setDescription(selectedModule?.onDomainDescription || '');
    setPrice(selectedModule?.onDomainPrice ?? '');
    setStepsText((selectedModule?.onDomainSteps || []).join('\n'));
    setEnabled(selectedModule?.onDomainEnabled === true);
    setZipFile(null);
    setError('');
    setNotice('');
  }, [moduleId]);

  const save = async event => {
    event.preventDefault();
    if (!selectedModule) return;
    const parsedPrice = Number(price);
    if (enabled && (!Number.isFinite(parsedPrice) || parsedPrice <= 0)) {
      setError('Set a price greater than zero before enabling the On Domain package.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.put(`/website-modules/${selectedModule._id}`, {
        onDomainEnabled: enabled,
        onDomainTitle: title,
        onDomainDescription: description,
        onDomainPrice: Number.isFinite(parsedPrice) ? parsedPrice : 0,
        onDomainSteps: stepsText.split('\n').map(step => step.trim()).filter(Boolean).slice(0, 12),
      });
      setModules(current => current.map(module => module._id === data._id ? data : module));
      setNotice('On Domain page settings saved for this module.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'On Domain settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const uploadPackage = async event => {
    event.preventDefault();
    if (!selectedModule || !zipFile) {
      setError('Choose a ZIP package before uploading.');
      return;
    }
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const formData = new FormData();
      formData.append('file', zipFile);
      const { data } = await api.post(`/website-modules/${selectedModule._id}/on-domain-package`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setModules(current => current.map(module => module._id === selectedModule._id
        ? { ...module, onDomainPackageOriginalName: data.packageName, onDomainEnabled: true }
        : module));
      setEnabled(true);
      setZipFile(null);
      setNotice(`ZIP package uploaded: ${data.packageName}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The ZIP package could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  return <main className="mx-auto max-w-5xl space-y-5">
    <header className="flex items-start gap-3">
      <span className="rounded-xl bg-blue-50 p-3 text-blue-800"><Archive size={21}/></span>
      <div><h1 className="text-xl font-bold text-slate-900">On Domain Page</h1><p className="mt-1 text-sm text-slate-500">Configure the module-specific website package, purchase price, process, and ZIP customers can download after verified payment.</p></div>
    </header>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
    {!modules.length
      ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Add a Website Module before setting up its On Domain page.</p>
      : <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-700">Website module
            <select value={moduleId} onChange={event => setModuleId(event.target.value)} className={`${inputClass} mt-1`}>
              {modules.map(module => <option key={module._id} value={module._id}>{module.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">Page heading
            <input maxLength={120} value={title} onChange={event => setTitle(event.target.value)} className={`${inputClass} mt-1`} placeholder="Get your website package"/>
          </label>
          <label className="block text-sm font-medium text-slate-700">Page description
            <textarea rows="4" maxLength={3000} value={description} onChange={event => setDescription(event.target.value)} className={`${inputClass} mt-1`} placeholder="Describe what's included in the website ZIP and how the customer uses it."/>
          </label>
          <label className="block text-sm font-medium text-slate-700">Package price (INR)
            <input required min="1" max="10000000" type="number" step="1" value={price} onChange={event => setPrice(event.target.value)} className={`${inputClass} mt-1`} placeholder="4999"/>
          </label>
          <label className="block text-sm font-medium text-slate-700">Purchase and delivery steps <span className="font-normal text-slate-400">(one step per line)</span>
            <textarea rows="5" maxLength={3000} value={stepsText} onChange={event => setStepsText(event.target.value)} className={`${inputClass} mt-1`} placeholder={'Review the sample website and package details.\nPay securely using the checkout.\nDownload the ZIP after payment is verified.\nHost the website with your domain provider.'}/>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
            <input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"/>
            Enable purchase page for this module
          </label>
          <button type="submit" disabled={saving || !selectedModule} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${listBtnNavy}`}><Save size={16}/>{saving ? 'Saving...' : 'Save On Domain Settings'}</button>
        </form>

        <div className="space-y-5">
          <form onSubmit={uploadPackage} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div><h2 className="font-semibold text-slate-900">Website source ZIP</h2><p className="mt-1 text-xs leading-5 text-slate-500">Upload the module's ready-to-host website source package. It is stored privately and is only downloadable by customers after payment is verified. ZIP files are not extracted or run on the server.</p></div>
            <label className="block text-sm font-medium text-slate-700">Choose ZIP file
              <input type="file" accept=".zip,application/zip" onChange={event => setZipFile(event.target.files?.[0] || null)} className={`${inputClass} mt-1 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-800`}/>
            </label>
            <p className="text-xs text-slate-500">Current package: <span className="font-semibold text-slate-700">{selectedModule?.onDomainPackageOriginalName || 'No ZIP uploaded'}</span></p>
            <button type="submit" disabled={uploading || !zipFile} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><UploadCloud size={16}/>{uploading ? 'Uploading...' : 'Upload ZIP Package'}</button>
          </form>
          <section className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <h2 className="text-sm font-bold text-blue-950">Customer download locations</h2>
            <ul className="mt-3 space-y-2 text-xs text-blue-900"><li>1. On Domain page, immediately after successful payment</li><li>2. Website Dashboard</li><li>3. Plan & Subscription page</li></ul>
            <p className="mt-3 text-[11px] leading-5 text-blue-800">Each module has its own price and ZIP. Users cannot download another module’s package or access the download before payment verification.</p>
          </section>
        </div>
      </div>}
  </main>;
}
