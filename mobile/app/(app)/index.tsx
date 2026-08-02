import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useT } from '@/lib/i18n';
import { Avatar } from '@/components/avatar';
import { GroupAvatar } from '@/components/group-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { conversationTitle, formatListTime, otherParticipant, userId } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import type { Conversation } from '@/types';

export default function ConversationsScreen() {
  const t = useT();
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
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
        ? t('chats.messageDeleted')
        : (last.attachments?.length ?? 0) > 1
          ? t('chats.photos', { n: last.attachments!.length })
          : last.attachment
            ? last.content || `📎 ${last.attachment.fileName}`
            : last.content
      : t('chats.noMessages');

    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() =>
          router.push({ pathname: '/chat/[id]', params: { id: item._id } })
        }
      >
        {item.isGroup ? (
          <GroupAvatar conversation={item} size={52} />
        ) : (
          <View>
            <Avatar user={avatarUser} size={52} />
            {avatarUser?.isOnline && <View style={styles.onlineDot} />}
          </View>
        )}
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
          <ThemedText type="title">{t('chats.title')}</ThemedText>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/new-chat')} hitSlop={12}>
              <ThemedText style={styles.newChat}>＋ {t('chats.new')}</ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push('/profile')} hitSlop={8}>
              <Avatar user={me} size={36} />
            </Pressable>
          </View>
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
              <ThemedText style={styles.empty}>{t('chats.empty')}</ThemedText>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  newChat: {
    color: '#2563EB',
    fontWeight: '600',
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
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#fff',
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
