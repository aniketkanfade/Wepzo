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

export default function RegisterScreen({ onBackToLogin }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password) {
      setError('Enter your name, email, and password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
    } catch (requestError) {
      const status = requestError.response?.status;
      setError(
        status === 409
          ? 'An account already exists for this email. Sign in instead.'
          : requestError.response?.data?.message || requestError.message || 'Account creation failed.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logo}><Text style={styles.logoText}>W</Text></View>
          <Text style={styles.brandName}>WEPZO</Text>
          <Text style={styles.subtitle}>Create your Admin account.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Create admin account</Text>
          <Text style={styles.description}>Sign up for the native Wepzo Admin app.</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            autoCapitalize="words"
            autoComplete="name"
            placeholder="Your name"
            placeholderTextColor="#9aa5b5"
            value={name}
            onChangeText={setName}
            style={styles.input}
            editable={!submitting}
            returnKeyType="next"
          />

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
            editable={!submitting}
            returnKeyType="next"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            placeholderTextColor="#9aa5b5"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            style={styles.input}
            editable={!submitting}
            returnKeyType="go"
          />

          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            accessibilityRole="button"
            disabled={submitting}
            onPress={submit}
            style={[styles.button, submitting && styles.disabled]}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Create account</Text>}
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={onBackToLogin} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: colors.primary },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  brandName: { marginTop: 10, color: colors.primary, fontSize: 23, fontWeight: '800', letterSpacing: 2 },
  subtitle: { marginTop: 5, color: colors.muted, fontSize: 13 },
  card: { padding: 21, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  heading: { color: colors.text, fontSize: 21, fontWeight: '700' },
  description: { marginTop: 5, marginBottom: 17, color: colors.muted, fontSize: 13 },
  label: { marginBottom: 7, color: colors.text, fontSize: 13, fontWeight: '600' },
  input: { height: 47, marginBottom: 14, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 10, color: colors.text, fontSize: 14, backgroundColor: '#fff' },
  error: { marginBottom: 12, padding: 10, borderRadius: 9, color: colors.danger, backgroundColor: '#fff0f0', fontSize: 12, lineHeight: 17 },
  button: { height: 49, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primary },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.65 },
  loginLink: { alignItems: 'center', paddingTop: 16 },
  loginLinkText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
});
