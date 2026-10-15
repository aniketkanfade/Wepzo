import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useModule } from '../auth/ModuleContext';
import Screen from '../components/Screen';
import { colors } from '../theme';

export default function AccountScreen() {
  const { session, signOut } = useAuth();
  const { activeModule } = useModule();
  const [signingOut, setSigningOut] = useState(false);
  const user = session?.user || {};

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out of Wepzo Admin?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: doSignOut },
    ]);
  };

  const doSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Sign out failed', error.message || 'Could not clear the saved session.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
      <Text style={styles.heading}>Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(user.name || user.email || 'A').slice(0, 1).toUpperCase()}</Text></View>
        <Text style={styles.name}>{user.name || 'Wepzo Admin'}</Text>
        <Text style={styles.email}>{user.email || 'Signed-in admin'}</Text>
      </View>

      <View style={styles.detailsCard}>
        <Detail label="Role" value={String(user.role || 'Admin').replace(/_/g, ' ')} />
        <View style={styles.divider} />
        <Detail label="Active workspace" value={activeModule?.name || 'Quick Commerce'} />
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        disabled={signingOut}
        onPress={confirmSignOut}
        style={styles.signOutButton}
      >
        {signingOut
          ? <ActivityIndicator color={colors.danger} />
          : <Text style={styles.signOutText}>Sign out</Text>}
      </TouchableOpacity>
    </Screen>
  );
}

function Detail({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 18 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  heading: { marginTop: 6, marginBottom: 20, color: colors.text, fontSize: 25, fontWeight: '800' },
  profileCard: { alignItems: 'center', padding: 22, borderWidth: 1, borderColor: colors.border, borderRadius: 17, backgroundColor: colors.surface },
  avatar: { width: 64, height: 64, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueTint },
  avatarText: { color: colors.primary, fontSize: 25, fontWeight: '800' },
  name: { marginTop: 13, color: colors.text, fontSize: 18, fontWeight: '700' },
  email: { marginTop: 4, color: colors.muted, fontSize: 13 },
  detailsCard: { marginTop: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.surface },
  detailRow: { paddingVertical: 14 },
  detailLabel: { color: colors.muted, fontSize: 12 },
  detailValue: { marginTop: 4, color: colors.text, fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  divider: { height: 1, backgroundColor: colors.border },
  signOutButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 22, borderWidth: 1, borderColor: '#f0caca', borderRadius: 11, backgroundColor: '#fff' },
  signOutText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
});
