import { useEffect, useState } from 'react';
import { Archive, Download, LoaderCircle } from 'lucide-react';
import api from '../api/axios';
import { useAuthStore } from '../store/useStore';

export default function OnDomainDownloadCard() {
  const user = useAuthStore(state => state.user);
  const [packageInfo, setPackageInfo] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (user?.role !== 'website_user') return undefined;
    let active = true;
    api.get('/on-domain/package').then(({ data }) => {
      if (active) setPackageInfo(data);
    }).catch(requestError => {
      if (active) setError(requestError.response?.data?.message || 'On Domain package status could not be loaded.');
    });
    return () => { active = false; };
  }, [user?.role, user?.id, user?.websiteId, user?.selectedModuleSlug]);

  if (user?.role !== 'website_user' || (!packageInfo && !error)) return null;
  if (packageInfo && !packageInfo.purchased) return null;

  const download = async () => {
    setDownloading(true);
    setError('');
    try {
      const response = await api.get('/on-domain/download', { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = packageInfo?.packageName || 'website-package.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError('The website ZIP could not be downloaded. Please try again or contact support.');
    } finally {
      setDownloading(false);
    }
  };

  return <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5"><span className="rounded-lg bg-white p-2 text-emerald-800"><Archive size={17}/></span><div><h2 className="text-sm font-bold text-emerald-950">On Domain Website ZIP</h2><p className="mt-0.5 text-xs text-emerald-800">{packageInfo?.packageName || 'Payment verified. Your package is ready.'}</p></div></div>
      <button type="button" disabled={downloading || !packageInfo?.hasPackage} onClick={download} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{downloading ? <LoaderCircle size={14} className="animate-spin"/> : <Download size={14}/>}Download ZIP</button>
    </div>
    {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
  </section>;
}
