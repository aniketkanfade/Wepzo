import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useModule } from '../auth/ModuleContext';
import { api, moduleRequestConfig } from '../api/client';
import { colors } from '../theme';

const CONFIGS = {
  specifications: {
    title: 'Category Specifications',
    endpoint: '/category-specifications',
    dataKey: 'fields',
  },
  variants: {
    title: 'Category Variants',
    endpoint: '/category-variants',
    dataKey: 'attributes',
  },
};

const messageFor = (error, fallback) => error.response?.data?.message || error.message || fallback;

export default function CategoryConfigScreen({ kind }) {
  const config = CONFIGS[kind];
  const { session } = useAuth();
  const { activeModule } = useModule();
  const [categories, setCategories] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [mainCategory, setMainCategory] = useState('');
  const [rows, setRows] = useState([]);
  const [newName, setNewName] = useState('');
  const [newOptions, setNewOptions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const requestConfig = useCallback((extra = {}) => moduleRequestConfig(activeModule, extra, session?.user), [activeModule, session?.user]);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [categoryResponse, configResponse] = await Promise.all([
        api.get('/categories', requestConfig()),
        api.get(config.endpoint, requestConfig()),
      ]);
      if (!Array.isArray(categoryResponse.data) || !Array.isArray(configResponse.data)) {
        throw new Error('The server returned an invalid category configuration.');
      }
      setCategories(categoryResponse.data);
      setConfigs(configResponse.data);
    } catch (requestError) {
      setError(messageFor(requestError, `${config.title} could not be loaded.`));
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, config.title, requestConfig]);

  useEffect(() => { load(); }, [load]);

  const chooseCategory = name => {
    setMainCategory(name);
    setRows(configs.find(item => item.mainCategory === name)?.[config.dataKey] || []);
    setError('');
  };

  const addRow = () => {
    const normalizedName = newName.trim();
    if (!normalizedName) {
      setError(kind === 'specifications' ? 'Specification name is required.' : 'Variant attribute name is required.');
      return;
    }
    const key = normalizedName.toLowerCase().replace(/\s+/g, '_');
    const displayName = normalizedName.replace(/\b\w/g, character => character.toUpperCase());
    const duplicate = rows.some(row => (row.key || row.name) === (kind === 'specifications' ? key : displayName));
    if (duplicate) {
      setError('This field already exists for the selected category.');
      return;
    }
    const options = newOptions.split(',').map(option => option.trim()).filter(Boolean);
    setRows(current => [...current, kind === 'specifications'
      ? { key, label: displayName, options }
      : { name: displayName, options }]);
    setNewName('');
    setNewOptions('');
    setError('');
  };

  const save = async () => {
    if (!mainCategory) {
      setError('Select a category before saving.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.put(config.endpoint, { mainCategory, [config.dataKey]: rows }, requestConfig());
      await load();
    } catch (requestError) {
      setError(messageFor(requestError, `${config.title} could not be saved.`));
    } finally {
      setSaving(false);
    }
  };

  const deleteConfig = item => Alert.alert(
    `Delete ${item.mainCategory} configuration?`,
    'This removes the saved field or variant configuration for this category.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`${config.endpoint}/${encodeURIComponent(item._id)}`, requestConfig());
            if (mainCategory === item.mainCategory) {
              setMainCategory('');
              setRows([]);
            }
            await load();
          } catch (requestError) {
            setError(messageFor(requestError, 'Configuration could not be deleted.'));
          }
        },
      },
    ],
  );

  return (
    <View style={styles.root}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>QUICK COMMERCE / CATEGORY MANAGEMENT</Text>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>Configure fields by main category for {activeModule?.name || 'the active workspace'}.</Text>
      </View>
      {loading ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Select main category</Text>
            <View style={styles.choices}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category._id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mainCategory === category.name }}
                  onPress={() => chooseCategory(category.name)}
                  style={[styles.choice, mainCategory === category.name && styles.choiceSelected]}
                >
                  <Text style={[styles.choiceText, mainCategory === category.name && styles.choiceTextSelected]}>{category.name}</Text>
                </TouchableOpacity>
              ))}
              {!categories.length ? <Text style={styles.empty}>No categories are available in this workspace.</Text> : null}
            </View>
          </View>

          {mainCategory ? (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Editing: {mainCategory}</Text>
                <Text style={styles.subtitle}>{rows.length} configured {kind === 'specifications' ? 'fields' : 'attributes'}</Text>
                <Field label={kind === 'specifications' ? 'Specification name' : 'Variant attribute'} value={newName} onChangeText={setNewName} />
                <Field label="Options (comma separated)" value={newOptions} onChangeText={setNewOptions} />
                <TouchableOpacity accessibilityRole="button" onPress={addRow} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Add field</Text>
                </TouchableOpacity>
                {rows.map((row, index) => {
                  const label = kind === 'specifications' ? row.label : row.name;
                  const key = kind === 'specifications' ? row.key : row.name;
                  return (
                    <View key={`${key}-${index}`} style={styles.row}>
                      <View style={styles.rowCopy}>
                        <Text style={styles.rowTitle}>{label || 'Unnamed field'}</Text>
                        <Text style={styles.rowMeta}>{(row.options || []).join(', ') || 'No options'}</Text>
                      </View>
                      <TouchableOpacity accessibilityRole="button" onPress={() => setRows(current => current.filter((_, rowIndex) => rowIndex !== index))} style={styles.removeButton}>
                        <Text style={styles.removeText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
              <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={save} style={[styles.saveButton, saving && styles.disabled]}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save configuration</Text>}
              </TouchableOpacity>
            </>
          ) : null}

          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Text style={styles.listTitle}>Saved configurations</Text>
          {configs.map(item => (
            <View key={item._id} style={styles.savedRow}>
              <TouchableOpacity style={styles.rowCopy} onPress={() => chooseCategory(item.mainCategory)}>
                <Text style={styles.rowTitle}>{item.mainCategory}</Text>
                <Text style={styles.rowMeta}>{item[config.dataKey]?.length || 0} {kind === 'specifications' ? 'fields' : 'attributes'}</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" onPress={() => deleteConfig(item)} style={styles.removeButton}>
                <Text style={styles.removeText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
          {!configs.length ? <Text style={styles.empty}>No saved configurations yet.</Text> : null}
        </ScrollView>
      )}
    </View>
  );
}

function Field({ label, value, onChangeText }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={label} placeholderTextColor={colors.muted} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  heading: { paddingHorizontal: 19, paddingTop: 15, paddingBottom: 9 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { marginTop: 4, color: colors.text, fontSize: 23, fontWeight: '800' },
  subtitle: { marginTop: 4, color: colors.muted, fontSize: 12 },
  content: { padding: 15, paddingTop: 5, paddingBottom: 30 },
  card: { marginBottom: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 },
  choice: { paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: '#fff' },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.blueTint },
  choiceText: { color: colors.text, fontSize: 12 },
  choiceTextSelected: { color: colors.primary, fontWeight: '700' },
  field: { marginTop: 12 },
  label: { marginBottom: 6, color: colors.text, fontSize: 12, fontWeight: '700' },
  input: { minHeight: 43, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 9, color: colors.text, fontSize: 13, backgroundColor: '#fff' },
  secondaryButton: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 9, backgroundColor: colors.blueTint },
  secondaryText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 9, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  savedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  rowMeta: { marginTop: 3, color: colors.muted, fontSize: 11 },
  removeButton: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, backgroundColor: '#fff0f0' },
  removeText: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  saveButton: { minHeight: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 15, borderRadius: 10, backgroundColor: colors.primary },
  saveText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.65 },
  error: { marginBottom: 10, color: colors.danger, fontSize: 12 },
  listTitle: { marginBottom: 8, color: colors.text, fontSize: 15, fontWeight: '800' },
  empty: { padding: 12, color: colors.muted, fontSize: 12 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
