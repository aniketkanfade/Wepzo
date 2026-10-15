import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme';

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Login failed. Please try again.';
}

export default function LoginScreen({ onOpenRegister }) {
  const { signIn, apiBaseUrl, saveApiBaseUrl, checkServer } = useAuth();
  const [serverUrl, setServerUrl] = useState(apiBaseUrl);
  const [email, setEmail] = useState('admin@wepzo.in');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [serverMessage, setServerMessage] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingServer, setCheckingServer] = useState(false);

  const testServer = async () => {
    setCheckingServer(true);
    setServerMessage('');
    setServerError('');
    try {
      await saveApiBaseUrl(serverUrl);
      const message = await checkServer();
      setServerMessage(message);
    } catch (requestError) {
      setServerError(
        requestError.response?.data?.message
          || `Cannot reach ${serverUrl}. On a phone, use the computer's Wi-Fi IPv4 address (for example http://192.168.1.20:5000/api), keep the backend running, and allow Node.js through Windows Firewall.`,
      );
    } finally {
      setCheckingServer(false);
    }
  };

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await saveApiBaseUrl(serverUrl);
      await signIn(email.trim(), password);
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(
        requestError.code === 'ERR_NETWORK' || message === 'Network Error'
          ? `Cannot reach ${serverUrl}. Check the server address, make sure the backend is running, and allow Node.js through Windows Firewall.`
          : message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.brand}>
        <View style={styles.logo}><Text style={styles.logoText}>W</Text></View>
        <Text style={styles.title}>WEPZO</Text>
        <Text style={styles.subtitle}>Admin control, wherever you are.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Admin sign in</Text>
        <Text style={styles.description}>Sign in to the Wepzo Admin mobile app.</Text>

        <Text style={styles.label}>Backend server address</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://192.168.1.20:5000/api"
          placeholderTextColor="#9aa5b5"
          value={serverUrl}
          onChangeText={value => {
            setServerUrl(value);
            setServerMessage('');
            setServerError('');
          }}
          style={styles.input}
          editable={!loading && !checkingServer}
          returnKeyType="done"
        />
        <Text style={styles.serverHint}>
          Phone par emulator wala 10.0.2.2/localhost nahi—computer ka Wi-Fi IPv4 address use karein.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={loading || checkingServer}
          onPress={testServer}
          style={[styles.testButton, (loading || checkingServer) && styles.buttonDisabled]}
        >
          {checkingServer
            ? <ActivityIndicator color={colors.primary} />
            : <Text style={styles.testButtonText}>Test server connection</Text>}
        </TouchableOpacity>
        {serverMessage ? <Text style={styles.serverSuccess}>{serverMessage}</Text> : null}
        {serverError ? <Text accessibilityRole="alert" style={styles.error}>{serverError}</Text> : null}

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor="#9aa5b5"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          editable={!loading}
          returnKeyType="next"
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            placeholder="Enter your password"
            placeholderTextColor="#9aa5b5"
            secureTextEntry={!passwordVisible}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            style={styles.passwordInput}
            editable={!loading}
            returnKeyType="go"
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            onPress={() => setPasswordVisible(visible => !visible)}
            style={styles.passwordToggle}
          >
            <Text style={styles.passwordToggleText}>{passwordVisible ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          disabled={loading}
          onPress={submit}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Sign in</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={loading}
          onPress={onOpenRegister}
          style={styles.registerLink}
        >
          <Text style={styles.registerLinkText}>Create an Admin account</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.footer}>Wepzo Admin · Mobile</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 52, height: 52, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  title: { marginTop: 12, color: colors.primary, fontSize: 25, fontWeight: '800', letterSpacing: 2 },
  subtitle: { marginTop: 5, color: colors.muted, fontSize: 14 },
  card: { padding: 22, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  heading: { color: colors.text, fontSize: 22, fontWeight: '700' },
  description: { marginTop: 5, marginBottom: 22, color: colors.muted, fontSize: 14 },
  label: { marginBottom: 7, color: colors.text, fontSize: 13, fontWeight: '600' },
  input: { height: 49, marginBottom: 17, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 11, color: colors.text, fontSize: 15, backgroundColor: '#fff' },
  serverHint: { marginTop: -10, marginBottom: 10, color: colors.muted, fontSize: 11, lineHeight: 16 },
  testButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 18, borderWidth: 1, borderColor: colors.primary, borderRadius: 10, backgroundColor: '#fff' },
  testButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  serverSuccess: { marginTop: -9, marginBottom: 14, color: colors.positive, fontSize: 12 },
  passwordRow: { height: 49, flexDirection: 'row', alignItems: 'center', marginBottom: 17, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: '#fff' },
  passwordInput: { flex: 1, height: '100%', paddingHorizontal: 14, color: colors.text, fontSize: 15 },
  passwordToggle: { minWidth: 58, height: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  passwordToggleText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  error: { marginBottom: 16, padding: 11, borderRadius: 9, color: colors.danger, backgroundColor: '#fff0f0', fontSize: 13 },
  button: { height: 50, marginTop: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.primary },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  registerLink: { alignItems: 'center', paddingTop: 15 },
  registerLinkText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  footer: { marginTop: 22, color: colors.muted, textAlign: 'center', fontSize: 12 },
});
