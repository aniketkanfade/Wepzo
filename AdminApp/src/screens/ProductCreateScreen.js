import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useModule } from '../auth/ModuleContext';
import { api, moduleRequestConfig, resolveAdminModuleSlug } from '../api/client';
import ProductMediaPicker from './ProductMediaPicker';
import { colors } from '../theme';

const PRODUCT_FIELDS = [
  { key: 'name', label: 'Product name', required: true },
  { key: 'shortDesc', label: 'Short description' },
  { key: 'productCode', label: 'Product code' },
  { key: 'sku', label: 'SKU' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'price', label: 'Price', keyboardType: 'decimal-pad', required: true },
  { key: 'discount', label: 'Discount', keyboardType: 'decimal-pad' },
  { key: 'stock', label: 'Stock', keyboardType: 'number-pad' },
  { key: 'lowStockLimit', label: 'Low stock limit', keyboardType: 'number-pad' },
  { key: 'maxPurchaseQty', label: 'Maximum purchase quantity', keyboardType: 'number-pad' },
  { key: 'deliveryMode', label: 'Delivery mode' },
  { key: 'licenceNumber', label: 'Licence number' },
  { key: 'tags', label: 'Tags (comma separated)' },
];

const EMPTY_FORM = {
  name: '',
  shortDesc: '',
  image: '',
  images: [],
  productCode: '',
  sku: '',
  barcode: '',
  price: '',
  discount: '0',
  stock: '0',
  lowStockLimit: '10',
  maxPurchaseQty: '10',
  deliveryMode: 'Home Delivery',
  tags: '',
  storeId: '',
  store: '',
  mainModuleId: '',
  mainCategoryId: '',
  mainCategory: '',
  subCategoryId: '',
  subCategory: '',
  childCategoryId: '',
  childCategory: '',
  brandId: '',
  brand: '',
  unitId: '',
  unit: '',
  status: 'Pending',
  inGallery: true,
  warranty: false,
  guarantee: false,
  exchange: false,
};

