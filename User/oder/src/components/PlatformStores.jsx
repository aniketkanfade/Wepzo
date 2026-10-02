import { useEffect, useMemo, useState } from 'react'
import { formatINR } from '../data/store.js'

const permissions = [
  ['storeAdmin', 'Store admin login'], ['products', 'Manage products'], ['orders', 'View orders'],
  ['payments', 'Manage payment setup'], ['delivery', 'Manage delivery partners'], ['storefront', 'Edit storefront'], ['customers', 'Customer checkout'], ['riders', 'Rider access'],
]

export default function PlatformStores({ stores, subscriptionPlans = [], searchTerm = '', searchStoreId = '', onUpdateStore, onDeleteStore, onSaveProducts, onSaveCategories }) {
  const [selectedId, setSelectedId] = useState(stores[0]?.storeId || '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const store = stores.find((item) => item.storeId === selectedId)
  const filteredStores = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return stores
    return stores.filter((item) => `${item.storeName} ${item.name} ${item.email} ${item.subdomain} ${(item.products || []).map((product) => `${product.name} ${product.category}`).join(' ')} ${(item.categories || []).join(' ')}`.toLowerCase().includes(query))
  }, [stores, searchTerm])

  useEffect(() => {
    if (!stores.some((item) => item.storeId === selectedId)) setSelectedId(stores[0]?.storeId || '')
  }, [stores, selectedId])
  useEffect(() => {
    if (searchStoreId && stores.some((item) => item.storeId === searchStoreId)) setSelectedId(searchStoreId)
  }, [searchStoreId, stores])
  useEffect(() => {
    setDraft(store ? { storeName: store.storeName, ownerName: store.name, email: store.email, subdomain: store.subdomain, status: store.status, permissions: { ...store.permissions }, subscription: { ...store.subscription } } : null)
    setEditing(false)
  }, [selectedId])

  const updateDraft = (changes) => setDraft((previous) => ({ ...previous, ...changes }))
  const saveStore = (event) => {
    event.preventDefault()
    setError('')
    try {
      onUpdateStore(selectedId, draft)
      setEditing(false)
      setMessage('Store account saved.')
      window.setTimeout(() => setMessage(''), 2500)
    } catch (saveError) { setError(saveError.message) }
  }
  const updateProduct = (productId, changes) => onSaveProducts(selectedId, store.products.map((item) => item.id === productId ? { ...item, ...changes } : item))
  const deleteProduct = (productId) => onSaveProducts(selectedId, store.products.filter((item) => item.id !== productId))
  const addCategory = () => {
    const value = window.prompt('New category name')?.trim()
    if (value && !store.categories.some((item) => item.toLowerCase() === value.toLowerCase())) onSaveCategories(selectedId, [...store.categories, value])
  }
  const renameCategory = (oldName) => {
    const value = window.prompt('Rename category', oldName)?.trim()
    if (!value || store.categories.some((item) => item !== oldName && item.toLowerCase() === value.toLowerCase())) return
    onSaveCategories(selectedId, store.categories.map((item) => item === oldName ? value : item))
    onSaveProducts(selectedId, store.products.map((product) => product.category === oldName ? { ...product, category: value } : product))
  }
  const removeCategory = (name) => {
    if (!window.confirm(`Delete "${name}" and remove it from its products?`)) return
    onSaveCategories(selectedId, store.categories.filter((item) => item !== name))
    onSaveProducts(selectedId, store.products.map((product) => product.category === name ? { ...product, category: '' } : product))
  }

  return <section className="platform-stores"><div className="admin-section-heading"><div><h2>Store accounts</h2><p>Manage store profiles, catalog, access and integrations.</p></div><span>{stores.length} stores</span></div>
    {!stores.length ? <div className="admin-empty"><span>□</span><h2>No stores registered</h2><p>New vendor signups will appear here.</p></div> : !filteredStores.length ? <div className="admin-empty"><span>⌕</span><h2>No matching stores</h2><p>Try another admin search.</p></div> : <div className="platform-store-layout"><nav className="platform-store-list" aria-label="Store accounts">{filteredStores.map((item) => <button key={item.storeId} className={selectedId === item.storeId ? 'active' : ''} onClick={() => setSelectedId(item.storeId)}><strong>{item.storeName}</strong><small>{item.name} · /{item.subdomain}</small><span>{item.products.length} products · {item.categories.length} categories</span></button>)}</nav>
      {store && draft && <div className="platform-store-detail"><div className="admin-section-heading"><div><h2>{store.storeName}</h2><p>Created {store.createdAt ? new Date(store.createdAt).toLocaleDateString('en-IN') : 'date unavailable'} · {store.status}</p></div><div className="platform-store-actions"><button type="button" className="admin-cancel" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit store'}</button><button type="button" className="platform-delete-button" onClick={() => { if (window.confirm(`Delete ${store.storeName} and all its local store data?`)) onDeleteStore(store.storeId) }}>Delete store</button></div></div>
        {editing ? <form className="admin-payment-form platform-store-edit" onSubmit={saveStore}><div className="admin-form-grid"><label>Store name<input value={draft.storeName} onChange={(event) => updateDraft({ storeName: event.target.value })}/></label><label>Owner name<input value={draft.ownerName} onChange={(event) => updateDraft({ ownerName: event.target.value })}/></label><label>Owner email<input type="email" value={draft.email} onChange={(event) => updateDraft({ email: event.target.value })}/></label><label>Store URL slug<input value={draft.subdomain} onChange={(event) => updateDraft({ subdomain: event.target.value })}/></label><label>Store status<select value={draft.status} onChange={(event) => updateDraft({ status: event.target.value })}><option value="active">Active</option><option value="disabled">Disabled</option></select></label><label>Selected subscription plan<select value={draft.subscription?.planId || ''} onChange={(event) => updateDraft({ subscription: { ...draft.subscription, planId: event.target.value } })}><option value="">No paid plan</option>{subscriptionPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.label} · {formatINR(plan.price)}</option>)}</select></label><label>Plan expiry<input type="date" value={draft.subscription?.expiresAt ? new Date(draft.subscription.expiresAt).toISOString().slice(0, 10) : ''} onChange={(event) => updateDraft({ subscription: { ...draft.subscription, status: event.target.value ? 'active' : 'free', expiresAt: event.target.value ? new Date(`${event.target.value}T23:59:59`).toISOString() : null } })}/></label></div><fieldset className="platform-permissions"><legend>Store and customer access</legend>{permissions.map(([key, label]) => <label key={key}><input type="checkbox" checked={draft.permissions[key] !== false} onChange={(event) => updateDraft({ permissions: { ...draft.permissions, [key]: event.target.checked } })}/>{label}</label>)}</fieldset>{error && <p className="admin-upload-error" role="alert">{error}</p>}<button type="submit" className="checkout-primary">Save store details</button></form> : <div className="platform-store-stats"><article><span>Subscription</span><strong>{store.subscription?.expiresAt ? `${store.subscription.planId || 'Paid plan'} · ${new Date(store.subscription.expiresAt).toLocaleDateString('en-IN')}` : store.selectedPlan ? `${store.selectedPlan.label} selected · free preview` : 'Free setup'}</strong></article><article><span>Products</span><strong>{store.products.length}</strong></article><article><span>Categories</span><strong>{store.categories.length}</strong></article><article><span>Payment gateway</span><strong>{store.paymentGateway}</strong></article><article><span>Checkout payments</span><strong>{store.paymentMethods.join(', ') || 'None'}</strong></article><article><span>Delivery partners</span><strong>{store.deliveryPartners.join(', ') || 'None'}</strong></article></div>}
        {message && <div className="admin-saved-message">{message}</div>}
        <div className="platform-data-section"><div className="admin-section-heading"><div><h3>Products</h3><p>Edit name, category and price, or remove an item.</p></div></div>{store.products.length ? <div className="platform-product-list">{store.products.map((product) => <article key={product.id}><input aria-label="Product name" value={product.name} onChange={(event) => updateProduct(product.id, { name: event.target.value })}/><input aria-label="Product category" value={product.category} onChange={(event) => updateProduct(product.id, { category: event.target.value })}/><label className="platform-product-price">₹<input aria-label="Product price" type="number" min="0" value={product.price} onChange={(event) => updateProduct(product.id, { price: Number(event.target.value) })}/></label><button type="button" className="delete-product" aria-label={`Delete ${product.name}`} onClick={() => { if (window.confirm(`Delete ${product.name}?`)) deleteProduct(product.id) }}>×</button></article>)}</div> : <p className="admin-intro">This store has not added products yet.</p>}</div>
        <div className="platform-data-section"><div className="admin-section-heading"><div><h3>Categories</h3><p>Edit or delete the categories shown on the storefront.</p></div><button type="button" className="admin-cancel" onClick={addCategory}>Add category</button></div><div className="platform-category-list">{store.categories.map((name) => <article key={name}><span>{name}</span><button type="button" onClick={() => renameCategory(name)}>Edit</button><button type="button" className="delete-product" onClick={() => removeCategory(name)}>×</button></article>)}{!store.categories.length && <p className="admin-intro">No categories added.</p>}</div></div>
      </div>}</div>}
  </section>
}
