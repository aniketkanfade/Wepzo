import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useModule } from '../auth/ModuleContext';
import Screen from '../components/Screen';
import { colors } from '../theme';

export default function SettingsScreen() {
  const { apiBaseUrl, saveApiBaseUrl, checkServer } = useAuth();
  const { activeModule } = useModule();
  const [serverUrl, setServerUrl] = useState(apiBaseUrl);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const testAndSave = async () => {
    setChecking(true);
    setError('');
    setMessage('');
    try {
      await saveApiBaseUrl(serverUrl);
      const response = await checkServer();
      setMessage(response);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Could not connect to the backend.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>APP PREFERENCES</Text>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Manage the native app connection and current workspace.</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Backend server</Text>
        <Text style={styles.help}>On a physical phone, use the computer’s Wi-Fi IPv4 address.</Text>
        <TextInput
          accessibilityLabel="Backend server address"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={serverUrl}
          onChangeText={value => {
            setServerUrl(value);
            setMessage('');
            setError('');
          }}
          placeholder="http://192.168.1.20:5000/api"
          placeholderTextColor="#9aa5b5"
          style={styles.input}
          editable={!checking}
        />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          accessibilityRole="button"
          disabled={checking}
          onPress={testAndSave}
          style={[styles.button, checking && styles.disabled]}
        >
          {checking ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save and test connection</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Current workspace</Text>
        <Text style={styles.value}>{activeModule?.name || 'Quick Commerce'}</Text>
        <Text style={styles.help}>
          {activeModule?.slug || 'quick-commerce'} · Workspace access follows your signed-in account.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 18 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  title: { marginTop: 5, color: colors.text, fontSize: 25, fontWeight: '800' },
  subtitle: { marginTop: 5, marginBottom: 16, color: colors.muted, fontSize: 13, lineHeight: 18 },
  card: { marginBottom: 12, padding: 15, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  help: { marginTop: 6, color: colors.muted, fontSize: 12, lineHeight: 17 },
  input: { height: 46, marginTop: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 9, color: colors.text, fontSize: 13, backgroundColor: '#fff' },
  button: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 10, borderRadius: 9, backgroundColor: colors.primary },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.65 },
  success: { marginTop: 9, color: colors.positive, fontSize: 12 },
  error: { marginTop: 9, color: colors.danger, fontSize: 12, lineHeight: 17 },
  value: { marginTop: 8, color: colors.primary, fontSize: 15, fontWeight: '700' },
});
