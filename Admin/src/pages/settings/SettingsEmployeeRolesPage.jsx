import { useState, useEffect, useMemo, useRef } from 'react';
import { Shield, Plus, X, Save, Trash2, Edit } from 'lucide-react';
import api from '../../api/axios';
import {
  LIST_NAVY as NAVY, LIST_CARD_BORDER as CARD_BORDER, listBtnNavy, listBtnOutline,
  listTheadClass, listTheadStyle, listThClass, listTdClass, listRowClass, listRowStyle,
} from '../../constants/listTheme';
import {
  ROLE_ACTIONS, ROLE_GROUPS,
  emptyPermissions, permissionsFromRole, accessSectionsFromPermissions, countGranted,
  groupActionState, applyGroupAction, applyGroupAll,
  applyAllAction, applySelectAll, allActionState, selectAllState,
} from '../../constants/rolePermissions';

function TriCheckbox({ state, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'mixed';
  }, [state]);
  return (
    <label className="inline-flex items-center justify-center cursor-pointer">
      <input
        ref={ref}
        type="checkbox"
        checked={state === 'on'}
        onChange={e => onChange(e.target.checked)}
        aria-label={label}
        className="w-4 h-4 rounded accent-[#1a3a8a] cursor-pointer"
      />
    </label>
  );
}

