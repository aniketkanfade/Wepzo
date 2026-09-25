export const EMPTY_EMPLOYEE = {
  name: '', email: '', phone: '', roleId: '', storeId: '',
  status: 'active', password: '', loginEnabled: true,
};

export const inputCls = 'w-full px-3 py-2.5 border rounded-lg text-sm outline-none';

export function formatWhen(iso) {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return String(iso);
  return new Date(t).toLocaleString('en-IN');
}

export function employeePayload(form, roles, stores) {
  const role = roles.find(r => r._id === form.roleId);
  const st = stores.find(s => String(s.storeId) === String(form.storeId));
  const payload = {
    name: form.name,
    email: form.email,
    phone: form.phone,
    roleId: form.roleId,
    roleSlug: role?.slug,
    roleName: role?.name,
    storeId: form.storeId || null,
    storeName: st?.name || 'All Stores',
    status: form.status,
    loginEnabled: form.loginEnabled !== false,
  };
  if (form.password?.trim()) payload.password = form.password.trim();
  return payload;
}

export function EmployeeFormFields({ form, set, roles, stores, passwordOptional }) {
  return (
    <div className="space-y-3">
      {[
        ['name', 'Name', 'text'],
        ['email', 'Email', 'email'],
        ['phone', 'Phone', 'text'],
      ].map(([k, label, type]) => (
        <div key={k}>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
          <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} className={inputCls} />
        </div>
      ))}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Password {passwordOptional ? '(blank = no change)' : '(default emp123)'}
        </label>
        <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
          placeholder={passwordOptional ? 'Leave blank to keep current' : 'emp123'} className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Role</label>
        <select value={form.roleId} onChange={e => set('roleId', e.target.value)} className={inputCls}>
          <option value="">Select role</option>
          {roles.filter(r => r.slug !== 'main_admin').map(r => (
            <option key={r._id} value={r._id}>{r.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Store Access</label>
        <select value={form.storeId} onChange={e => set('storeId', e.target.value)} className={inputCls}>
          <option value="">All Stores</option>
          {stores.map(s => (
            <option key={s.storeId} value={s.storeId}>{s.name} (#{s.storeId})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
        <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={form.loginEnabled !== false}
          onChange={e => set('loginEnabled', e.target.checked)} className="accent-[#1a3a8a]" />
        Employee login enabled
      </label>
    </div>
  );
}
