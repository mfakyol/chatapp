import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { conversationTitle, formatListTime, otherParticipant, userId } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import type { Conversation } from '@/types';

export default function ConversationsScreen() {
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const conversations = useChatStore((s) => s.conversations);
  const refreshing = useChatStore((s) => s.refreshing);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const conversationsLoaded = useChatStore((s) => s.conversationsLoaded);

  const meId = userId(me);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const renderItem = ({ item }: { item: Conversation }) => {
    const title = conversationTitle(item, meId);
    const avatarUser = item.isGroup ? undefined : otherParticipant(item, meId);
    const last = item.lastMessage;
    const preview = last
      ? last.deletedAt
        ? 'Mesaj silindi'
        : last.attachment
          ? `📎 ${last.attachment.fileName}`
          : last.content
      : 'Henüz mesaj yok';

    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() =>
          router.push({ pathname: '/chat/[id]', params: { id: item._id } })
        }
      >
        <Avatar user={avatarUser} size={52} />
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.title}>
              {title}
            </ThemedText>
            <ThemedText style={styles.time}>{formatListTime(last?.createdAt)}</ThemedText>
          </View>
          <View style={styles.rowBottom}>
            <ThemedText numberOfLines={1} style={styles.preview}>
              {preview}
            </ThemedText>
            {(item.unreadCount ?? 0) > 0 && (
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>{item.unreadCount}</ThemedText>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title">Sohbetler</ThemedText>
          <Pressable onPress={logout} hitSlop={12}>
            <ThemedText style={styles.logout}>Çıkış</ThemedText>
          </Pressable>
        </View>

        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadConversations} />
          }
          ListEmptyComponent={
            conversationsLoaded ? (
              <ThemedText style={styles.empty}>
                Henüz sohbetin yok. Web uygulamasından bir sohbet başlat!
              </ThemedText>
            ) : null
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logout: {
    color: '#EF4444',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
  },
  time: {
    fontSize: 12,
    opacity: 0.5,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  preview: {
    flex: 1,
    fontSize: 14,
    opacity: 0.6,
  },
  badge: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    marginTop: 48,
    opacity: 0.6,
    paddingHorizontal: 32,
  },
});