export default function ProductCreateScreen({ productId, onCreated }) {
  const { session } = useAuth();
  const { activeModule } = useModule();
  const [form, setForm] = useState(EMPTY_FORM);
  const [options, setOptions] = useState({ categories: [], subCategories: [], childCategories: [], brands: [], units: [], stores: [], modules: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError('');
    const config = (params = {}) => moduleRequestConfig(activeModule, { params }, session?.user);
    try {
      const [categories, subCategories, childCategories, brands, units, stores, modules, existingProduct] = await Promise.all([
        api.get('/categories', config()),
        api.get('/sub-categories', config()),
        api.get('/child-categories', config()),
        api.get('/brands', config()),
        api.get('/units', config()),
        api.get('/stores', config({ filter: 'list' })),
        api.get('/system-modules', config()),
        productId ? api.get(`/product-items/${encodeURIComponent(productId)}`, config()) : Promise.resolve(null),
      ]);
      const nextOptions = {
        categories: categories.data,
        subCategories: subCategories.data,
        childCategories: childCategories.data,
        brands: brands.data,
        units: units.data,
        stores: stores.data,
        modules: modules.data,
      };
      Object.entries(nextOptions).forEach(([key, value]) => {
        if (!Array.isArray(value)) throw new Error(`The server returned an invalid ${key} list.`);
      });
      setOptions(nextOptions);
      if (existingProduct?.data) {
        const item = existingProduct.data;
        setForm({
          ...EMPTY_FORM,
          ...item,
          price: String(item.price ?? ''),
          discount: String(item.discount ?? 0),
          stock: String(item.stock ?? 0),
          lowStockLimit: String(item.lowStockLimit ?? 10),
          maxPurchaseQty: String(item.maxPurchaseQty ?? 10),
          tags: Array.isArray(item.tags) ? item.tags.join(', ') : String(item.tags || ''),
          image: item.image || '',
          images: Array.isArray(item.images) ? item.images : [],
          status: item.status ?? true,
        });
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Product options could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [activeModule, productId, session?.user]);

  useEffect(() => { loadOptions(); }, [loadOptions]);

  const categories = options.categories.filter(item => !form.mainModuleId || String(item.moduleId) === String(form.mainModuleId));
  const subCategories = options.subCategories.filter(item => (
    !form.mainCategoryId
    || String(item.categoryId) === String(form.mainCategoryId)
    || String(item.categoryId) === String(categories.find(category => category._id === form.mainCategoryId)?.categoryId)
  ));
  const childCategories = options.childCategories.filter(item => (
    !form.subCategoryId
    || String(item.subCategoryId) === String(form.subCategoryId)
    || String(item.subCategoryId) === String(subCategories.find(subCategory => subCategory._id === form.subCategoryId)?.subCategoryId)
  ));

  const setChoice = (key, item) => {
    if (key === 'store') setForm(current => ({ ...current, storeId: item.storeId || item._id, store: item.name }));
    if (key === 'module') setForm(current => ({
      ...current,
      mainModuleId: item._id,
      mainCategoryId: '',
      mainCategory: '',
      subCategoryId: '',
      subCategory: '',
      childCategoryId: '',
      childCategory: '',
    }));
    if (key === 'category') setForm(current => ({
      ...current,
      mainModuleId: item.moduleId || '',
      mainCategoryId: item._id,
      mainCategory: item.name,
      subCategoryId: '',
      subCategory: '',
      childCategoryId: '',
      childCategory: '',
    }));
    if (key === 'subCategory') setForm(current => ({
      ...current,
      subCategoryId: item._id,
      subCategory: item.name,
      childCategoryId: '',
      childCategory: '',
    }));
    if (key === 'childCategory') setForm(current => ({ ...current, childCategoryId: item._id, childCategory: item.name }));
    if (key === 'brand') setForm(current => ({ ...current, brandId: item._id, brand: item.name }));
    if (key === 'unit') setForm(current => ({ ...current, unitId: item._id, unit: item.name }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.price || !form.mainModuleId || !form.mainCategoryId || !form.subCategoryId || !form.childCategoryId) {
      setError('Name, price, main module, category, subcategory, and child category are required.');
      return;
    }
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < 0) {
      setError('Price and stock must be valid non-negative numbers.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const selectedStore = options.stores.find(item => String(item.storeId || item._id) === String(form.storeId));
      const selectedBrand = options.brands.find(item => String(item._id) === String(form.brandId));
      const selectedUnit = options.units.find(item => String(item._id) === String(form.unitId));
      const payload = {
        ...form,
        name: form.name.trim(),
        shortDesc: form.shortDesc.trim(),
        image: form.image,
        images: form.images,
        moduleId: form.mainModuleId,
        systemModuleId: form.mainModuleId,
        storeId: selectedStore?.storeId,
        store: selectedStore?.name || form.store,
        mainCategory: categories.find(item => String(item._id) === String(form.mainCategoryId))?.name || form.mainCategory,
        subCategory: subCategories.find(item => String(item._id) === String(form.subCategoryId))?.name || form.subCategory,
        childCategory: childCategories.find(item => String(item._id) === String(form.childCategoryId))?.name || form.childCategory,
        brand: selectedBrand?.name || '',
        unit: selectedUnit?.name || '',
        price,
        discount: Number(form.discount) || 0,
        stock,
        lowStockLimit: Number(form.lowStockLimit) || 0,
        maxPurchaseQty: Number(form.maxPurchaseQty) || 1,
        tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        quickCommerce: resolveAdminModuleSlug(activeModule) === 'quick-commerce',
        status: form.status,
      };
      if (productId) {
        await api.put(`/product-items/${encodeURIComponent(productId)}`, payload, moduleRequestConfig(activeModule, {}, session?.user));
      } else {
        await api.post('/product-items', payload, moduleRequestConfig(activeModule, {}, session?.user));
      }
      setForm(EMPTY_FORM);
      onCreated?.();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Product could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>PRODUCT SETUP</Text>
        <Text style={styles.title}>{productId ? 'Edit Product' : 'Add New Product'}</Text>
        <Text style={styles.subtitle}>Product data is saved to {activeModule?.name || 'the active workspace'}.</Text>
      </View>
      {loading ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Product information</Text>
            {PRODUCT_FIELDS.map(field => (
              <View key={field.key} style={styles.fieldBlock}>
                <Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text>
                <TextInput
                  value={String(form[field.key] ?? '')}
                  onChangeText={value => setForm(current => ({ ...current, [field.key]: value }))}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  placeholderTextColor={colors.muted}
                  keyboardType={field.keyboardType || 'default'}
                  style={styles.input}
                  editable={!saving}
                />
              </View>
            ))}
          </View>

          <ProductMediaPicker
            image={form.image}
            images={form.images}
            disabled={saving}
            onChange={patch => setForm(current => ({ ...current, ...patch }))}
          />

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Store and category</Text>
            <ChoiceField label="Store *" options={options.stores} selectedId={form.storeId} onSelect={item => setChoice('store', item)} />
            <ChoiceField label="Main module *" options={options.modules} selectedId={form.mainModuleId} onSelect={item => setChoice('module', item)} />
            <ChoiceField label="Category *" options={categories} selectedId={form.mainCategoryId} onSelect={item => setChoice('category', item)} />
            <ChoiceField label="Subcategory *" options={subCategories} selectedId={form.subCategoryId} onSelect={item => setChoice('subCategory', item)} />
            <ChoiceField label="Child category *" options={childCategories} selectedId={form.childCategoryId} onSelect={item => setChoice('childCategory', item)} />
            <ChoiceField label="Brand" options={options.brands} selectedId={form.brandId} onSelect={item => setChoice('brand', item)} />
            <ChoiceField label="Unit" options={options.units} selectedId={form.unitId} onSelect={item => setChoice('unit', item)} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Product options</Text>
            {[
              ['warranty', 'Warranty'],
              ['guarantee', 'Guarantee'],
              ['exchange', 'Exchange allowed'],
              ['inGallery', 'Show in product gallery'],
            ].map(([key, label]) => (
              <View key={key} style={styles.switchRow}>
                <Text style={styles.label}>{label}</Text>
                <Switch
                  value={!!form[key]}
                  onValueChange={value => setForm(current => ({ ...current, [key]: value }))}
                  disabled={saving}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            ))}
          </View>

          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={save} style={[styles.saveButton, saving && styles.disabled]}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{productId ? 'Save product changes' : 'Save product'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function ChoiceField({ label, options, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(item => String(item._id || item.storeId) === String(selectedId));
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => setOpen(value => !value)} style={styles.choice}>
        <Text style={selected ? styles.choiceText : styles.choicePlaceholder}>{selected?.name || `Select ${label.replace(' *', '').toLowerCase()}`}</Text>
        <Text style={styles.chevron}>{open ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>
      {open ? (
        <View style={styles.choiceList}>
          <ScrollView nestedScrollEnabled style={styles.choiceScroll}>
            {options.map(item => (
              <TouchableOpacity key={item._id || item.storeId} onPress={() => { onSelect(item); setOpen(false); }} style={styles.option}>
                <Text style={styles.optionText}>{item.name || item.storeName}</Text>
              </TouchableOpacity>
            ))}
            {!options.length ? <Text style={styles.noOptions}>No options available.</Text> : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  titleBlock: { paddingHorizontal: 19, paddingTop: 15, paddingBottom: 8 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { marginTop: 4, color: colors.text, fontSize: 23, fontWeight: '800' },
  subtitle: { marginTop: 4, color: colors.muted, fontSize: 12 },
  content: { paddingHorizontal: 15, paddingTop: 5, paddingBottom: 30 },
  card: { marginBottom: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  fieldBlock: { marginTop: 12 },
  label: { marginBottom: 6, color: colors.text, fontSize: 12, fontWeight: '700' },
  switchRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border },
  input: { minHeight: 43, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 9, color: colors.text, fontSize: 13, backgroundColor: '#fff' },
  choice: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: '#fff' },
  choiceText: { color: colors.text, fontSize: 13 },
  choicePlaceholder: { color: colors.muted, fontSize: 13 },
  chevron: { color: colors.muted, fontSize: 18 },
  choiceList: { marginTop: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: '#fff' },
  choiceScroll: { maxHeight: 160 },
  option: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionText: { color: colors.text, fontSize: 13 },
  noOptions: { padding: 11, color: colors.muted, fontSize: 12 },
  error: { marginBottom: 10, color: colors.danger, fontSize: 12, lineHeight: 17 },
  saveButton: { minHeight: 47, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primary },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.65 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
