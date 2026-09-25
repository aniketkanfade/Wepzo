import { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, Upload, Download, Eye, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { downloadFile } from '../api/download';
import { PageCard } from '../components/PageCard';
import ImportDetailModal from '../components/ImportDetailModal';

const steps = ['Download Template', 'Fill Product Data', 'Upload File', 'Review & Import'];

export default function ProductBulkImportPage() {
  const [history, setHistory] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { api.get('/product-import-history').then(r => setHistory(r.data)).catch(() => {}); }, []);

  const handleUpload = async () => {
    if (!file) return alert('Select a file');
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post('/product-items/bulk-import', form, { headers: { 'Content-Type': undefined } });
      setHistory(prev => [data, ...prev]);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      alert(`Import done! Success: ${data.success}, Failed: ${data.failed}`);
    } catch (err) { alert(err.response?.data?.message || 'Import failed. Please check the CSV template and try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Dashboard &gt; Product Setup &gt; <span className="text-gray-700">Bulk Import</span></p>
      <PageCard>
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><FileSpreadsheet size={20} className="text-green-600" /></div>
            <div><h1 className="text-lg font-bold text-gray-900">Bulk Import</h1><p className="text-sm text-gray-500">Import products from a CSV file using the downloadable template.</p></div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 px-6 py-6 border-b border-gray-100">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
              <span className={`text-sm ${i === 0 ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>{s}</span>
              {i < steps.length - 1 && <div className="w-8 h-0.5 bg-gray-200 mx-2" />}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border-b border-gray-100">
          <div className="border border-gray-100 rounded-xl p-6 text-center">
            <Download size={32} className="mx-auto text-primary-600 mb-3" />
            <h3 className="font-semibold mb-2">Download Template</h3>
            <button type="button" onClick={() => downloadFile('/product-items/template', 'products_template.csv')}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
              Download CSV Template
            </button>
            <p className="text-xs text-gray-400 mt-2">Product Code column optional hai</p>
          </div>
          <div className="border border-gray-100 rounded-xl p-6 text-center">
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const selected = e.target.files?.[0]; if (selected && selected.size > 10 * 1024 * 1024) { alert("File must be smaller than 10 MB"); setFile(null); e.target.value = ""; return; } setFile(selected || null); }} />
            <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-primary-300">
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium">{file ? file.name : 'Drag & Drop or Choose File'}</p>
              <p className="text-xs text-gray-400 mt-1">.csv only (Max 10MB)</p>
            </div>
            <button onClick={handleUpload} disabled={loading || !file} className="mt-3 px-5 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50">{loading ? 'Importing...' : 'Upload & Import'}</button>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
            <h3 className="font-semibold text-blue-800 mb-3">Import Instructions</h3>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
              <li>Download CSV template</li><li>Fill product data — Product Code optional</li><li>Upload the saved .csv file</li><li>Review import results</li><li>Check failed records if any</li><li>Products will appear in Item List</li>
            </ol>
          </div>
        </div>
        <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Recent Imports</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500 border-b bg-gray-50"><th className="px-6 py-3 text-left">#</th><th className="px-4 py-3 text-left">File Name</th><th className="px-4 py-3 text-left">Total</th><th className="px-4 py-3 text-left">Success</th><th className="px-4 py-3 text-left">Failed</th><th className="px-4 py-3 text-left">Imported On</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Action</th></tr></thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={h._id} className="border-b border-gray-50">
                  <td className="px-6 py-3">{i + 1}</td><td className="px-4 py-3 font-medium">{h.fileName}</td><td className="px-4 py-3">{h.totalProducts}</td>
                  <td className="px-4 py-3 text-green-600 font-medium">{h.success}</td><td className="px-4 py-3 text-red-500">{h.failed}</td>
                  <td className="px-4 py-3 text-gray-500">{h.importedOn}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">{h.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button type="button" title="View" onClick={() => setViewItem(h)}
                        className="p-1.5 text-primary-600 hover:bg-primary-50 rounded">
                        <Eye size={14} />
                      </button>
                      <button type="button" title="Remove" onClick={() => setHistory(prev => prev.filter(x => x._id !== h._id))}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageCard>

      {viewItem && <ImportDetailModal item={viewItem} onClose={() => setViewItem(null)} />}
    </div>
  );
}
