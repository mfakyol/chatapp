import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fullName } from '@/lib/utils';
import * as userService from '@/services/user.service';
import { useAuthStore } from '@/stores/auth.store';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const [uploading, setUploading] = useState(false);

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
      <Stack.Screen
        options={{ headerShown: true, title: 'Profil', headerBackTitle: 'Geri' }}
      />
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
  logoutButton: {
    marginTop: 40,
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
