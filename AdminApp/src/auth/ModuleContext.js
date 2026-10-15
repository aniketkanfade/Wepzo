import { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from './AuthContext';
import { colors } from '../theme';

const DEFAULT_MODULE = {
  _id: 'quick-commerce',
  id: 'quick-commerce',
  name: 'Quick Commerce',
  slug: 'quick-commerce',
  type: 'quick-commerce',
};

const ModuleContext = createContext(null);

export function ModuleProvider({ children }) {
  const { session } = useAuth();
  const [activeModule, setActiveModuleState] = useState(DEFAULT_MODULE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const user = session?.user;
    const assignedModuleSlug = user?.selectedModuleSlug
      || user?.websiteModuleSlug
      || user?.module?.slug
      || user?.websiteModule?.slug;
    const userModule = user?.role !== 'main_admin'
      ? {
          _id: user?.selectedModuleId || user?.websiteModuleId || user?.module?._id || user?.websiteModule?._id || assignedModuleSlug || DEFAULT_MODULE._id,
          id: user?.selectedModuleId || user?.websiteModuleId || user?.module?._id || user?.websiteModule?._id || assignedModuleSlug || DEFAULT_MODULE.id,
          name: user?.selectedModuleName || user?.module?.name || user?.websiteModule?.name || assignedModuleSlug || DEFAULT_MODULE.name,
          slug: assignedModuleSlug || DEFAULT_MODULE.slug,
          type: user?.selectedModuleType || user?.module?.type || user?.websiteModule?.type || assignedModuleSlug || DEFAULT_MODULE.type,
        }
      : null;
    setReady(false);
    if (userModule) setActiveModuleState(userModule);

    SecureStore.getItemAsync('adminModule')
      .then(value => {
        if (!mounted) return;
        const saved = !userModule && value ? JSON.parse(value) : DEFAULT_MODULE;
        setActiveModuleState({
          ...DEFAULT_MODULE,
          ...(userModule || saved),
          slug: (userModule || saved).slug || DEFAULT_MODULE.slug,
          name: (userModule || saved).name || DEFAULT_MODULE.name,
        });
        setReady(true);
      })
      .catch(error => {
        console.error('Could not restore the selected admin module.', error);
        if (mounted) {
          setActiveModuleState(current => userModule || current);
          setReady(true);
        }
      });

    return () => { mounted = false; };
  }, [session?.user]);

  const setActiveModule = async module => {
    if (!module) return;
    if (session?.user?.role !== 'main_admin') {
      throw new Error('Only a main admin can switch workspaces.');
    }
    const nextModule = {
      ...DEFAULT_MODULE,
      ...module,
      slug: module.slug || module.type || DEFAULT_MODULE.slug,
      name: module.name || DEFAULT_MODULE.name,
    };
    await SecureStore.setItemAsync('adminModule', JSON.stringify(nextModule));
    setActiveModuleState(nextModule);
  };

  return (
    <ModuleContext.Provider value={{ activeModule, setActiveModule }}>
      {ready ? children : (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </ModuleContext.Provider>
  );
}

export function useModule() {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModule must be used inside the module provider.');
  }
  return context;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
