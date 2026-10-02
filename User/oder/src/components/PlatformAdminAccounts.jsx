export default function PlatformAdminAccounts({ stores = [], mainAdmin, searchTerm = '', onManageStore }) {
  const rows = [
    {
      id: 'platform-admin',
      name: mainAdmin?.name || 'Main Admin',
      email: mainAdmin?.email || 'Platform account',
      store: 'Platform',
      subdomain: '',
      status: 'Active',
      role: 'Main Admin',
    },
    ...stores.map((store) => ({
      id: store.storeId,
      name: store.name || store.storeName || 'Store Admin',
      email: store.email || '—',
      store: store.storeName || 'Store',
      subdomain: store.subdomain || '',
      status: store.status === 'disabled' || store.permissions?.storeAdmin === false ? 'Disabled' : 'Active',
      role: 'Store Admin',
    })),
  ]
  const query = searchTerm.trim().toLowerCase()
  const filteredRows = query
    ? rows.filter((row) => `${row.name} ${row.email} ${row.store} ${row.subdomain} ${row.role} ${row.status}`.toLowerCase().includes(query))
    : rows

  return <section className="platform-stores">
    <div className="admin-section-heading"><div><h2>All admin accounts</h2><p>Main admin and every store admin registered on this platform.</p></div><span>{rows.length} admins</span></div>
    {!filteredRows.length ? <div className="admin-empty"><h2>No matching admins</h2><p>Try another name, email or store.</p></div> : <div className="platform-dashboard-table-wrap"><table className="platform-dashboard-table"><thead><tr><th>Admin</th><th>Email</th><th>Role</th><th>Store</th><th>Status</th><th>Action</th></tr></thead><tbody>{filteredRows.map((row) => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.email}</td><td>{row.role}</td><td>{row.subdomain ? <>{row.store}<small>/{row.subdomain}</small></> : row.store}</td><td>{row.status}</td><td>{row.role === 'Store Admin' ? <button type="button" className="admin-cancel" onClick={() => onManageStore?.(row.id)}>Manage</button> : <span>Current account</span>}</td></tr>)}</tbody></table></div>}
  </section>
}
