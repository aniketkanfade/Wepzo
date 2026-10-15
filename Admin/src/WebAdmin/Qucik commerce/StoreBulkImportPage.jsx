import { useState, useEffect, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle } from 'lucide-react';
import api from '../../api/axios';
import { downloadFile } from '../../api/download';
import { PageCard } from './components/PageCard';

export default function StoreBulkImportPage() {
  const [file, setFile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/stores/bulk/history/import').then(r => setHistory(r.data)).catch(() => {});
  }, []);

  const handleUpload = async () => {
    if (!file) return alert('Excel .xlsx file select karein');
    setLoading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const { data } = await api.post('/stores/bulk/import', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      const errors = (data.errors || []).slice(0, 5).map(error => `Row ${error.row}: ${error.reason}`).join('\n');
      alert(`Import done! ${data.success} stores added, ${data.failed} failed${errors ? `\n\n${errors}` : ''}`);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      api.get('/stores/bulk/history/import').then(r => setHistory(r.data));
    } catch (error) {
      alert(error.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageCard>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <Upload size={20} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Store Bulk Import</h1>
            <p className="text-sm text-gray-500">Excel workbook se stores import karein; Zone ID se har store zone ke saath link hoga</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: FileSpreadsheet, title: 'Download Template', desc: 'Excel template download karke store details bharein', color: 'text-green-600 bg-green-50' },
              { icon: FileSpreadsheet, title: 'Fill Data', desc: 'Name, Owner Name, Phone, Email, Zone ID, Area, Address', color: 'text-blue-600 bg-blue-50' },
              { icon: CheckCircle, title: 'Upload & Import', desc: 'Excel upload karein; Zone ID validate karke store link hoga', color: 'text-emerald-600 bg-emerald-50' },
            ].map((s, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                  <s.icon size={18} />
                </div>
                <p className="font-semibold text-sm text-gray-800">{s.title}</p>
                <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
                {i === 0 && <button type="button" onClick={() => downloadFile('/stores/bulk/template', 'stores_template.xlsx').catch(error => alert(error.response?.data?.message || 'Template download failed'))} className="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700">Download Excel Template</button>}
              </div>
            ))}
          </div>

          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition">
            <Upload size={28} className="text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">{file ? file.name : 'Excel .xlsx file yahan drop karein ya click karein'}</p>
            <p className="mt-1 text-xs text-gray-400">Zone ID template ke mutabiq zaroor bharein</p>
            <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={e => {
              const selected = e.target.files?.[0];
              if (selected && !selected.name.toLowerCase().endsWith('.xlsx')) { alert('Please select an .xlsx Excel workbook'); e.target.value = ''; return; }
              setFile(selected || null);
            }} />
          </div>

          <button type="button" onClick={handleUpload} disabled={loading || !file}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold">
            {loading ? 'Importing...' : 'Import Stores'}
          </button>
        </div>

        {history.length > 0 && (
          <div className="border-t border-gray-100">
            <p className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Import History</p>
            <table className="w-full text-sm">
              <thead><tr className="text-gray-500 bg-gray-50 text-xs">
                <th className="px-4 py-2 text-left">File</th><th className="px-4 py-2 text-left">Records</th>
                <th className="px-4 py-2 text-left">Success</th><th className="px-4 py-2 text-left">Date</th>
              </tr></thead>
              <tbody>
                {history.map(h => (
                  <tr key={h._id} className="border-t border-gray-50">
                    <td className="px-4 py-2.5">{h.fileName}</td>
                    <td className="px-4 py-2.5">{h.totalRecords}</td>
                    <td className="px-4 py-2.5 text-green-600 font-medium">{h.success}</td>
                    <td className="px-4 py-2.5 text-gray-500">{h.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>
    </div>
  );
}
