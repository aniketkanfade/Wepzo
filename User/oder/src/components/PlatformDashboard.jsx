import { useMemo, useState } from 'react'
import { formatINR } from '../data/store.js'

const localDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
const isoDay = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const orderDate = (order) => localDate(order.createdAt || order.date || order.placedAt)

export default function PlatformDashboard({ stores = [], mainOrders = [], mainProducts = [] }) {
  const today = new Date()
  const [period, setPeriod] = useState('day')
  const [dateValue, setDateValue] = useState(isoDay(today))
  const [storeFilter, setStoreFilter] = useState('all')
  const date = useMemo(() => localDate(`${dateValue}${period === 'day' ? 'T12:00:00' : period === 'month' ? '-01T12:00:00' : '-01-01T12:00:00'}`) || today, [dateValue, period])
  const allStores = [{ storeId: 'main', storeName: 'Main store', products: mainProducts, orders: mainOrders, subdomain: '' }, ...stores]
  const scopedStores = storeFilter === 'all' ? allStores : allStores.filter((store) => store.storeId === storeFilter)
  const matchesPeriod = (order) => {
    const placed = orderDate(order)
    if (!placed) return false
    if (period === 'day') return isoDay(placed) === isoDay(date)
    if (period === 'month') return placed.getFullYear() === date.getFullYear() && placed.getMonth() === date.getMonth()
    return placed.getFullYear() === date.getFullYear()
  }
  const rows = scopedStores.map((store) => {
    const orders = (store.orders || []).filter(matchesPeriod)
    return { ...store, ordersCount: orders.length, sales: orders.reduce((total, order) => total + Number(order.total || 0), 0) }
  })
  const sales = rows.reduce((total, store) => total + store.sales, 0)
  const orderCount = rows.reduce((total, store) => total + store.ordersCount, 0)
  const productCount = rows.reduce((total, store) => total + (store.products || []).length, 0)
  const periodLabel = period === 'day' ? 'day' : period === 'month' ? 'month' : 'year'
  const setPeriodValue = (nextPeriod) => {
    setPeriod(nextPeriod)
    const now = new Date()
    setDateValue(nextPeriod === 'day' ? isoDay(now) : nextPeriod === 'month' ? isoDay(now).slice(0, 7) : String(now.getFullYear()))
  }
  return <section className="platform-dashboard">
    <div className="admin-section-heading"><div><h2>Platform overview</h2><p>Sales and store activity across the platform.</p></div><span>{allStores.length} stores</span></div>
    <div className="platform-dashboard-filters"><label>Period<select value={period} onChange={(event) => setPeriodValue(event.target.value)}><option value="day">Day</option><option value="month">Month</option><option value="year">Year</option></select></label><label>{period === 'day' ? 'Date' : period === 'month' ? 'Month' : 'Year'}<input type={period === 'day' ? 'date' : period === 'month' ? 'month' : 'number'} min={period === 'year' ? '2000' : undefined} max={period === 'year' ? '2100' : undefined} value={dateValue} onChange={(event) => setDateValue(event.target.value)}/></label><label>Store<select value={storeFilter} onChange={(event) => setStoreFilter(event.target.value)}><option value="all">All stores</option>{allStores.map((store) => <option key={store.storeId} value={store.storeId}>{store.storeName}</option>)}</select></label></div>
    <div className="admin-metrics platform-dashboard-metrics"><article><span>Sales · {periodLabel}</span><strong>{formatINR(sales)}</strong><small>From {orderCount} placed order{orderCount === 1 ? '' : 's'}</small></article><article><span>Stores</span><strong>{storeFilter === 'all' ? allStores.length : 1}</strong><small>{stores.length} vendor store{stores.length === 1 ? '' : 's'} plus main store</small></article><article><span>Products</span><strong>{productCount}</strong><small>Across selected store{storeFilter === 'all' ? 's' : ''}</small></article></div>
    <div className="platform-dashboard-table-wrap"><table className="platform-dashboard-table"><thead><tr><th>Store</th><th>Products</th><th>Orders · {periodLabel}</th><th>Sales · {periodLabel}</th><th>Storefront</th></tr></thead><tbody>{rows.map((store) => <tr key={store.storeId}><td><strong>{store.storeName}</strong><small>{store.subdomain ? `/${store.subdomain}` : 'Main storefront'}</small></td><td>{store.products?.length || 0}</td><td>{store.ordersCount}</td><td>{formatINR(store.sales)}</td><td><a href={store.subdomain ? `/${store.subdomain}` : '/'} target="_blank" rel="noreferrer">View store ↗</a></td></tr>)}</tbody></table>{!rows.length && <p className="admin-intro">No stores found for this filter.</p>}</div>
    <p className="platform-dashboard-note">Sales use order totals recorded when an order is placed. These records are stored in this browser.</p>
  </section>
}
