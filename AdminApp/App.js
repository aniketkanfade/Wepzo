import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthContext } from './src/auth/AuthContext';
import {
  api,
  getApiBaseUrl,
  setApiBaseUrl as configureApiBaseUrl,
  setAuthToken,
  setUnauthorizedHandler,
} from './src/api/client';
import { ModuleProvider } from './src/auth/ModuleContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { colors } from './src/theme';

export default function App() {
  const [session, setSession] = useState(null);
  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBaseUrl());
  const [restoring, setRestoring] = useState(true);
  const [authScreen, setAuthScreen] = useState('login');

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const [token, savedUser, savedApiBaseUrl] = await Promise.all([
          SecureStore.getItemAsync('token'),
          SecureStore.getItemAsync('user'),
          SecureStore.getItemAsync('apiBaseUrl'),
        ]);
        if (!mounted) return;

        if (savedApiBaseUrl) {
          const configuredUrl = configureApiBaseUrl(savedApiBaseUrl);
          setApiBaseUrlState(configuredUrl);
        }

        if (token && savedUser) {
          const user = JSON.parse(savedUser);
          setAuthToken(token);
          setSession({ token, user });
        } else {
          await SecureStore.deleteItemAsync('token');
          await SecureStore.deleteItemAsync('user');
        }
      } catch (error) {
        console.error('Could not restore the saved admin session.', error);
        if (mounted) {
          setAuthToken(null);
          setSession(null);
        }
      } finally {
        if (mounted) setRestoring(false);
      }
    }

    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const saveSession = async data => {
    if (!data?.token || !data?.user) {
      throw new Error('The server returned an invalid authentication response.');
    }

    await Promise.all([
      SecureStore.setItemAsync('token', data.token),
      SecureStore.setItemAsync('user', JSON.stringify(data.user)),
    ]);
    setAuthToken(data.token);
    setSession({ token: data.token, user: data.user });
  };

  const signIn = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await saveSession(data);
  };

  const register = async ({ name, email, password }) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    await saveSession(data);
  };

  const saveApiBaseUrl = async value => {
    const configuredUrl = configureApiBaseUrl(value);
    await SecureStore.setItemAsync('apiBaseUrl', configuredUrl);
    setApiBaseUrlState(configuredUrl);
    return configuredUrl;
  };

  const checkServer = async () => {
    const { data } = await api.get('/health');
    if (data?.status !== 'ok') throw new Error('The server responded, but its health check was unsuccessful.');
    return data.message || 'WEPZO API is running';
  };

  const signOut = async () => {
    setAuthToken(null);
    setSession(null);
    await Promise.all([
      SecureStore.deleteItemAsync('token'),
      SecureStore.deleteItemAsync('user'),
      SecureStore.deleteItemAsync('adminModule'),
    ]);
  };

  useEffect(() => {
    const handleUnauthorized = async () => {
      setAuthToken(null);
      setSession(null);
      try {
        await Promise.all([
          SecureStore.deleteItemAsync('token'),
          SecureStore.deleteItemAsync('user'),
          SecureStore.deleteItemAsync('adminModule'),
        ]);
      } catch (error) {
        console.error('Could not clear the expired admin session.', error);
      }
    };

    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null);
  }, []);

  if (restoring) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ session, signIn, register, signOut, apiBaseUrl, saveApiBaseUrl, checkServer }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {session ? (
        <ModuleProvider>
          <AppNavigator />
        </ModuleProvider>
      ) : authScreen === 'register' ? (
        <RegisterScreen onBackToLogin={() => setAuthScreen('login')} />
      ) : <LoginScreen onOpenRegister={() => setAuthScreen('register')} />}
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
