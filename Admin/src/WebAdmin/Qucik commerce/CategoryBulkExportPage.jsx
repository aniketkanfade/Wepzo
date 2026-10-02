import { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, HelpCircle, CheckCircle } from 'lucide-react';
import api from '../../api/axios';
import { downloadFile } from '../../api/download';

const types = [
  { key: 'categories', label: 'Category' },
  { key: 'sub-categories', label: 'Sub Category' },
  { key: 'child-categories', label: 'Child Category' },
];

const exportTypes = ['All Data', 'Category', 'Sub Category', 'Child Category'];

export default function CategoryBulkExportPage() {
  const [dataType, setDataType] = useState('categories');
  const [exportType, setExportType] = useState('All Data');
  const [status, setStatus] = useState('All');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadHistory(); }, [dataType]);

  const loadHistory = () => {
    api.get(`/bulk/history/export?type=${dataType}`).then(res => setHistory(res.data)).catch(() => {});
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      await downloadFile(`/bulk/${dataType}/export?exportType=${encodeURIComponent(exportType)}`, `${dataType}_${date}.csv`);
      loadHistory();
    } catch {
      alert('Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Category Bulk Export</h1>
          <p className="text-sm text-gray-500 mt-1">Export categories data to spreadsheet file</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 border border-primary-200 rounded-lg">
          <HelpCircle size={16} /> Help
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
            <FileSpreadsheet size={20} className="text-blue-600" />
          </div>
          <p className="text-xs text-primary-600 font-semibold">Step 1</p>
          <h3 className="font-semibold mt-1">Select Data Type</h3>
          <p className="text-xs text-gray-500 mt-2">Choose category, sub category or child category to export.</p>
        </div>
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-3">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <p className="text-xs text-primary-600 font-semibold">Step 2</p>
          <h3 className="font-semibold mt-1">Export & Download</h3>
          <p className="text-xs text-gray-500 mt-2">Apply filters and download as CSV/Excel file.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Export Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Data Type</label>
            <select value={dataType} onChange={e => setDataType(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none">
              {types.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Export Type</label>
            <select value={exportType} onChange={e => setExportType(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none">
              {exportTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none">
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={() => { setExportType('All Data'); setStatus('All'); }}
            className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Clear</button>
          <button onClick={handleExport} disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
            <Download size={16} /> {loading ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Exports</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 bg-gray-50">
                <th className="text-left px-6 py-3">#</th>
                <th className="text-left px-4 py-3">File Name</th>
                <th className="text-left px-4 py-3">Export Type</th>
                <th className="text-left px-4 py-3">Total Records</th>
                <th className="text-left px-4 py-3">Exported By</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={h._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{h.fileName}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{h.exportType}</span>
                  </td>
                  <td className="px-4 py-3">{h.totalRecords}</td>
                  <td className="px-4 py-3">{h.exportedBy}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">{h.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => downloadFile(`/bulk/${dataType}/export`, h.fileName)}
                      className="flex items-center gap-1 text-primary-600 text-xs font-medium hover:underline">
                      <Download size={14} /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
