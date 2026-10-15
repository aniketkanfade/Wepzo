import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { pickNativeImage } from './ProductMediaPicker';
import { useModule } from '../auth/ModuleContext';
import { moduleMediaUrl } from '../api/client';
import { colors } from '../theme';

export default function ImageUploadField({ label, value, onChange, disabled = false }) {
  const { activeModule } = useModule();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const choose = async () => {
    setLoading(true);
    setError('');
    try {
      const image = await pickNativeImage();
      if (image) onChange(image);
    } catch (pickerError) {
      setError(pickerError.message || 'Image could not be selected.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={styles.previewWrap}>
          {value ? <Image source={{ uri: moduleMediaUrl(value, activeModule) }} style={styles.preview} resizeMode="cover" /> : <Text style={styles.placeholder}>No image</Text>}
        </View>
        <View style={styles.actions}>
          <TextInput
            value={String(value || '').startsWith('data:') ? '' : String(value || '')}
            onChangeText={onChange}
            placeholder="Paste image URL"
            placeholderTextColor={colors.muted}
            editable={!disabled && !loading}
            autoCapitalize="none"
            style={styles.input}
          />
          <View style={styles.buttons}>
            <TouchableOpacity accessibilityRole="button" disabled={disabled || loading} onPress={choose} style={styles.button}>
              {loading ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.buttonText}>Choose image</Text>}
            </TouchableOpacity>
            {value ? <TouchableOpacity accessibilityRole="button" disabled={disabled || loading} onPress={() => onChange('')} style={styles.removeButton}><Text style={styles.removeText}>Remove</Text></TouchableOpacity> : null}
          </View>
        </View>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  label: { marginBottom: 6, color: colors.text, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewWrap: { width: 66, height: 66, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: '#f7f8fa' },
  preview: { width: 66, height: 66 },
  placeholder: { color: colors.muted, fontSize: 9 },
  actions: { flex: 1 },
  input: { minHeight: 40, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, color: colors.text, fontSize: 12 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 7 },
  button: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.blueTint },
  buttonText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  removeButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#fff0f0' },
  removeText: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  error: { marginTop: 5, color: colors.danger, fontSize: 11 },
});
