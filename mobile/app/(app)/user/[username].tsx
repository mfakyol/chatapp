import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatLastSeen, fullName } from '@/lib/utils';
import * as userService from '@/services/user.service';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import type { PublicUser } from '@/types';

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();

  const me = useAuthStore((s) => s.user);
  const isMe = me?.username === username;

  const userFromStore = useChatStore((s) => {
    for (const c of s.conversations) {
      const found = c.participants.find((p) => p.username === username);
      if (found) return found;
    }
    return undefined;
  });

  const [fetched, setFetched] = useState<PublicUser | null>(null);
  const [opening, setOpening] = useState(false);
  const openDirectConversation = useChatStore((s) => s.openDirectConversation);

  useEffect(() => {
    if (userFromStore || isMe) return;
    userService.searchUsers(username).then((res) => {
      if (res.success) {
        const match = res.data.users.find((u) => u.username === username);
        if (match) setFetched(match);
      }
    });
  }, [username, userFromStore, isMe]);

  const user = isMe ? me : (userFromStore ?? fetched);

  const handleMessage = async () => {
    if (opening) return;
    setOpening(true);
    const conversationId = await openDirectConversation(username);
    setOpening(false);
    if (conversationId) {
      if (router.canGoBack()) router.dismissAll();
      router.push({ pathname: '/chat/[id]', params: { id: conversationId } });
    }
  };

  if (!user) {
    return (
      <ThemedView style={styles.flex}>
        <ScreenHeader title={`@${username}`} />
        <ActivityIndicator style={styles.loading} />
      </ThemedView>
    );
  }

  const presenceText = user.isOnline
    ? 'çevrimiçi'
    : user.lastSeen
      ? `son görülme: ${formatLastSeen(user.lastSeen)}`
      : null;

  return (
    <ThemedView style={styles.flex}>
      <ScreenHeader title={`@${user.username}`} />
      <ThemedView style={styles.container}>
        <Avatar user={user} size={112} />
        <ThemedText type="title" style={styles.name}>
          {fullName(user)}
        </ThemedText>
        <ThemedText style={styles.username}>@{user.username}</ThemedText>
        {presenceText && (
          <ThemedText style={[styles.presence, user.isOnline && styles.online]}>
            {presenceText}
          </ThemedText>
        )}

        {user.bio ? (
          <ThemedText style={styles.bio}>{user.bio}</ThemedText>
        ) : (
          <ThemedText style={styles.noBio}>Henüz bio eklememiş.</ThemedText>
        )}

        {!isMe && (
          <Pressable
            style={[styles.messageButton, opening && styles.messageDisabled]}
            onPress={handleMessage}
            disabled={opening}
          >
            {opening ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.messageText}>Mesaj gönder</ThemedText>
            )}
          </Pressable>
        )}
      </ThemedView>
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
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
    gap: 4,
  },
  name: {
    marginTop: 16,
    textAlign: 'center',
  },
  username: {
    opacity: 0.5,
  },
  presence: {
    fontSize: 13,
    opacity: 0.6,
  },
  online: {
    color: '#22C55E',
    opacity: 1,
  },
  bio: {
    marginTop: 16,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
  },
  noBio: {
    marginTop: 16,
    fontStyle: 'italic',
    opacity: 0.4,
  },
  messageButton: {
    marginTop: 32,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  messageDisabled: {
    opacity: 0.5,
  },
  messageText: {
    color: '#fff',
    fontWeight: '600',
  },
});
