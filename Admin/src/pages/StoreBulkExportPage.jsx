import { useState, useEffect } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import api from '../api/axios';
import { PageCard } from '../components/PageCard';

export default function StoreBulkExportPage() {
  const [history, setHistory] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [storeCount, setStoreCount] = useState(0);

  useEffect(() => {
    api.get('/stores/bulk/history/export').then(r => setHistory(r.data)).catch(() => {});
    api.get('/stores/stats').then(r => setStoreCount(r.data.total || 0)).catch(() => {});
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await api.post('/stores/bulk/export');
      alert(`${data.totalRecords} stores exported — ${data.fileName}`);
      api.get('/stores/bulk/history/export').then(r => setHistory(r.data));
    } catch {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">Dashboard &gt; Store Management &gt; <span className="text-gray-700">Bulk Export</span></p>

      <PageCard>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Download size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Store Bulk Export</h1>
            <p className="text-sm text-gray-500">Saare stores ka data CSV mein download karein</p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap items-center gap-4 p-5 bg-gray-50 rounded-xl border border-gray-100 mb-5">
            <div className="w-12 h-12 bg-white rounded-xl border border-gray-200 flex items-center justify-center">
              <FileSpreadsheet size={22} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">All Stores Export</p>
              <p className="text-sm text-gray-500">{storeCount} stores available for export</p>
            </div>
            <button type="button" onClick={handleExport} disabled={exporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold">
              <Download size={16} /> {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>

          {history.length > 0 && (
            <table className="w-full text-sm">
              <thead><tr className="text-gray-500 bg-gray-50 text-xs">
                <th className="px-4 py-2 text-left">File</th><th className="px-4 py-2 text-left">Records</th>
                <th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Date</th>
              </tr></thead>
              <tbody>
                {history.map(h => (
                  <tr key={h._id} className="border-t border-gray-50">
                    <td className="px-4 py-2.5 font-medium text-primary-600">{h.fileName}</td>
                    <td className="px-4 py-2.5">{h.totalRecords}</td>
                    <td className="px-4 py-2.5">{h.exportType}</td>
                    <td className="px-4 py-2.5 text-gray-500">{h.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </PageCard>
    </div>
  );
}