export default function SettingsEmployeeRolesPage() {
  const [roles, setRoles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: emptyPermissions() });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/roles').then(r => setRoles(r.data || [])).catch(() => setRoles([]));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing('new');
    setForm({ name: '', description: '', permissions: emptyPermissions() });
  };

  const openEdit = (role) => {
    setEditing(role);
    setForm({
      name: role.name,
      description: role.description || '',
      permissions: permissionsFromRole(role),
    });
  };

  const setPerms = (permissions) => setForm(f => ({ ...f, permissions }));

  const setCell = (moduleSlug, action, value) => {
    setForm(f => ({
      ...f,
      permissions: {
        ...f.permissions,
        [moduleSlug]: { ...f.permissions[moduleSlug], [action]: value },
      },
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Role name zaroori hai');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        type: 'employee',
        permissions: form.permissions,
        accessSections: accessSectionsFromPermissions(form.permissions),
      };
      if (editing === 'new') {
        await api.post('/roles', payload);
      } else {
        await api.put(`/roles/${editing._id}`, payload);
      }
      setEditing(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    if (!confirm(`${role.name} delete karna hai?`)) return;
    try {
      await api.delete(`/roles/${role._id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const granted = useMemo(() => countGranted(form.permissions), [form.permissions]);
  const master = selectAllState(form.permissions);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield size={22} style={{ color: NAVY }} /> Employee Roles
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sidebar ke har management group ke liye View / Edit — group click se saare child select
          </p>
        </div>
        {!editing && (
          <button type="button" onClick={openNew} className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold ${listBtnNavy}`}>
            <Plus size={16} /> Add New Role
          </button>
        )}
      </div>

      {editing && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: CARD_BORDER }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
            <h2 className="text-base font-bold text-gray-900">
              {editing === 'new' ? 'Add New Role' : `Edit Role — ${editing.name}`}
            </h2>
            <button type="button" onClick={() => setEditing(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Order Manager"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1a3a8a]/20"
                  style={{ borderColor: CARD_BORDER }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Manage all order related operations"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1a3a8a]/20"
                  style={{ borderColor: CARD_BORDER }}
                />
              </div>
            </div>

            <p className="text-xs text-gray-400">{granted} permission(s) selected</p>

            <div className="overflow-x-auto border rounded-xl" style={{ borderColor: CARD_BORDER }}>
              <table className="w-full text-sm min-w-[780px]">
                <thead>
                  <tr className="bg-[#f5f7fa] text-xs text-gray-500">
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide min-w-[220px]">
                      <span className="inline-flex items-center gap-2">
                        <TriCheckbox
                          state={master}
                          onChange={v => setPerms(applySelectAll(form.permissions, v))}
                          label="Select all"
                        />
                        Select All
                      </span>
                    </th>
                    {ROLE_ACTIONS.map(a => (
                      <th key={a.key} className="px-2 py-3 text-center font-semibold uppercase tracking-wide w-[88px]">
                        <div className="flex flex-col items-center gap-1">
                          <span>{a.label}</span>
                          <TriCheckbox
                            state={allActionState(form.permissions, a.key)}
                            onChange={v => setPerms(applyAllAction(form.permissions, a.key, v))}
                            label={`Select all ${a.label}`}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLE_GROUPS.map(group => (
                    <GroupBlock
                      key={group.slug}
                      group={group}
                      permissions={form.permissions}
                      onGroupAction={(action, value) => setPerms(applyGroupAction(form.permissions, group, action, value))}
                      onGroupAll={value => setPerms(applyGroupAll(form.permissions, group, value))}
                      onCell={setCell}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setEditing(null)}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium ${listBtnOutline}`}>
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}>
                <Save size={14} /> {saving ? 'Saving...' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: CARD_BORDER }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={listTheadClass} style={listTheadStyle}>
                <th className={`${listThClass} w-14`}>SI</th>
                <th className={listThClass}>Role Name</th>
                <th className={listThClass}>Type</th>
                <th className={listThClass}>Description</th>
                <th className={listThClass}>Modules</th>
                <th className={`${listThClass} text-center`}>Permissions</th>
                <th className={`${listThClass} w-28`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-gray-400">Koi role nahi</td>
                </tr>
              ) : roles.map((role, i) => {
                const perms = permissionsFromRole(role);
                const n = countGranted(perms);
                const modules = ROLE_GROUPS.filter(g => g.items.some(item => perms[item.slug]?.view));
                return (
                  <tr key={role._id} className={listRowClass} style={listRowStyle}>
                    <td className={`${listTdClass} text-gray-500 tabular-nums`}>{i + 1}</td>
                    <td className={`${listTdClass} font-semibold text-gray-900`}>{role.name}</td>
                    <td className={listTdClass}>
                      <span className="capitalize text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {(role.type || '').replace(/_/g, ' ') || '—'}
                      </span>
                    </td>
                    <td className={`${listTdClass} text-gray-500 max-w-[220px] truncate`}>
                      {role.description || '—'}
                    </td>
                    <td className={listTdClass}>
                      <div className="flex flex-wrap gap-1">
                        {modules.length === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : modules.map(g => (
                          <span key={g.slug} className="text-[11px] bg-[#eef2f8] text-[#1a3a8a] px-2 py-0.5 rounded">
                            {g.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={`${listTdClass} text-center tabular-nums font-medium`}>{n}</td>
                    <td className={listTdClass}>
                      <div className="flex items-center gap-2">
                        <button type="button" title="Edit" onClick={() => openEdit(role)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg border text-[#1a3a8a] hover:bg-[#f0f4ff]"
                          style={{ borderColor: '#b8c9e8' }}>
                          <Edit size={15} />
                        </button>
                        {role.slug !== 'main_admin' && (
                          <button type="button" title="Delete" onClick={() => handleDelete(role)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border text-red-500 hover:bg-red-50"
                            style={{ borderColor: '#fecaca' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GroupBlock({ group, permissions, onGroupAction, onGroupAll, onCell }) {
  const groupAll = ROLE_ACTIONS.every(a => groupActionState(permissions, group, a.key) === 'on')
    ? 'on'
    : ROLE_ACTIONS.every(a => groupActionState(permissions, group, a.key) === 'off')
      ? 'off'
      : 'mixed';

  return (
    <>
      <tr className="bg-[#eef2f8]">
        <td className="px-4 py-2.5">
          <span className="inline-flex items-center gap-2">
            <TriCheckbox
              state={groupAll}
              onChange={v => onGroupAll(v)}
              label={`${group.label} select all`}
            />
            <span className="text-xs font-bold uppercase tracking-wide text-[#1a3a8a]">{group.label}</span>
          </span>
        </td>
        {ROLE_ACTIONS.map(a => (
          <td key={a.key} className="px-2 py-2.5 text-center">
            <TriCheckbox
              state={groupActionState(permissions, group, a.key)}
              onChange={v => onGroupAction(a.key, v)}
              label={`${group.label} ${a.label}`}
            />
          </td>
        ))}
      </tr>
      {group.items.map(item => {
        const row = permissions[item.slug] || {};
        return (
          <tr key={item.slug} className="bg-white hover:bg-[#f8faff]" style={{ borderTop: `1px solid ${CARD_BORDER}` }}>
            <td className="px-4 py-2.5 pl-10 text-gray-700">{item.label}</td>
            {ROLE_ACTIONS.map(a => (
              <td key={a.key} className="px-2 py-2.5 text-center">
                <label className="inline-flex justify-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!row[a.key]}
                    onChange={e => onCell(item.slug, a.key, e.target.checked)}
                    aria-label={`${item.label} ${a.label}`}
                    className="w-4 h-4 rounded accent-[#1a3a8a] cursor-pointer"
                  />
                </label>
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}
