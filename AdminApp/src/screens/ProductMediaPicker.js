import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme';

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function assetDataUrl(asset) {
  if (!asset.base64) throw new Error('Image data could not be read. Please select the image again.');
  const size = Math.floor(asset.base64.length * 0.75);
  if (size > MAX_IMAGE_BYTES) throw new Error('Each product image must be 5 MB or smaller.');
  return `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
}

async function chooseImages({ multiple, remaining = 1 }) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Photo access required', 'Allow photo library access to add product images.');
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    maxWidth: 800,
    maxHeight: 800,
    allowsEditing: !multiple,
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? remaining : 1,
    quality: 0.72,
    ...(multiple ? {} : { aspect: [1, 1] }),
    base64: true,
  });
  if (result.canceled) return [];
  const selected = (result.assets || []).map(assetDataUrl);
  const totalBytes = selected.reduce((total, uri) => total + Math.floor(uri.length * 0.75), 0);
  if (totalBytes > 7 * 1024 * 1024) {
    throw new Error('Selected images exceed the 7 MB upload limit. Choose fewer or smaller images.');
  }
  return selected;
}

export async function pickNativeImage() {
  const selected = await chooseImages({ multiple: false });
  return selected[0] || '';
}

export default function ProductMediaPicker({ image, images, onChange, disabled }) {
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');

  const pick = async (kind, multiple = false, remaining = 1) => {
    setWorking(kind);
    setError('');
    try {
      const selected = await chooseImages({ multiple, remaining });
      if (!selected.length) return;
      if (kind === 'thumbnail') onChange({ image: selected[0] });
      else onChange({ images: [...images, ...selected].slice(0, MAX_IMAGES) });
    } catch (pickerError) {
      setError(pickerError.message || 'Could not add the selected image.');
    } finally {
      setWorking('');
    }
  };

  const removeImage = index => {
    onChange({ images: images.filter((_, imageIndex) => imageIndex !== index) });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Product images</Text>
          <Text style={styles.help}>Square thumbnail and up to {MAX_IMAGES} gallery images · max 5 MB each</Text>
        </View>
      </View>
      <View style={styles.mediaRow}>
        <View style={styles.mediaColumn}>
          <Text style={styles.label}>Thumbnail</Text>
          {image ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: image }} style={styles.preview} resizeMode="cover" />
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove thumbnail" disabled={disabled || !!working} onPress={() => onChange({ image: '' })} style={styles.remove}>
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity accessibilityRole="button" disabled={disabled || !!working} onPress={() => pick('thumbnail')} style={styles.addTile}>
              {working === 'thumbnail' ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.addText}>＋ Add</Text>}
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.mediaColumn}>
          <Text style={styles.label}>Gallery ({images.length}/{MAX_IMAGES})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
            {images.map((uri, index) => (
              <View key={`${uri.slice(0, 40)}-${index}`} style={styles.imageWrap}>
                <Image source={{ uri }} style={styles.preview} resizeMode="cover" />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remove gallery image ${index + 1}`} disabled={disabled || !!working} onPress={() => removeImage(index)} style={styles.remove}>
                  <Text style={styles.removeText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < MAX_IMAGES ? (
              <TouchableOpacity accessibilityRole="button" disabled={disabled || !!working} onPress={() => pick('gallery', true, MAX_IMAGES - images.length)} style={styles.addTile}>
                {working === 'gallery' ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.addText}>＋ Add</Text>}
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 15, fontWeight: '800' },
  help: { marginTop: 3, color: colors.muted, fontSize: 10 },
  mediaRow: { marginTop: 13 },
  mediaColumn: { marginBottom: 12 },
  label: { marginBottom: 7, color: colors.text, fontSize: 12, fontWeight: '700' },
  gallery: { alignItems: 'center', gap: 8 },
  imageWrap: { position: 'relative', width: 70, height: 70 },
  preview: { width: 70, height: 70, borderRadius: 9, borderWidth: 1, borderColor: colors.border },
  remove: { position: 'absolute', top: -6, right: -6, width: 23, height: 23, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.danger },
  removeText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 20 },
  addTile: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: '#fafbfc' },
  addText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  error: { marginTop: 3, color: colors.danger, fontSize: 11, lineHeight: 16 },
});
