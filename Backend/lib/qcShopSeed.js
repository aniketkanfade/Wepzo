function isShopActive(product) {
  if (!product) return false;
  if (product.status === false || product.status === 0) return false;
  return typeof product.status !== 'string'
    || !['false', 'inactive', 'rejected', 'denied'].includes(product.status.toLowerCase());
}

function shouldListOnQuickCommerce(product) {
  return isShopActive(product);
}

function applyQuickCommerceFlag(product) {
  if (!product) return product;
  product.quickCommerce = true;
  return product;
}

module.exports = {
  shouldListOnQuickCommerce,
  applyQuickCommerceFlag,
};
