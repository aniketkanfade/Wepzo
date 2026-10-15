import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useModule } from '../auth/ModuleContext';
import { api, moduleRequestConfig, resolveAdminModuleSlug } from '../api/client';
import Screen from '../components/Screen';
import { colors } from '../theme';

const DEFAULT_MODULES = [
  { _id: 'quick-commerce', name: 'Quick Commerce', slug: 'quick-commerce', type: 'quick-commerce' },
  { _id: 'e-commerce', name: 'E-Commerce', slug: 'e-commerce', type: 'e-commerce' },
  { _id: 'store-singlepage-web', name: 'Store Singlepage Web', slug: 'store-singlepage-web', type: 'store-singlepage-web' },
  { _id: 'marketing', name: 'Marketing', slug: 'marketing', type: 'marketing' },
  { _id: 'general', name: 'Web Page', slug: 'general', type: 'general' },
];

function moduleKey(module) {
  const slug = resolveAdminModuleSlug(module);
  return slug === 'general' ? 'information-web' : slug;
}

export default function ModulesScreen() {
  const { session } = useAuth();
  const { activeModule, setActiveModule } = useModule();
  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const isMainAdmin = session?.user?.role === 'main_admin';

  const loadModules = useCallback(async () => {
    if (!isMainAdmin) {
      setModules([activeModule]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get('/website-modules', moduleRequestConfig(activeModule, {}, session?.user));
      const available = Array.isArray(data)
        ? data.filter(item => item.status !== false && item.status !== 'false' && item.status !== 'inactive')
        : [];
      const byKey = new Map(available.map(item => [moduleKey(item), item]));
      DEFAULT_MODULES.forEach(item => {
        const key = moduleKey(item);
        if (!byKey.has(key)) byKey.set(key, item);
      });

      setModules([...byKey.values()]);
    } catch (error) {
      setLoadError(error.response?.data?.message || error.message || 'Could not load modules. Showing available defaults.');
      setModules(DEFAULT_MODULES);
    } finally {
      setLoading(false);
    }
  }, [activeModule, isMainAdmin, session?.user]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const selectModule = async module => {
    if (!isMainAdmin) return;
    setSaveError('');
    try {
      await setActiveModule(module);
    } catch (error) {
      setSaveError(error.message || 'Could not save the selected module.');
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>WORKSPACES</Text>
      <Text style={styles.heading}>Admin modules</Text>
      <Text style={styles.subtitle}>
        {isMainAdmin
          ? 'Choose which Wepzo business workspace to manage.'
          : `Your account is assigned to ${activeModule?.name || 'its workspace'}. Only a main admin can switch workspaces.`}
      </Text>

      {loadError ? <Text style={styles.notice}>{loadError}</Text> : null}
      {saveError ? <Text accessibilityRole="alert" style={styles.saveError}>{saveError}</Text> : null}

      {loading ? (
        <ActivityIndicator style={styles.loading} size="large" color={colors.primary} />
      ) : isMainAdmin ? modules.map((module, index) => {
        const selected = moduleKey(module) === moduleKey(activeModule);
        const descriptions = [
          'Manage products, stores, orders and deliveries.',
          'Manage your e-commerce storefront and catalog.',
          'Manage a single-store online experience.',
          'Manage marketing and promotions.',
          'Manage website pages and content.',
        ];
        return (
          <TouchableOpacity
            key={module._id || module.id || module.slug || module.type}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => selectModule(module)}
            style={[styles.moduleCard, selected && styles.moduleCardSelected]}
          >
            <View style={[styles.moduleIcon, selected && styles.moduleIconSelected]}>
              <Text style={[styles.moduleIconText, selected && styles.moduleIconTextSelected]}>
                {(module.name || 'M').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.moduleCopy}>
              <Text style={styles.moduleName}>{module.name || module.slug}</Text>
              <Text style={styles.moduleDescription}>{descriptions[index % descriptions.length]}</Text>
            </View>
            <Text style={[styles.selectionMark, selected && styles.selectionMarkSelected]}>{selected ? '✓' : '›'}</Text>
          </TouchableOpacity>
        );
      }) : (
        <View style={styles.moduleCardSelected}>
          <Text style={styles.moduleName}>{activeModule?.name || 'Quick Commerce'}</Text>
          <Text style={styles.moduleDescription}>This account can only manage its assigned workspace.</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 18 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  heading: { marginTop: 6, color: colors.text, fontSize: 25, fontWeight: '800' },
  subtitle: { marginTop: 5, marginBottom: 22, color: colors.muted, fontSize: 13, lineHeight: 19 },
  notice: { marginBottom: 12, padding: 11, borderRadius: 10, color: '#795800', backgroundColor: colors.amberTint, fontSize: 12, lineHeight: 18 },
  saveError: { marginBottom: 12, color: colors.danger, fontSize: 13 },
  loading: { marginTop: 40 },
  moduleCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 11, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.surface },
  moduleCardSelected: { borderColor: colors.primary, backgroundColor: '#f8faff' },
  moduleIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f6' },
  moduleIconSelected: { backgroundColor: colors.primary },
  moduleIconText: { color: colors.muted, fontSize: 17, fontWeight: '800' },
  moduleIconTextSelected: { color: '#fff' },
  moduleCopy: { flex: 1, marginLeft: 12 },
  moduleName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  moduleDescription: { marginTop: 4, color: colors.muted, fontSize: 11, lineHeight: 16 },
  selectionMark: { marginLeft: 8, color: colors.muted, fontSize: 20 },
  selectionMarkSelected: { color: colors.primary, fontWeight: '800' },
});
