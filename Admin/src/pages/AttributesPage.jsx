import { Grid3X3 } from 'lucide-react';
import SimpleNamePage from '../components/SimpleNamePage';

export default function AttributesPage() {
  return (
    <SimpleNamePage
      title="Attribute"
      plural="Attributes"
      apiPath="/attributes"
      idKey="attributeId"
      icon={Grid3X3}
      iconColor="text-blue-600"
      iconBg="bg-blue-50"
      breadcrumb="Attributes"
      placeholder="Ex : new attribute"
      searchPlaceholder="Search attributes..."
      formDescription="Create a new attribute for your products."
    />
  );
}
