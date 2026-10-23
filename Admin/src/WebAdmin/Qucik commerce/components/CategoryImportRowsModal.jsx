import { useEffect, useState } from 'react';
import { Edit2, Loader2, Save, Trash2, X } from 'lucide-react';
import api from '../../../api/axios';

const fieldsByType = {
  categories: [
    ['Name', 'Category Name'], ['Main Module ID', 'Main Module ID'], ['Priority', 'Priority'],
    ['Status', 'Status'], ['Featured', 'Featured'], ['Image', 'Image'],
  ],
  'sub-categories': [
    ['Name', 'Sub Category Name'], ['Category ID', 'Parent Category ID'], ['Priority', 'Priority'],
    ['Status', 'Status'], ['Featured', 'Featured'], ['Image', 'Image'],
  ],
  'child-categories': [
    ['Name', 'Child Category Name'], ['Sub Category ID', 'Parent Sub Category ID'], ['Priority', 'Priority'],
    ['Status', 'Status'], ['Featured', 'Featured'], ['Image', 'Image'],
  ],
};

export default function CategoryImportRowsModal({ item, onClose, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [legacy, setLegacy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fields = fieldsByType[item.dataType] || [];
  const url = `/bulk/history/import/${item._id}/rows`;

  const loadRows = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(url);
      setRows(data.rows || []);
      setLegacy(!!data.legacy);
    } catch (err) { setError(err.response?.data?.message || 'Imported rows could not be loaded.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRows(); }, [url]);

  const startEdit = row => { setEditing(row._recordId); setDraft(Object.fromEntries(fields.map(([key]) => [key, row[key] ?? '']))); };
  const saveEdit = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`${url}/${editing}`, draft);
      setEditing(null);
      await loadRows();
      onChanged?.();
    } catch (err) { setError(err.response?.data?.message || 'Could not update this row.'); }
    finally { setSaving(false); }
  };

  const deleteRow = async row => {
    if (!window.confirm(`Delete “${row.Name}” from the catalog?`)) return;
    setError('');
    try {
      await api.delete(`${url}/${row._recordId}`);
      await loadRows();
      onChanged?.();
    } catch (err) { setError(err.response?.data?.message || 'Could not delete this row.'); }
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-3 sm:p-6" onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
    <section className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b px-5 py-4">
        <div><h2 className="font-semibold text-gray-900">Imported Spreadsheet Data</h2><p className="mt-1 text-xs text-gray-500">{item.fileName} · {item.dataType}</p></div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={18}/></button>
      </header>
      {error && <p role="alert" className="mx-5 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {legacy ? <div className="m-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        This import was created before rows were linked to their catalog records, so its exact spreadsheet rows were not saved. Re-import existing records with their record IDs filled in and choose <b>Update Existing Data</b> to link them for viewing and editing here.
      </div> : loading ? <div className="flex flex-1 items-center justify-center py-16 text-sm text-gray-500"><Loader2 size={18} className="mr-2 animate-spin"/>Loading imported rows...</div> : <>
        {item.errors?.length > 0 && <div className="mx-5 mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700"><b>{item.errors.length} failed spreadsheet rows</b>{item.errors.slice(0, 8).map((row, index) => <p key={`${row.row}-${index}`}>Row {row.row}: {row.reason}</p>)}</div>}
        <div className="flex items-center justify-between px-5 py-3 text-sm text-gray-600"><span>{rows.length} current catalog rows linked to this import</span><span className="text-xs">IDs connect parent categories</span></div>
        <div className="flex-1 overflow-auto px-5 pb-5">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead className="sticky top-0 bg-gray-50 text-left text-xs text-gray-600"><tr><th className="border-b px-3 py-3">ID</th>{fields.map(([key, label]) => <th key={key} className="border-b px-3 py-3">{label}</th>)}<th className="border-b px-3 py-3">Actions</th></tr></thead>
            <tbody>
              {rows.map(row => <tr key={row._recordId} className="border-b border-gray-100 align-top">
                <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-gray-500">{row.ID}</td>
                {fields.map(([key]) => {
                  const value = String(row[key] ?? '');
                  const visible = key === 'Image' && value.length > 120 ? `${value.slice(0, 100)}…` : value;
                  return <td key={key} className="max-w-64 px-3 py-3 text-gray-700"><span className="line-clamp-2 break-all" title={key === 'Image' ? 'Image value' : undefined}>{visible}</span></td>;
                })}
                <td className="whitespace-nowrap px-3 py-3"><div className="flex gap-2">
                  <button type="button" onClick={() => startEdit(row)} title="Edit row" className="rounded p-1.5 text-blue-700 hover:bg-blue-50"><Edit2 size={15}/></button>
                  <button type="button" onClick={() => deleteRow(row)} title="Delete row" className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 size={15}/></button>
                </div></td>
              </tr>)}
              {!rows.length && <tr><td colSpan={fields.length + 2} className="px-4 py-12 text-center text-gray-400">No linked rows in this import.</td></tr>}
            </tbody>
          </table>
        </div>
        {editing && <div className="border-t bg-gray-50 p-5">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-gray-900">Edit imported row</h3><button type="button" onClick={() => setEditing(null)} className="text-sm text-gray-500">Cancel</button></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(([key, label]) => <label key={key} className="block"><span className="mb-1 block text-xs font-medium text-gray-600">{label}{['Main Module ID', 'Category ID', 'Sub Category ID'].includes(key) ? ' (required ID)' : ''}</span>
              {['Status', 'Featured'].includes(key) ? <select value={draft[key]} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"><option>Active</option><option>Inactive</option>{key === 'Featured' && <><option>Yes</option><option>No</option></>}</select>
                : <input value={draft[key]} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"/>}
            </label>)}
          </div>
          <div className="mt-4 flex justify-end"><button type="button" disabled={saving} onClick={saveEdit} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Save size={15}/>{saving ? 'Saving...' : 'Save Row'}</button></div>
        </div>}
      </>}
    </section>
  </div>;
}
