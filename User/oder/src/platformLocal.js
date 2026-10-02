const ACCOUNTS_KEY = 'morrow-local-store-accounts'

async function passwordHash(password, salt) {
  if (!globalThis.crypto?.subtle) throw new Error('Secure password storage is unavailable in this browser.')
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function readAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]')
    return Array.isArray(accounts) ? accounts : []
  } catch { return [] }
}

function toOwner(account) {
  return { id: account.id, storeId: account.id, storeName: account.storeName, subdomain: account.subdomain, name: account.ownerName, email: account.email, selectedPlan: account.selectedPlan || null, permissions: { storeAdmin: true, products: true, orders: true, payments: true, delivery: true, storefront: true, customers: true, riders: true, ...(account.permissions || {}) }, status: account.status || 'active' }
}

export async function registerLocalStore({ storeName, ownerName, email, password, selectedPlan }) {
  const normalizedEmail = email.trim().toLowerCase()
  const accounts = readAccounts()
  if (accounts.some((account) => account.email === normalizedEmail)) throw new Error('An account with this email already exists. Log in instead.')
  const salt = crypto.randomUUID()
  const slug = storeName.trim().toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-store'
  let subdomain = slug
  while (accounts.some((item) => item.subdomain === subdomain)) subdomain = `${slug}-${Math.random().toString(36).slice(2, 5)}`
  const account = {
    id: crypto.randomUUID(), storeName: storeName.trim(), ownerName: ownerName.trim(), email: normalizedEmail,
    subdomain, salt, passwordHash: await passwordHash(password, salt), createdAt: new Date().toISOString(), status: 'active',
    permissions: { storeAdmin: true, products: true, orders: true, payments: true, delivery: true, storefront: true, customers: true, riders: true },
    selectedPlan: selectedPlan || null,
  }
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]))
  return toOwner(account)
}

export async function loginLocalStore(email, password) {
  const normalizedEmail = email.trim().toLowerCase()
  const account = readAccounts().find((item) => item.email === normalizedEmail)
  if (!account || await passwordHash(password, account.salt) !== account.passwordHash) throw new Error('Email or password is incorrect.')
  if (account.status === 'disabled' || account.permissions?.storeAdmin === false) throw new Error('This store admin account is disabled. Contact the platform admin.')
  return toOwner(account)
}

export function restoreLocalStore(owner) {
  if (!owner?.storeId) return null
  const account = readAccounts().find((item) => item.id === owner.storeId)
  return account && account.status !== 'disabled' && account.permissions?.storeAdmin !== false ? toOwner(account) : null
}

export function findLocalStoreBySlug(slug) {
  const account = readAccounts().find((item) => item.subdomain === slug)
  return account ? toOwner(account) : null
}

export function listLocalStores() {
  return readAccounts().map((account) => ({ ...toOwner(account), createdAt: account.createdAt || null }))
}

export function updateLocalStore(storeId, changes) {
  const accounts = readAccounts()
  const index = accounts.findIndex((account) => account.id === storeId)
  if (index < 0) throw new Error('Store account not found.')
  const nextName = String(changes.storeName ?? accounts[index].storeName).trim()
  const nextOwner = String(changes.ownerName ?? accounts[index].ownerName).trim()
  const nextEmail = String(changes.email ?? accounts[index].email).trim().toLowerCase()
  const nextSlug = String(changes.subdomain ?? accounts[index].subdomain).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '')
  if (!nextName || !nextOwner || !nextEmail || !nextSlug) throw new Error('Store name, owner, email and URL are required.')
  if (accounts.some((account) => account.id !== storeId && (account.email === nextEmail || account.subdomain === nextSlug))) throw new Error('Another store already uses that email or URL.')
  accounts[index] = { ...accounts[index], ...changes, storeName: nextName, ownerName: nextOwner, email: nextEmail, subdomain: nextSlug }
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  return toOwner(accounts[index])
}

export function deleteLocalStore(storeId) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(readAccounts().filter((account) => account.id !== storeId)))
  const prefix = `morrow-store-${storeId}-`
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(prefix)) localStorage.removeItem(key)
  }
}
