import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
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
import { api, moduleMediaUrl, moduleRequestConfig } from '../api/client';
import ImageUploadField from './ImageUploadField';
import { colors } from '../theme';

const CATALOG_CONFIG = {
  categories: {
    title: 'All Categories',
    endpoint: '/categories',
    fields: [
      { key: 'name', label: 'Category name', required: true },
      { key: 'moduleId', label: 'Main module', options: 'systemModules', required: true },
      { key: 'priority', label: 'Priority', options: ['Normal', 'High', 'Low'] },
      { key: 'status', label: 'Active', type: 'switch', defaultValue: true },
      { key: 'featured', label: 'Featured', type: 'switch', defaultValue: false },
    ],
  },
  'sub-categories': {
    title: 'Sub Categories',
    endpoint: '/sub-categories',
    fields: [
      { key: 'name', label: 'Subcategory name', required: true },
      { key: 'categoryId', label: 'Category', options: 'categories', required: true },
      { key: 'status', label: 'Active', type: 'switch', defaultValue: true },
      { key: 'featured', label: 'Featured', type: 'switch', defaultValue: false },
    ],
  },
  'child-categories': {
    title: 'Child Categories',
    endpoint: '/child-categories',
    fields: [
      { key: 'name', label: 'Child category name', required: true },
      { key: 'subCategoryId', label: 'Subcategory', options: 'subCategories', required: true },
      { key: 'status', label: 'Active', type: 'switch', defaultValue: true },
      { key: 'featured', label: 'Featured', type: 'switch', defaultValue: false },
    ],
  },
  brands: {
    title: 'Brands',
    endpoint: '/brands',
    fields: [
      { key: 'name', label: 'Brand name', required: true },
      { key: 'image', label: 'Brand image', type: 'image' },
    ],
  },
  attributes: {
    title: 'Attributes',
    endpoint: '/attributes',
    fields: [{ key: 'name', label: 'Attribute name', required: true }],
  },
  units: {
    title: 'Units',
    endpoint: '/units',
    fields: [{ key: 'name', label: 'Unit name', required: true }],
  },
};

function defaultForm(config) {
  return Object.fromEntries(config.fields.map(field => [
    field.key,
    field.defaultValue ?? (field.type === 'switch' ? false : ''),
  ]));
}

function choiceId(item) {
  return item?._id || item?.id || '';
}

function choiceName(item) {
  return item?.name || item?.slug || choiceId(item);
}

