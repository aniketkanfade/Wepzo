export const STATUSES_REQUIRING_RIDER = [
  'Out for Delivery',
  'Delivered',
];

export const STATUSES_ALLOWING_ASSIGN = [
  'Accepted',
  'Processing',
  'Handover',
];

export const ORDER_STATUS_OPTIONS = [
  'Pending',
  'Accepted',
  'Processing',
  'Handover',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

export const ORDER_STATUS_ROUTES = {
  Pending: '/orders/pending',
  Accepted: '/orders/accepted',
  Processing: '/orders/processing',
  Handover: '/orders/handover',
  'Out for Delivery': '/orders/out-for-delivery',
  Delivered: '/orders/delivered',
  Cancelled: '/orders/cancelled',
};

export const ORDER_STATUS_SLUGS = {
  scheduled: 'Scheduled',
  pending: 'Pending',
  accepted: 'Accepted',
  processing: 'Processing',
  handover: 'Handover',
  'out-for-delivery': 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  'returns-refunds': 'Returns/Refunds',
  failed: 'Failed',
};

export const ORDER_STATUS_STYLE = {
  Scheduled: 'bg-cyan-100 text-cyan-700',
  Pending: 'bg-slate-100 text-slate-600',
  Accepted: 'bg-indigo-100 text-indigo-700',
  Processing: 'bg-blue-100 text-blue-700',
  Handover: 'bg-violet-100 text-violet-700',
  'Out for Delivery': 'bg-orange-100 text-orange-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-pink-100 text-pink-700',
  'Returns/Refunds': 'bg-orange-100 text-orange-700',
  Failed: 'bg-red-100 text-red-700',
};

export const ORDER_MENU = [
  { label: 'All Orders', path: '/orders' },
  { label: 'Scheduled', path: '/orders/scheduled' },
  { label: 'Pending', path: '/orders/pending' },
  { label: 'Accepted', path: '/orders/accepted' },
  { label: 'Processing', path: '/orders/processing' },
  { label: 'Handover', path: '/orders/handover' },
  { label: 'Out for Delivery', path: '/orders/out-for-delivery' },
  { label: 'Delivered', path: '/orders/delivered' },
  { label: 'Cancelled', path: '/orders/cancelled' },
  { label: 'Returns/Refunds', path: '/orders/returns-refunds' },
  { label: 'Failed', path: '/orders/failed' },
];
