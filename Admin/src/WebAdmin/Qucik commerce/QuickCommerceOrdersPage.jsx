import OrdersPage from './StoreSingleOrdersPage';

// Quick Commerce orders stay in the shared Admin app and use its authenticated API.
export default function QuickCommerceOrdersPage() {
  return <OrdersPage source="quick_commerce" />;
}
