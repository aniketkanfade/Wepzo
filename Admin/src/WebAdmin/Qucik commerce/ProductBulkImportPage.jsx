import { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, Upload, Download, Eye, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import { downloadFile } from '../../api/download';
import { PageCard } from './components/PageCard';
import ImportDetailModal from './components/ImportDetailModal';

const steps = ['Download Excel Template', 'Fill Product Data', 'Upload File', 'Review Import Results'];

export default function ProductBulkImportPage() {
  const [history, setHistory] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { api.get('/product-import-history').then(r => setHistory(r.data)).catch(() => {}); }, []);

  const handleFile = selected => {
    if (!selected) return;
    const extension = selected.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'csv'].includes(extension)) {
      alert('Please choose an .xlsx Excel workbook or .csv file.');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      alert('File must be smaller than 10 MB.');
      return;
    }
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return alert('Select an Excel or CSV file.');
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post('/product-items/bulk-import', form, { headers: { 'Content-Type': undefined } });
      setHistory(prev => [data, ...prev]);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      alert(`Import done! Success: ${data.success}, Failed: ${data.failed}${data.errors?.length ? `\nFirst issue: Row ${data.errors[0].row}: ${data.errors[0].reason}` : ''}`);
    } catch (err) { alert(err.response?.data?.message || 'Import failed. Please check the Excel template and try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <PageCard>
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><FileSpreadsheet size={20} className="text-green-600" /></div>
            <div><h1 className="text-lg font-bold text-gray-900">Bulk Import</h1><p className="text-sm text-gray-500">Import product data from an Excel workbook or CSV file.</p></div>
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
            <button type="button" onClick={() => downloadFile('/product-items/template?format=xlsx', 'products_template.xlsx')}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
              Download Excel Template
            </button>
            <button type="button" onClick={() => downloadFile('/product-items/template?format=csv', 'products_template.csv')}
              className="ml-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              CSV
            </button>
            <p className="text-xs text-gray-400 mt-2">Product Code aur Store optional hain. Excel template mein saare supported fields hain.</p>
          </div>
          <div className="border border-gray-100 rounded-xl p-6 text-center">
            <input ref={fileRef} type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 cursor-pointer ${dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
            >
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium">{file ? file.name : 'Drag & Drop or Choose File'}</p>
              <p className="text-xs text-gray-400 mt-1">Excel .xlsx or .csv (Max 10MB)</p>
            </div>
            <button onClick={handleUpload} disabled={loading || !file} className="mt-3 px-5 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50">{loading ? 'Importing...' : 'Upload & Import'}</button>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
            <h3 className="font-semibold text-blue-800 mb-3">Import Instructions</h3>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
              <li>Download the Excel template</li><li>Fill product data and keep the column headers unchanged</li><li>Store and Product Code are optional</li><li>Upload the .xlsx or .csv file</li><li>Open import details to review failed rows</li><li>Successful products appear in Item List</li>
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
