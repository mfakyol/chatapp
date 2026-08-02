import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fullName } from '@/lib/utils';
import * as userService from '@/services/user.service';
import { useChatStore } from '@/stores/chat.store';
import type { PublicUser } from '@/types';

const MIN_MEMBERS = 1;

export default function NewGroupScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const createGroup = useChatStore((s) => s.createGroup);

  const [name, setName] = useState('');
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    userService.getFriends().then((res) => {
      if (res.success) setFriends(res.data.friends);
    });
  }, []);

  const toggle = (username: string) => {
    setSelected((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username],
    );
  };

  const canCreate = name.trim().length > 0 && selected.length >= MIN_MEMBERS && !creating;

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    const result = await createGroup(name.trim(), selected);
    setCreating(false);
    if (result.id) {
      router.replace({ pathname: '/chat/[id]', params: { id: result.id } });
    } else {
      setError(result.error ?? 'Grup oluşturulamadı');
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{ headerShown: true, title: 'Yeni grup', headerBackTitle: 'Geri' }}
      />
      <TextInput
        style={[
          styles.nameInput,
          {
            color: isDark ? '#ECEDEE' : '#11181C',
            borderColor: isDark ? '#334155' : '#CBD5E1',
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
          },
        ]}
        placeholder="Grup adı"
        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
        value={name}
        onChangeText={setName}
      />

      <ThemedText style={styles.hint}>
        En az {MIN_MEMBERS} arkadaş seç ({selected.length} seçili)
      </ThemedText>

      <FlatList
        data={friends}
        keyExtractor={(item) => item.username}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.username);
          return (
            <Pressable style={styles.row} onPress={() => toggle(item.username)}>
              <Avatar user={item} size={44} />
              <View style={styles.rowBody}>
                <ThemedText type="defaultSemiBold">{fullName(item)}</ThemedText>
                <ThemedText style={styles.username}>@{item.username}</ThemedText>
              </View>
              <View
                style={[
                  styles.checkbox,
                  isDark && styles.checkboxDark,
                  isSelected && styles.checkboxSelected,
                ]}
              >
                {isSelected && <ThemedText style={styles.checkmark}>✓</ThemedText>}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <ThemedText style={styles.empty}>
            Grup kurmak için önce arkadaş eklemelisin.
          </ThemedText>
        }
      />

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      <Pressable
        style={[styles.createButton, !canCreate && styles.createDisabled]}
        onPress={handleCreate}
        disabled={!canCreate}
      >
        {creating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.createText}>Grubu kur</ThemedText>
        )}
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    margin: 16,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    opacity: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowBody: {
    flex: 1,
  },
  username: {
    fontSize: 13,
    opacity: 0.5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDark: {
    borderColor: '#334155',
  },
  checkboxSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 32,
    opacity: 0.6,
  },
  error: {
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  createButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  createDisabled: {
    opacity: 0.5,
  },
  createText: {
    color: '#fff',
    fontWeight: '600',
  },
});