export default function CatalogScreen({ resource }) {
  const config = CATALOG_CONFIG[resource];
  const { session } = useAuth();
  const { activeModule } = useModule();
  const [items, setItems] = useState([]);
  const [choices, setChoices] = useState({ systemModules: [], categories: [], subCategories: [] });
  const [form, setForm] = useState(() => defaultForm(config));
  const [editingId, setEditingId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const requests = [
        api.get(config.endpoint, moduleRequestConfig(activeModule, {}, session?.user)),
      ];
      if (resource === 'categories') requests.push(api.get('/system-modules', moduleRequestConfig(activeModule, {}, session?.user)));
      if (resource === 'sub-categories') requests.push(api.get('/categories', moduleRequestConfig(activeModule, {}, session?.user)));
      if (resource === 'child-categories') requests.push(api.get('/sub-categories', moduleRequestConfig(activeModule, {}, session?.user)));
      const results = await Promise.all(requests);
      if (!Array.isArray(results[0].data)) throw new Error(`The server returned an invalid ${config.title} list.`);
      setItems(results[0].data);
      if (resource === 'categories') setChoices(current => ({ ...current, systemModules: Array.isArray(results[1]?.data) ? results[1].data.filter(item => item.status !== false) : [] }));
      if (resource === 'sub-categories') setChoices(current => ({ ...current, categories: Array.isArray(results[1]?.data) ? results[1].data : [] }));
      if (resource === 'child-categories') setChoices(current => ({ ...current, subCategories: Array.isArray(results[1]?.data) ? results[1].data : [] }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || `${config.title} could not be loaded.`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeModule, config.endpoint, config.title, resource, session?.user]);

  useEffect(() => { load(); }, [load]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter(item => Object.values(item).some(value => (
      typeof value !== 'object' && String(value ?? '').toLowerCase().includes(normalized)
    )));
  }, [items, query]);

  const resetForm = () => {
    setForm(defaultForm(config));
    setEditingId('');
    setError('');
  };

  const editItem = item => {
    setEditingId(choiceId(item));
    setForm(Object.fromEntries(config.fields.map(field => [
      field.key,
      item[field.key] ?? field.defaultValue ?? (field.type === 'switch' ? false : ''),
    ])));
    setError('');
  };

  const saveItem = async () => {
    const missing = config.fields.find(field => field.required && !String(form[field.key] || '').trim());
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.put(`${config.endpoint}/${encodeURIComponent(editingId)}`, form, moduleRequestConfig(activeModule, {}, session?.user));
      } else {
        await api.post(config.endpoint, form, moduleRequestConfig(activeModule, {}, session?.user));
      }
      resetForm();
      await load(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || `Could not save ${config.title.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = item => {
    const id = choiceId(item);
    if (!id) {
      setError('This record has no ID and cannot be deleted.');
      return;
    }
    Alert.alert(`Delete ${choiceName(item)}?`, 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setError('');
          try {
            await api.delete(`${config.endpoint}/${encodeURIComponent(id)}`, moduleRequestConfig(activeModule, {}, session?.user));
            await load(true);
          } catch (requestError) {
            setError(requestError.response?.data?.message || requestError.message || 'Delete failed.');
          }
        },
      },
    ]);
  };

  const optionItems = key => {
    if (key === 'systemModules') return choices.systemModules;
    if (key === 'categories') return choices.categories;
    if (key === 'subCategories') return choices.subCategories;
    return key;
  };

  return (
    <View style={styles.root}>
      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>QUICK COMMERCE / CATALOG</Text>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>{items.length} records in {activeModule?.name || 'the selected workspace'}.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{editingId ? `Edit ${config.title.slice(0, -1)}` : `Add ${config.title.slice(0, -1)}`}</Text>
          {config.fields.map(field => (
            <View key={field.key} style={styles.fieldBlock}>
              {field.type !== 'image' ? <Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text> : null}
              {field.type === 'image' ? (
                <ImageUploadField
                  label={field.label}
                  value={form[field.key]}
                  disabled={saving}
                  onChange={value => setForm(current => ({ ...current, [field.key]: value }))}
                />
              ) : field.type === 'switch' ? (
                <Switch
                  value={!!form[field.key]}
                  onValueChange={value => setForm(current => ({ ...current, [field.key]: value }))}
                  trackColor={{ true: colors.primary }}
                />
              ) : field.options ? (
                <ChoicePicker
                  options={optionItems(field.options)}
                  selectedValue={form[field.key]}
                  onSelect={item => setForm(current => ({
                    ...current,
                    [field.key]: field.options === 'systemModules' ? choiceId(item) : choiceId(item),
                  }))}
                  placeholder={`Select ${field.label.toLowerCase()}`}
                />
              ) : (
                <TextInput
                  value={String(form[field.key] ?? '')}
                  onChangeText={value => setForm(current => ({ ...current, [field.key]: value }))}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  editable={!saving}
                />
              )}
            </View>
          ))}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.formActions}>
            {editingId ? <TouchableOpacity onPress={resetForm} style={styles.secondaryButton}><Text style={styles.secondaryText}>Cancel</Text></TouchableOpacity> : null}
            <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={saveItem} style={styles.primaryButton}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{editingId ? 'Save changes' : 'Add item'}</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>{config.title} list</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Search" placeholderTextColor={colors.muted} style={styles.search} />
        </View>
        {loading ? <ActivityIndicator style={styles.loading} size="large" color={colors.primary} /> : filteredItems.length ? (
          filteredItems.map((item, index) => (
            <View key={choiceId(item) || `${resource}-${index}`} style={styles.itemCard}>
              {resource === 'brands' && item.image ? <Image source={{ uri: moduleMediaUrl(item.image, activeModule) }} style={styles.itemImage} resizeMode="cover" /> : null}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{choiceName(item)}</Text>
                <Text style={styles.itemMeta}>
                  {resource === 'categories'
                    ? `${item.priority || 'Normal'} · ${item.status === false ? 'Inactive' : 'Active'}${item.featured ? ' · Featured' : ''}`
                    : resource === 'sub-categories'
                      ? `Category: ${item.mainCategory || choices.categories.find(row => choiceId(row) === String(item.categoryId))?.name || '—'}`
                      : resource === 'child-categories'
                        ? `Subcategory: ${item.subCategory || '—'}`
                        : `ID: ${item.categoryId || item.brandId || item.attributeId || item.unitId || choiceId(item)}`}
                </Text>
              </View>
              <TouchableOpacity accessibilityRole="button" onPress={() => editItem(item)} style={styles.smallAction}><Text style={styles.actionText}>Edit</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" onPress={() => deleteItem(item)} style={styles.smallDelete}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>No {config.title.toLowerCase()} found.</Text></View>
        )}
      </ScrollView>
    </View>
  );
}

function ChoicePicker({ options, selectedValue, onSelect, placeholder }) {
  const [expanded, setExpanded] = useState(false);
  const selected = Array.isArray(options) ? options.find(item => choiceId(item) === String(selectedValue)) : null;
  return (
    <View>
      <TouchableOpacity accessibilityRole="button" onPress={() => setExpanded(value => !value)} style={styles.picker}>
        <Text style={selected ? styles.pickerText : styles.pickerPlaceholder}>{selected ? choiceName(selected) : placeholder}</Text>
        <Text style={styles.chevron}>{expanded ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>
      {expanded ? (
        <View style={styles.options}>
          {(Array.isArray(options) ? options : []).map(item => (
            <TouchableOpacity
              key={choiceId(item)}
              accessibilityRole="button"
              onPress={() => {
                onSelect(item);
                setExpanded(false);
              }}
              style={styles.option}
            >
              <Text style={styles.optionText}>{choiceName(item)}</Text>
            </TouchableOpacity>
          ))}
          {!options?.length ? <Text style={styles.noOptions}>No options available.</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  titleBlock: { paddingHorizontal: 19, paddingTop: 15, paddingBottom: 9 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { marginTop: 4, color: colors.text, fontSize: 23, fontWeight: '800' },
  subtitle: { marginTop: 4, color: colors.muted, fontSize: 12 },
  content: { paddingHorizontal: 15, paddingTop: 5, paddingBottom: 30 },
  card: { marginBottom: 14, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  fieldBlock: { marginTop: 12 },
  label: { marginBottom: 6, color: colors.text, fontSize: 12, fontWeight: '700' },
  input: { minHeight: 43, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 9, color: colors.text, fontSize: 13, backgroundColor: '#fff' },
  picker: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: '#fff' },
  pickerText: { color: colors.text, fontSize: 13 },
  pickerPlaceholder: { color: colors.muted, fontSize: 13 },
  chevron: { color: colors.muted, fontSize: 18 },
  options: { maxHeight: 180, marginTop: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: '#fff' },
  option: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionText: { color: colors.text, fontSize: 13 },
  noOptions: { padding: 11, color: colors.muted, fontSize: 12 },
  error: { marginTop: 11, color: colors.danger, fontSize: 12, lineHeight: 17 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 },
  primaryButton: { minWidth: 110, minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, borderRadius: 9, backgroundColor: colors.primary },
  primaryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  secondaryButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, borderRadius: 9, borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9, marginBottom: 9 },
  search: { width: 130, height: 37, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 9, color: colors.text, backgroundColor: colors.surface, fontSize: 12 },
  loading: { marginTop: 35 },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, padding: 11, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  itemImage: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#f3f5f8' },
  itemInfo: { flex: 1 },
  itemName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  itemMeta: { marginTop: 4, color: colors.muted, fontSize: 10 },
  smallAction: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.blueTint },
  actionText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  smallDelete: { paddingHorizontal: 8, paddingVertical: 7, borderRadius: 8, backgroundColor: '#fff0f0' },
  deleteText: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  emptyCard: { padding: 20, alignItems: 'center', borderRadius: 12, backgroundColor: colors.surface },
  emptyText: { color: colors.muted, fontSize: 12 },
});
