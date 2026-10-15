import { useCallback, useEffect, useState } from 'react';
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

const EMPTY_FORM = { name: '', slug: '', description: '', image: '', status: true };
const getId = item => item?._id || item?.id || '';
const errorMessage = (error, fallback) => error.response?.data?.message || error.message || fallback;

export default function SystemModulesScreen() {
  const { session } = useAuth();
  const { activeModule } = useModule();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/system-modules', moduleRequestConfig(activeModule, {}, session?.user));
      if (!Array.isArray(data)) throw new Error('The server returned an invalid main modules list.');
      setItems(data);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Main modules could not be loaded.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeModule, session?.user]);

  useEffect(() => { load(); }, [load]);

  const reset = () => {
    setForm(EMPTY_FORM);
    setEditingId('');
    setError('');
  };

  const edit = item => {
    setForm({
      name: item.name || '',
      slug: item.slug || '',
      description: item.description || '',
      image: item.image || '',
      status: item.status !== false,
    });
    setEditingId(getId(item));
    setError('');
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError('Module name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, name: form.name.trim(), slug: form.slug.trim() };
      if (editingId) {
        await api.put(`/system-modules/${encodeURIComponent(editingId)}`, payload, moduleRequestConfig(activeModule, {}, session?.user));
      } else {
        await api.post('/system-modules', payload, moduleRequestConfig(activeModule, {}, session?.user));
      }
      reset();
      await load(true);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Main module could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = item => Alert.alert(`Delete ${item.name || 'module'}?`, 'This action cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        setError('');
        try {
          await api.delete(`/system-modules/${encodeURIComponent(getId(item))}`, moduleRequestConfig(activeModule, {}, session?.user));
          await load(true);
        } catch (requestError) {
          setError(errorMessage(requestError, 'Main module could not be deleted.'));
        }
      },
    },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>QUICK COMMERCE / MODULES</Text>
        <Text style={styles.title}>Main Modules</Text>
        <Text style={styles.subtitle}>{items.length} modules in {activeModule?.name || 'the active workspace'}.</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{editingId ? 'Edit main module' : 'Add main module'}</Text>
          <Field label="Module name *" value={form.name} onChangeText={name => setForm(current => ({ ...current, name }))} />
          <Field label="Slug" value={form.slug} onChangeText={slug => setForm(current => ({ ...current, slug }))} autoCapitalize="none" />
          <Field label="Description" value={form.description} onChangeText={description => setForm(current => ({ ...current, description }))} />
          <ImageUploadField label="Module image" value={form.image} disabled={saving} onChange={image => setForm(current => ({ ...current, image }))} />
          <View style={styles.switchRow}>
            <Text style={styles.label}>Active</Text>
            <Switch value={form.status} onValueChange={status => setForm(current => ({ ...current, status }))} trackColor={{ true: colors.primary }} />
          </View>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            {editingId ? <TouchableOpacity onPress={reset} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity> : null}
            <TouchableOpacity disabled={saving} onPress={save} style={[styles.save, saving && styles.disabled]}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{editingId ? 'Save changes' : 'Add module'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.listTitle}>Main modules</Text>
        {loading ? <ActivityIndicator style={styles.loading} size="large" color={colors.primary} /> : items.length ? items.map((item, index) => (
          <View key={getId(item) || `module-${index}`} style={styles.item}>
            {item.image ? <Image source={{ uri: moduleMediaUrl(item.image, activeModule) }} style={styles.moduleImage} resizeMode="cover" /> : null}
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{item.name || 'Unnamed module'}</Text>
              <Text style={styles.itemMeta}>{item.slug || 'No slug'} · {item.status === false ? 'Inactive' : 'Active'}</Text>
              {item.description ? <Text style={styles.itemMeta}>{item.description}</Text> : null}
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={() => edit(item)} style={styles.smallAction}><Text style={styles.actionText}>Edit</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={() => remove(item)} style={styles.smallDelete}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
          </View>
        )) : <Text style={styles.empty}>No main modules found.</Text>}
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChangeText, autoCapitalize = 'sentences' }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={String(value ?? '')} onChangeText={onChangeText} autoCapitalize={autoCapitalize} placeholder={label} placeholderTextColor={colors.muted} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  heading: { paddingHorizontal: 19, paddingTop: 15, paddingBottom: 9 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { marginTop: 4, color: colors.text, fontSize: 23, fontWeight: '800' },
  subtitle: { marginTop: 4, color: colors.muted, fontSize: 12 },
  content: { paddingHorizontal: 15, paddingTop: 5, paddingBottom: 30 },
  card: { marginBottom: 14, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  field: { marginTop: 12 },
  label: { marginBottom: 6, color: colors.text, fontSize: 12, fontWeight: '700' },
  input: { minHeight: 43, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 9, color: colors.text, fontSize: 13, backgroundColor: '#fff' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 },
  save: { minWidth: 110, minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, borderRadius: 9, backgroundColor: colors.primary },
  saveText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  cancel: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, borderRadius: 9, backgroundColor: colors.blueTint },
  cancelText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.65 },
  error: { marginTop: 10, color: colors.danger, fontSize: 12 },
  listTitle: { marginBottom: 8, color: colors.text, fontSize: 15, fontWeight: '800' },
  loading: { marginTop: 28 },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  moduleImage: { width: 42, height: 42, marginRight: 10, borderRadius: 8, backgroundColor: '#f3f5f8' },
  itemInfo: { flex: 1, paddingRight: 6 },
  itemTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  itemMeta: { marginTop: 3, color: colors.muted, fontSize: 11 },
  smallAction: { minHeight: 34, justifyContent: 'center', marginLeft: 4, paddingHorizontal: 9, borderRadius: 8, backgroundColor: colors.blueTint },
  actionText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  smallDelete: { minHeight: 34, justifyContent: 'center', marginLeft: 4, paddingHorizontal: 9, borderRadius: 8, backgroundColor: '#fff0f0' },
  deleteText: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  empty: { padding: 16, color: colors.muted, textAlign: 'center' },
});
