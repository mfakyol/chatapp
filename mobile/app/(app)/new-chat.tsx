import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useT } from '@/lib/i18n';
import { Avatar } from '@/components/avatar';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fullName } from '@/lib/utils';
import * as userService from '@/services/user.service';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import type { FriendRequests, PublicUser } from '@/types';

const SEARCH_DEBOUNCE_MS = 400;

type ContactStatus = 'me' | 'friend' | 'received' | 'sent' | 'none';

export default function NewChatScreen() {
  const t = useT();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const me = useAuthStore((s) => s.user);
  const openDirectConversation = useChatStore((s) => s.openDirectConversation);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [requests, setRequests] = useState<FriendRequests>({ received: [], sent: [] });
  const [busyUsername, setBusyUsername] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    const [friendsRes, requestsRes] = await Promise.all([
      userService.getFriends(),
      userService.getFriendRequests(),
    ]);
    if (friendsRes.success) setFriends(friendsRes.data.friends);
    if (requestsRes.success) setRequests(requestsRes.data);
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const res = await userService.searchUsers(q);
      if (res.success) setResults(res.data.users);
      setSearching(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const statusOf = (user: PublicUser): ContactStatus => {
    if (user.username === me?.username) return 'me';
    if (friends.some((f) => f.username === user.username)) return 'friend';
    if (requests.received.some((u) => u.username === user.username)) return 'received';
    if (requests.sent.some((u) => u.username === user.username)) return 'sent';
    return 'none';
  };

  const openChat = async (user: PublicUser) => {
    setBusyUsername(user.username);
    const conversationId = await openDirectConversation(user.username);
    setBusyUsername(null);
    if (conversationId) {
      if (router.canGoBack()) router.dismissAll();
      router.push({ pathname: '/chat/[id]', params: { id: conversationId } });
    }
  };

  const act = async (
    user: PublicUser,
    action: (username: string) => Promise<unknown>,
  ) => {
    setBusyUsername(user.username);
    await action(user.username);
    await loadContacts();
    setBusyUsername(null);
  };

  const renderAction = (user: PublicUser) => {
    if (busyUsername === user.username) return <ActivityIndicator size="small" />;
    switch (statusOf(user)) {
      case 'me':
        return <ThemedText style={styles.muted}>{t('contacts.you')}</ThemedText>;
      case 'friend':
        return <ThemedText style={styles.muted}>›</ThemedText>;
      case 'sent':
        return <ThemedText style={styles.muted}>{t('contacts.requestSent')}</ThemedText>;
      case 'received':
        return (
          <View style={styles.actionRow}>
            <Pressable
              style={styles.smallButton}
              onPress={() => act(user, userService.acceptFriendRequest)}
            >
              <ThemedText style={styles.smallButtonText}>{t('contacts.accept')}</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.smallButton, styles.declineButton]}
              onPress={() => act(user, userService.declineFriendRequest)}
            >
              <ThemedText style={styles.smallButtonText}>✕</ThemedText>
            </Pressable>
          </View>
        );
      case 'none':
        return (
          <Pressable
            style={styles.smallButton}
            onPress={() => act(user, userService.sendFriendRequest)}
          >
            <ThemedText style={styles.smallButtonText}>{t('contacts.sendRequest')}</ThemedText>
          </Pressable>
        );
    }
  };

  const isSearchMode = query.trim().length >= 2;
  const sections = isSearchMode
    ? [
        {
          title: searching ? t('contacts.searching') : t('contacts.results'),
          data: results,
        },
      ]
    : [
        ...(requests.received.length > 0
          ? [{ title: t('contacts.requests'), data: requests.received }]
          : []),
        { title: t('contacts.friends'), data: friends },
      ];

  return (
    <ThemedView style={styles.flex}>
      <ScreenHeader title={t('contacts.title')} />
      <TextInput
        style={[
          styles.search,
          {
            color: isDark ? '#ECEDEE' : '#11181C',
            borderColor: isDark ? '#334155' : '#CBD5E1',
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
          },
        ]}
        placeholder={t('contacts.search')}
        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
        autoCapitalize="none"
        autoCorrect={false}
        value={query}
        onChangeText={setQuery}
      />
      <Pressable
        style={({ pressed }) => [styles.groupRow, pressed && styles.rowPressed]}
        onPress={() => router.push('/new-group')}
      >
        <View style={styles.groupIcon}>
          <ThemedText style={styles.groupIconText}>👥</ThemedText>
        </View>
        <ThemedText type="defaultSemiBold" style={styles.groupText}>
          {t('contacts.newGroup')}
        </ThemedText>
        <ThemedText style={styles.muted}>›</ThemedText>
      </Pressable>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.username}
        renderSectionHeader={({ section }) => (
          <ThemedText style={styles.sectionHeader}>{section.title}</ThemedText>
        )}
        renderItem={({ item }) => {
          const friend = statusOf(item) === 'friend';
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && friend && styles.rowPressed]}
              onPress={friend ? () => openChat(item) : undefined}
            >
              <Avatar user={item} size={44} />
              <View style={styles.rowBody}>
                <ThemedText type="defaultSemiBold">{fullName(item)}</ThemedText>
                <ThemedText style={styles.username}>@{item.username}</ThemedText>
              </View>
              {renderAction(item)}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <ThemedText style={styles.empty}>
            {isSearchMode
              ? searching
                ? ''
                : t('contacts.notFound')
              : t('contacts.empty')}
          </ThemedText>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    margin: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.5,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(37,99,235,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIconText: {
    fontSize: 20,
    lineHeight: 26,
  },
  groupText: {
    flex: 1,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowBody: {
    flex: 1,
  },
  username: {
    fontSize: 13,
    opacity: 0.5,
  },
  muted: {
    opacity: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 32,
    opacity: 0.6,
  },
});
