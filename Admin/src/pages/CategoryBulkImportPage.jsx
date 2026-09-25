import { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet, CheckCircle, Upload, Download, Eye, HelpCircle
} from 'lucide-react';
import api from '../api/axios';
import { downloadFile } from '../api/download';

const steps = [
  { num: 1, title: 'Download Excel File', desc: 'Download the format file and fill it with proper data. You can see the example file for reference.', icon: FileSpreadsheet, color: 'text-green-600 bg-green-50' },
  { num: 2, title: 'Match Spreadsheet Data', desc: 'Fill the spreadsheet with category data. Parent category position is 0, sub-category position is 1.', icon: FileSpreadsheet, color: 'text-blue-600 bg-blue-50' },
  { num: 3, title: 'Validate Data and Import', desc: 'Upload .csv or .xlsx file. System validates automatically. Copy image paths from gallery for images.', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
];

const types = [
  { key: 'categories', label: 'Category' },
  { key: 'sub-categories', label: 'Sub Category' },
  { key: 'child-categories', label: 'Child Category' },
];

export default function CategoryBulkImportPage() {
  const [dataType, setDataType] = useState('categories');
  const [uploadMode, setUploadMode] = useState('new');
  const [file, setFile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { loadHistory(); }, [dataType]);

  const loadHistory = () => {
    api.get(`/bulk/history/import?type=${dataType}`).then(res => setHistory(res.data)).catch(() => {});
  };

  const downloadTemplate = (withData) => {
    downloadFile(`/bulk/${dataType}/template?withData=${withData}`, `${dataType}_template.csv`);
  };

  const handleFile = (f) => {
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) setFile(f);
    else alert('Please upload .csv or .xlsx file');
  };

  const handleUpload = async () => {
    if (!file) return alert('Please select a file');
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('mode', uploadMode);
    try {
      const { data } = await api.post(`/bulk/${dataType}/import`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`Import done! Success: ${data.success}, Failed: ${data.failed}`);
      setFile(null);
      loadHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Dashboard &gt; Categories &gt; <span className="text-gray-700">Bulk Import</span></p>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Category Bulk Import</h1>
          <p className="text-sm text-gray-500 mt-1">Import categories, sub categories or child categories from spreadsheet</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 border border-primary-200 rounded-lg">
          <HelpCircle size={16} /> Help
        </button>
      </div>

      {/* Type selector */}
      <div className="flex gap-2">
        {types.map(t => (
          <button key={t.key} onClick={() => { setDataType(t.key); setFile(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${dataType === t.key ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map(s => (
          <div key={s.num} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon size={20} />
            </div>
            <p className="text-xs text-primary-600 font-semibold">Step {s.num}</p>
            <h3 className="font-semibold text-gray-900 mt-1">{s.title}</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Template download */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Download Spreadsheet Template</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => downloadTemplate(true)}
            className="px-5 py-2.5 border-2 border-primary-600 text-primary-600 rounded-lg text-sm font-medium hover:bg-primary-50">
            Template With Existing Data
          </button>
          <button onClick={() => downloadTemplate(false)}
            className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
            Template Without Data
          </button>
        </div>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-5">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Select Data Upload Type</h3>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="mode" checked={uploadMode === 'new'} onChange={() => setUploadMode('new')} className="text-primary-600" />
              <span className="text-sm"><strong>Upload New Data</strong> <span className="text-gray-400">— Import new records</span></span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="mode" checked={uploadMode === 'update'} onChange={() => setUploadMode('update')} className="text-primary-600" />
              <span className="text-sm"><strong>Update Existing Data</strong> <span className="text-gray-400">— Update by ID</span></span>
            </label>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Import File</h3>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={e => handleFile(e.target.files?.[0])} />
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
          >
            <Upload size={32} className="mx-auto text-gray-400 mb-3" />
            <p className="font-medium text-gray-700">Drag & Drop your Excel file here or <span className="text-primary-600">Choose File</span></p>
            {file && <p className="text-sm text-primary-600 mt-2 font-medium">{file.name}</p>}
            <p className="text-xs text-gray-400 mt-2">Supported: .csv, .xls, .xlsx (Max 10MB)</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
            className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Reset</button>
          <button onClick={handleUpload} disabled={loading || !file}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Recent Imports */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Imports</h3>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 bg-gray-50 sticky top-0">
                <th className="text-left px-6 py-3">#</th>
                <th className="text-left px-4 py-3">File Name</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Success</th>
                <th className="text-left px-4 py-3">Failed</th>
                <th className="text-left px-4 py-3">Uploaded By</th>
                <th className="text-left px-4 py-3">Date</th>
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
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${h.type === 'New' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{h.type}</span>
                  </td>
                  <td className="px-4 py-3">{h.totalRecords}</td>
                  <td className="px-4 py-3 text-green-600 font-medium">{h.success}</td>
                  <td className="px-4 py-3 text-red-500 font-medium">{h.failed}</td>
                  <td className="px-4 py-3">{h.uploadedBy}</td>
                  <td className="px-4 py-3 text-gray-500">{h.date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${h.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{h.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="flex items-center gap-1 text-primary-600 text-xs font-medium hover:underline">
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={10} className="px-6 py-10 text-center text-gray-400">No imports yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
