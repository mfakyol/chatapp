import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { Avatar } from '@/components/avatar';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fullName } from '@/lib/utils';
import * as userService from '@/services/user.service';
import { useAuthStore } from '@/stores/auth.store';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const [uploading, setUploading] = useState(false);
  const [bio, setBio] = useState(user?.bio ?? '');
  const [savingBio, setSavingBio] = useState(false);

  const bioDirty = bio.trim() !== (user?.bio ?? '');

  const handleSaveBio = async () => {
    if (!bioDirty || savingBio) return;
    setSavingBio(true);
    const res = await userService.updateProfile(bio.trim());
    setSavingBio(false);
    if (res.success) {
      setUser(res.data.user);
    } else {
      Alert.alert('Hata', res.error);
    }
  };

  const handleChangeAvatar = async () => {
    if (uploading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    setUploading(true);
    const res = await userService.uploadAvatar({
      uri: asset.uri,
      name: asset.fileName ?? `avatar_${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    });
    setUploading(false);

    if (res.success) {
      setUser(res.data.user);
    } else {
      Alert.alert('Hata', res.error);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <ScreenHeader title="Profil" />
      <ThemedView style={styles.container}>
        <Pressable onPress={handleChangeAvatar} disabled={uploading}>
          <Avatar user={user} size={112} />
          {uploading && (
            <ThemedView style={styles.avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </ThemedView>
          )}
        </Pressable>
        <Pressable onPress={handleChangeAvatar} disabled={uploading}>
          <ThemedText style={styles.changePhoto}>Fotoğrafı değiştir</ThemedText>
        </Pressable>

        <ThemedText type="title" style={styles.name}>
          {fullName(user)}
        </ThemedText>
        <ThemedText style={styles.username}>@{user?.username}</ThemedText>

        <TextInput
          style={[
            styles.bioInput,
            {
              color: isDark ? '#ECEDEE' : '#11181C',
              borderColor: isDark ? '#334155' : '#CBD5E1',
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            },
          ]}
          placeholder="Kendinden bahset..."
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={160}
        />
        {bioDirty && (
          <Pressable
            style={[styles.saveBio, savingBio && styles.saveBioDisabled]}
            onPress={handleSaveBio}
            disabled={savingBio}
          >
            {savingBio ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={styles.saveBioText}>Bio'yu kaydet</ThemedText>
            )}
          </Pressable>
        )}

        <Link href="/settings" style={styles.settingsLink}>
          <ThemedText style={styles.settingsText}>⚙️ Ayarlar</ThemedText>
        </Link>

        <Pressable style={styles.logoutButton} onPress={logout}>
          <ThemedText style={styles.logoutText}>Çıkış yap</ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 48,
    gap: 8,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 56,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhoto: {
    color: '#2563EB',
    marginTop: 4,
  },
  name: {
    marginTop: 16,
  },
  username: {
    opacity: 0.5,
  },
  bioInput: {
    alignSelf: 'stretch',
    marginHorizontal: 24,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  saveBio: {
    marginTop: 8,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  saveBioDisabled: {
    opacity: 0.5,
  },
  saveBioText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  settingsLink: {
    marginTop: 24,
  },
  settingsText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#EF4444',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
});
