import { ReceiptText } from 'lucide-react';
import SimpleNamePage from '../components/SimpleNamePage';

export default function UnitsPage() {
  return (
    <SimpleNamePage
      title="Unit"
      plural="Units"
      apiPath="/units"
      idKey="unitId"
      icon={ReceiptText}
      iconColor="text-purple-600"
      iconBg="bg-purple-50"
      breadcrumb="Units"
      placeholder="Ex : kg"
      searchPlaceholder="Search units..."
      formDescription="Create a new unit for your products."
    />
  );
}
