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
  Scheduled: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  Accepted: 'bg-blue-50 text-blue-700 border border-blue-200',
  Processing: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  Handover: 'bg-violet-50 text-violet-700 border border-violet-200',
  'Out for Delivery': 'bg-orange-50 text-orange-700 border border-orange-200',
  Delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Cancelled: 'bg-rose-50 text-rose-700 border border-rose-200',
  'Returns/Refunds': 'bg-purple-50 text-purple-700 border border-purple-200',
  Failed: 'bg-red-50 text-red-700 border border-red-200',
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
