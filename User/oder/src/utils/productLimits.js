export const getTrackedStock = (product) => {
  const rawStock = product.stock ?? product.quantity
  if (rawStock === undefined || rawStock === null || rawStock === '') return null
  const stock = Number(rawStock)
  return Number.isFinite(stock) ? Math.max(0, stock) : null
}

export const getProductQuantityLimit = (product) => {
  const stock = getTrackedStock(product)
  const maxPerOrder = Number(product.maxPerOrder)
  const orderLimit = Number.isFinite(maxPerOrder) && maxPerOrder > 0 ? maxPerOrder : Infinity
  return Math.min(stock ?? Infinity, orderLimit)
}