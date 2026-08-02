import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Avatar } from '@/components/avatar';
import { GroupAvatar } from '@/components/group-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fullName, userId } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';

export default function GroupInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const me = useAuthStore((s) => s.user);
  const meId = userId(me);

  const conversation = useChatStore((s) =>
    s.conversations.find((c) => c._id === id),
  );
  const updateGroup = useChatStore((s) => s.updateGroup);
  const uploadGroupAvatar = useChatStore((s) => s.uploadGroupAvatar);

  const isAdmin = conversation?.admins?.includes(meId) ?? false;

  const [name, setName] = useState(conversation?.name ?? '');
  const [description, setDescription] = useState(conversation?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!conversation) {
    return (
      <ThemedView style={styles.flex}>
        <Stack.Screen options={{ headerShown: true, title: 'Grup bilgisi' }} />
        <ActivityIndicator style={styles.loading} />
      </ThemedView>
    );
  }

  const dirty =
    name.trim() !== conversation.name ||
    description.trim() !== (conversation.description ?? '');
  const canSave = isAdmin && dirty && name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const result = await updateGroup(id, {
      name: name.trim(),
      description: description.trim(),
    });
    setSaving(false);
    if (result.error) Alert.alert('Hata', result.error);
  };

  const handleChangePhoto = async () => {
    if (!isAdmin || uploading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    setUploading(true);
    const res = await uploadGroupAvatar(id, {
      uri: asset.uri,
      name: asset.fileName ?? `group_${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    });
    setUploading(false);
    if (res.error) Alert.alert('Hata', res.error);
  };

  const inputStyle = [
    styles.input,
    {
      color: isDark ? '#ECEDEE' : '#11181C',
      borderColor: isDark ? '#334155' : '#CBD5E1',
      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
    },
  ];

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{ headerShown: true, title: 'Grup bilgisi', headerBackTitle: 'Geri' }}
      />
      <FlatList
        data={conversation.members ?? []}
        keyExtractor={(item) => item.user.username}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <Pressable onPress={handleChangePhoto} disabled={!isAdmin || uploading}>
              <GroupAvatar conversation={conversation} size={112} />
              {uploading && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </Pressable>
            {isAdmin && (
              <Pressable onPress={handleChangePhoto} disabled={uploading}>
                <ThemedText style={styles.changePhoto}>Fotoğrafı değiştir</ThemedText>
              </Pressable>
            )}

            {isAdmin ? (
              <>
                <TextInput
                  style={inputStyle}
                  value={name}
                  onChangeText={setName}
                  placeholder="Grup adı"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                />
                <TextInput
                  style={[inputStyle, styles.descriptionInput]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Grup açıklaması..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  multiline
                  maxLength={500}
                />
                {dirty && (
                  <Pressable
                    style={[styles.saveButton, !canSave && styles.saveDisabled]}
                    onPress={handleSave}
                    disabled={!canSave}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <ThemedText style={styles.saveText}>Kaydet</ThemedText>
                    )}
                  </Pressable>
                )}
              </>
            ) : (
              <>
                <ThemedText type="title" style={styles.groupName}>
                  {conversation.name}
                </ThemedText>
                {conversation.description ? (
                  <ThemedText style={styles.description}>
                    {conversation.description}
                  </ThemedText>
                ) : null}
              </>
            )}

            <ThemedText style={styles.membersHeader}>
              Üyeler ({conversation.members?.length ?? 0})
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.memberRow, pressed && styles.memberPressed]}
            onPress={() =>
              router.push({
                pathname: '/user/[username]',
                params: { username: item.user.username },
              })
            }
          >
            <Avatar user={item.user} size={44} />
            <View style={styles.memberBody}>
              <ThemedText type="defaultSemiBold">
                {fullName(item.user)}
                {userId(item.user) === meId ? ' (sen)' : ''}
              </ThemedText>
              {item.user.bio ? (
                <ThemedText style={styles.memberBio} numberOfLines={1}>
                  {item.user.bio}
                </ThemedText>
              ) : (
                <ThemedText style={styles.memberBio}>@{item.user.username}</ThemedText>
              )}
            </View>
            {item.role === 'admin' && (
              <View style={styles.adminBadge}>
                <ThemedText style={styles.adminBadgeText}>admin</ThemedText>
              </View>
            )}
          </Pressable>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    marginTop: 48,
  },
  headerArea: {
    alignItems: 'center',
    padding: 24,
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
  input: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginTop: 8,
  },
  descriptionInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  saveButton: {
    alignSelf: 'stretch',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: '#fff',
    fontWeight: '600',
  },
  groupName: {
    marginTop: 8,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 16,
  },
  membersHeader: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.5,
    textTransform: 'uppercase',
    marginTop: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  memberPressed: {
    opacity: 0.6,
  },
  memberBody: {
    flex: 1,
  },
  memberBio: {
    fontSize: 13,
    opacity: 0.5,
  },
  adminBadge: {
    backgroundColor: 'rgba(37,99,235,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  adminBadgeText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
});
