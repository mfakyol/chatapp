import { MaterialIcons } from '@expo/vector-icons';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/lib/i18n';
import { Avatar } from '@/components/avatar';
import { GroupAvatar } from '@/components/group-avatar';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ZoomableImage } from '@/components/zoomable-image';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { emitTyping } from '@/services/chatSocket.service';
import {
  conversationTitle,
  fileUrl,
  formatDayLabel,
  formatLastSeen,
  formatMessageTime,
  fullName,
  isSameDay,
  messageImages,
  otherParticipant,
  userId,
} from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import type { Message } from '@/types';

const NO_MESSAGES: Message[] = [];
const NO_TYPING: string[] = [];

type ChatListItem =
  | { type: 'message'; message: Message }
  | { type: 'day'; date: string };
const TYPING_IDLE_MS = 3000;
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function ChatScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const previewImageSize = (windowWidth - 16 * 2 - 8) / 2;
  const bubbleMaxWidth = Math.round(windowWidth * 0.8);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const me = useAuthStore((s) => s.user);
  const meId = userId(me);

  const conversation = useChatStore((s) =>
    s.conversations.find((c) => c._id === id),
  );
  const messages = useChatStore((s) => s.messagesByConversation[id] ?? NO_MESSAGES);
  const typingUserIds = useChatStore((s) => s.typingByConversation[id] ?? NO_TYPING);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages);
  const loadingOlder = useChatStore((s) => s.loadingOlder[id] === true);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const sendAttachment = useChatStore((s) => s.sendAttachment);
  const reactToMessage = useChatStore((s) => s.reactToMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const markRead = useChatStore((s) => s.markRead);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [infoMessage, setInfoMessage] = useState<Message | null>(null);

  const typingSent = useRef(false);
  const typingIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [floatingDay, setFloatingDay] = useState<string | null>(null);
  const hideDayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topItemDateRef = useRef<string | null>(null);
  const atBottomRef = useRef(true);
  const separatorVisibleRef = useRef(false);
  const listLenRef = useRef(0);
  const listRef = useRef<FlashListRef<ChatListItem>>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const firstNewIdRef = useRef<string | null>(null);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    lastMessageIdRef.current = null;
    firstNewIdRef.current = null;
    setNewCount(0);
  }, [id]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    if (lastMessageIdRef.current && lastMessageIdRef.current !== last._id) {
      if (userId(last.sender) === meId) {
        firstNewIdRef.current = null;
        setNewCount(0);
        requestAnimationFrame(() => {
          listRef.current?.scrollToEnd({ animated: false });
        });
      } else if (!atBottomRef.current) {
        if (!firstNewIdRef.current) firstNewIdRef.current = last._id;
        setNewCount((count) => count + 1);
      }
    }
    lastMessageIdRef.current = last._id;
  }, [messages, meId]);

  const jumpToNewMessages = () => {
    const targetId = firstNewIdRef.current;
    if (targetId) {
      const index = listItems.findIndex(
        (entry) => entry.type === 'message' && entry.message._id === targetId,
      );
      if (index >= 0) {
        listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.1 });
      } else {
        listRef.current?.scrollToEnd({ animated: true });
      }
    } else {
      listRef.current?.scrollToEnd({ animated: true });
    }
    firstNewIdRef.current = null;
    setNewCount(0);
  };

  const onViewableItemsChanged = useRef(
    ({
      viewableItems,
    }: {
      viewableItems: { index: number | null; item: ChatListItem }[];
    }) => {
      if (viewableItems.length === 0) return;
      atBottomRef.current = viewableItems.some(
        (v) => v.index === listLenRef.current - 1,
      );
      if (atBottomRef.current) {
        firstNewIdRef.current = null;
        setNewCount(0);
      }
      let top = viewableItems[0];
      for (const v of viewableItems) {
        if ((v.index ?? Infinity) < (top.index ?? Infinity)) top = v;
      }
      const topDate =
        top.item.type === 'message' ? top.item.message.createdAt : top.item.date;
      topItemDateRef.current = topDate;
      separatorVisibleRef.current = viewableItems.some(
        (v) => v.item.type === 'day' && isSameDay(v.item.date, topDate),
      );
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10 }).current;

  const handleListScroll = () => {
    if (hideDayTimer.current) clearTimeout(hideDayTimer.current);
    const topDate = topItemDateRef.current;
    if (atBottomRef.current || separatorVisibleRef.current || !topDate) {
      setFloatingDay(null);
    } else {
      setFloatingDay(formatDayLabel(topDate));
      hideDayTimer.current = setTimeout(() => setFloatingDay(null), 1500);
    }
  };

  useEffect(() => {
    return () => {
      if (hideDayTimer.current) clearTimeout(hideDayTimer.current);
    };
  }, []);

  const stopTyping = useCallback(() => {
    if (typingIdleTimer.current) {
      clearTimeout(typingIdleTimer.current);
      typingIdleTimer.current = null;
    }
    if (typingSent.current) {
      typingSent.current = false;
      emitTyping(id, false);
    }
  }, [id]);

  useEffect(() => {
    loadMessages(id);
    return stopTyping;
  }, [id, loadMessages, stopTyping]);

  useFocusEffect(
    useCallback(() => {
      setActiveConversation(id);
      markRead(id);
      return () => setActiveConversation(null);
    }, [id, markRead, setActiveConversation]),
  );

  const listItems = useMemo(() => {
    const out: ChatListItem[] = [];
    messages.forEach((message, index) => {
      const prev = messages[index - 1];
      if (!prev || !isSameDay(prev.createdAt, message.createdAt)) {
        out.push({ type: 'day', date: message.createdAt });
      }
      out.push({ type: 'message', message });
    });
    return out;
  }, [messages]);
  listLenRef.current = listItems.length;

  const othersReadAt = useMemo(() => {
    const others =
      conversation?.members?.filter((m) => userId(m.user) !== meId) ?? [];
    if (others.length === 0) return null;
    return Math.min(...others.map((m) => new Date(m.lastReadAt).getTime()));
  }, [conversation, meId]);

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [pendingImages, setPendingImages] = useState<
    ImagePicker.ImagePickerAsset[] | null
  >(null);
  const [caption, setCaption] = useState('');

  const galleryItems = useMemo(
    () =>
      messages.flatMap((m) =>
        messageImages(m).map((att, index) => ({
          key: `${m._id}:${index}`,
          uri: fileUrl(att.url),
          sender: m.sender,
          createdAt: m.createdAt,
        })),
      ),
    [messages],
  );
  const viewerItem = viewerIndex !== null ? galleryItems[viewerIndex] : null;

  const openViewer = (messageId: string, imageIndex: number) => {
    const index = galleryItems.findIndex(
      (g) => g.key === `${messageId}:${imageIndex}`,
    );
    if (index >= 0) setViewerIndex(index);
  };

  const typingNames = useMemo(() => {
    if (!conversation) return [];
    return typingUserIds
      .map((uid) => conversation.participants.find((p) => userId(p) === uid))
      .filter(Boolean)
      .map((p) => p!.firstName);
  }, [typingUserIds, conversation]);

  const handleChangeText = (text: string) => {
    setDraft(text);
    if (!text.trim()) {
      stopTyping();
      return;
    }
    if (!typingSent.current) {
      typingSent.current = true;
      emitTyping(id, true);
    }
    if (typingIdleTimer.current) clearTimeout(typingIdleTimer.current);
    typingIdleTimer.current = setTimeout(() => {
      typingSent.current = false;
      emitTyping(id, false);
    }, TYPING_IDLE_MS);
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    stopTyping();
    const ok = editing
      ? await editMessage(id, editing._id, content)
      : await sendMessage(id, content);
    if (ok) {
      setDraft('');
      setEditing(null);
    }
    setSending(false);
  };

  const closeMenu = () => setSelected(null);

  const handleReact = (emoji: string) => {
    if (selected) reactToMessage(id, selected._id, emoji);
    closeMenu();
  };

  const startEdit = () => {
    if (selected) {
      setEditing(selected);
      setDraft(selected.content);
    }
    closeMenu();
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft('');
  };

  const confirmDelete = () => {
    const message = selected;
    closeMenu();
    if (!message) return;
    Alert.alert(t('chat.deleteTitle'), t('chat.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteMessage(id, message._id),
      },
    ]);
  };

  const handlePickImage = async () => {
    if (uploading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    setCaption('');
    setPendingImages(result.assets);
  };

  const handleSendImages = async () => {
    if (!pendingImages || uploading) return;
    setUploading(true);

    const files: { uri: string; name: string; type: string }[] = [];
    let unreadable = 0;
    for (const [index, asset] of pendingImages.entries()) {
      if (Platform.OS !== 'web') {
        try {
          const info = await FileSystem.getInfoAsync(asset.uri);
          if (!info.exists || (info.size ?? 0) === 0) {
            unreadable += 1;
            continue;
          }
        } catch {
          unreadable += 1;
          continue;
        }
      }
      files.push({
        uri: asset.uri,
        name: asset.fileName ?? `photo_${index}_${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      });
    }

    if (files.length === 0) {
      setUploading(false);
      Alert.alert(t('common.error'), t('chat.imagesUnreadable', { n: unreadable }));
      return;
    }

    const ok = await sendAttachment(id, files, caption.trim() || undefined);
    setUploading(false);
    if (ok) {
      setPendingImages(null);
      setCaption('');
      if (unreadable > 0) {
        Alert.alert(t('common.error'), t('chat.imagesUnreadable', { n: unreadable }));
      }
    }
  };

  const renderItem = ({ item: entry }: { item: ChatListItem }) => {
    if (entry.type === 'day') {
      return (
        <View style={styles.dayLabelRow}>
          <View style={[styles.dayChip, isDark && styles.dayChipDark]}>
            <ThemedText style={styles.dayChipText}>
              {formatDayLabel(entry.date)}
            </ThemedText>
          </View>
        </View>
      );
    }
    const item = entry.message;
    const mine = userId(item.sender) === meId;
    const images = messageImages(item);
    const hasImages = images.length > 0;
    const seen =
      mine &&
      othersReadAt !== null &&
      new Date(item.createdAt).getTime() <= othersReadAt;
    return (
      <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
        <Pressable
          onLongPress={() => {
            if (!item.deletedAt) setSelected(item);
          }}
          delayLongPress={300}
          style={[
            styles.bubble,
            { maxWidth: bubbleMaxWidth },
            mine
              ? styles.bubbleMine
              : [styles.bubbleTheirs, isDark && styles.bubbleTheirsDark],
            hasImages && styles.bubbleImage,
          ]}
        >
          {!mine && conversation?.isGroup && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/user/[username]',
                  params: { username: item.sender.username },
                })
              }
              hitSlop={4}
            >
              <ThemedText style={styles.sender}>{fullName(item.sender)}</ThemedText>
            </Pressable>
          )}
          {item.deletedAt ? (
            <ThemedText style={[styles.deleted, mine && styles.textMine]}>
              {t('chat.deletedMessage')}
            </ThemedText>
          ) : (
            <>
              {images.length === 1 && (
                <Pressable
                  style={styles.attachmentImageWrap}
                  onPress={() => openViewer(item._id, 0)}
                  onLongPress={() => setSelected(item)}
                  delayLongPress={300}
                >
                  <Image
                    source={{ uri: fileUrl(images[0].url) }}
                    style={styles.attachmentImage}
                    contentFit="cover"
                  />
                </Pressable>
              )}
              {images.length > 1 && (
                <View style={styles.imageGrid}>
                  {images.slice(0, 4).map((att, index) => {
                    const hiddenCount =
                      index === 3 && images.length > 4 ? images.length - 4 : 0;
                    return (
                      <Pressable
                        key={index}
                        style={styles.gridImageWrap}
                        onPress={() => openViewer(item._id, index)}
                        onLongPress={() => setSelected(item)}
                        delayLongPress={300}
                      >
                        <Image
                          source={{ uri: fileUrl(att.url) }}
                          style={styles.gridImage}
                          contentFit="cover"
                        />
                        {hiddenCount > 0 && (
                          <View style={styles.moreOverlay}>
                            <ThemedText style={styles.moreOverlayText}>
                              +{hiddenCount}
                            </ThemedText>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {!hasImages && item.attachment && (
                <ThemedText style={mine ? styles.textMine : undefined}>
                  📎 {item.attachment.fileName}
                </ThemedText>
              )}
              {item.content ? (
                <ThemedText
                  style={[mine && styles.textMine, hasImages && styles.captionText]}
                >
                  {item.content}
                </ThemedText>
              ) : null}
            </>
          )}
          {!item.deletedAt && (item.reactions?.length ?? 0) > 0 && (
            <View style={styles.reactionsRow}>
              {item.reactions!.map((r) => (
                <Pressable
                  key={r.emoji}
                  onPress={() => reactToMessage(id, item._id, r.emoji)}
                  style={[
                    styles.reactionChip,
                    r.users.includes(meId) && styles.reactionChipMine,
                  ]}
                >
                  <ThemedText style={styles.reactionText}>
                    {r.emoji} {r.users.length}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.timeRow}>
            <ThemedText style={[styles.time, mine && styles.timeMine]}>
              {formatMessageTime(item.createdAt)}
              {item.editedAt ? t('chat.edited') : ''}
            </ThemedText>
            {mine && !item.deletedAt && (
              <MaterialIcons
                name={seen ? 'done-all' : 'done'}
                size={13}
                color={seen ? '#38BDF8' : '#DBEAFE'}
              />
            )}
          </View>
        </Pressable>
      </View>
    );
  };

  const other =
    conversation && !conversation.isGroup
      ? otherParticipant(conversation, meId)
      : undefined;
  const title = conversation ? conversationTitle(conversation, meId) : t('chat.title');
  const subtitle = conversation
    ? typingNames.length > 0
      ? conversation.isGroup
        ? t('chat.typing', { names: typingNames.join(', ') })
        : t('chat.typingSolo')
      : conversation.isGroup
        ? t('chat.members', {
            n: conversation.members?.length ?? conversation.participants.length,
          })
        : other?.isOnline
          ? t('chat.online')
          : other?.lastSeen
            ? t('chat.lastSeen', { time: formatLastSeen(other.lastSeen) })
            : null
    : null;

  const openInfo = () => {
    if (!conversation) return;
    if (conversation.isGroup) {
      router.push({ pathname: '/group/[id]', params: { id } });
    } else if (other) {
      router.push({
        pathname: '/user/[username]',
        params: { username: other.username },
      });
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScreenHeader
          backTo="/"
          title={title}
          subtitle={subtitle}
          subtitleStyle={
            typingNames.length > 0 || (!conversation?.isGroup && other?.isOnline)
              ? styles.subtitleOnline
              : undefined
          }
          avatar={
            conversation?.isGroup ? (
              <GroupAvatar conversation={conversation} size={38} />
            ) : (
              <Avatar user={other} size={38} />
            )
          }
          onBodyPress={conversation ? openInfo : undefined}
        />
        <View style={styles.listWrap}>
        <FlashList
          ref={listRef}
          data={listItems}
          keyExtractor={(entry) =>
            entry.type === 'day' ? `day:${entry.date}` : entry.message._id
          }
          renderItem={renderItem}
          maintainVisibleContentPosition={{
            startRenderingFromBottom: true,
            autoscrollToBottomThreshold: 0.2,
            animateAutoScrollToBottom: false,
          }}
          contentContainerStyle={styles.listContent}
          onStartReached={() => loadOlderMessages(id)}
          onStartReachedThreshold={0.4}
          onScroll={handleListScroll}
          scrollEventThrottle={64}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListHeaderComponent={
            loadingOlder ? <ActivityIndicator style={styles.olderSpinner} /> : null
          }
        />
        {floatingDay && (
          <View style={styles.floatingDay} pointerEvents="none">
            <View
              style={[styles.dayChip, styles.dayChipSolid, isDark && styles.dayChipSolidDark]}
            >
              <ThemedText style={styles.dayChipText}>{floatingDay}</ThemedText>
            </View>
          </View>
        )}
        {newCount > 0 && (
          <Pressable style={styles.newMessagesButton} onPress={jumpToNewMessages}>
            <MaterialIcons name="arrow-downward" size={20} color="#fff" />
            <View style={styles.newMessagesBadge}>
              <ThemedText style={styles.newMessagesBadgeText}>{newCount}</ThemedText>
            </View>
          </Pressable>
        )}
        </View>

        <SafeAreaView edges={['bottom']}>
          {editing && (
            <View style={[styles.editBanner, isDark && styles.editBannerDark]}>
              <ThemedText numberOfLines={1} style={styles.editBannerText}>
                {t('chat.editing', { text: editing.content })}
              </ThemedText>
              <Pressable onPress={cancelEdit} hitSlop={12}>
                <ThemedText style={styles.editBannerClose}>✕</ThemedText>
              </Pressable>
            </View>
          )}
          <View style={styles.inputBar}>
            <Pressable
              style={[styles.attachButton, uploading && styles.sendDisabled]}
              onPress={handlePickImage}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" />
              ) : (
                <ThemedText style={styles.attachText}>＋</ThemedText>
              )}
            </Pressable>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={draft}
              onChangeText={handleChangeText}
              multiline
            />
            <Pressable
              style={[styles.sendButton, (!draft.trim() || sending) && styles.sendDisabled]}
              onPress={handleSend}
              disabled={!draft.trim() || sending}
            >
              <ThemedText style={styles.sendText}>➤</ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeMenu}>
          <View style={[styles.menu, isDark && styles.menuDark]}>
            <View style={styles.emojiRow}>
              {REACTION_EMOJIS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => handleReact(emoji)}
                  style={styles.emojiButton}
                >
                  <ThemedText style={styles.emoji}>{emoji}</ThemedText>
                </Pressable>
              ))}
            </View>
            {selected && userId(selected.sender) === meId && (
              <>
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setInfoMessage(selected);
                    closeMenu();
                  }}
                >
                  <ThemedText>{t('chat.info')}</ThemedText>
                </Pressable>
                {!selected.attachment && (
                  <Pressable style={styles.menuItem} onPress={startEdit}>
                    <ThemedText>{t('chat.edit')}</ThemedText>
                  </Pressable>
                )}
                <Pressable style={styles.menuItem} onPress={confirmDelete}>
                  <ThemedText style={styles.menuDanger}>{t('common.delete')}</ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={infoMessage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoMessage(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setInfoMessage(null)}>
          <View style={[styles.menu, isDark && styles.menuDark]}>
            <ThemedText type="defaultSemiBold" style={styles.menuTitle}>
              {t('chat.infoTitle')}
            </ThemedText>
            {infoMessage && (
              <View style={styles.infoBody}>
                <ThemedText style={styles.infoLabel}>{t('chat.sentAt')}</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {formatDayLabel(infoMessage.createdAt)}{' '}
                  {formatMessageTime(infoMessage.createdAt)}
                </ThemedText>

                {infoMessage.editedAt ? (
                  <>
                    <ThemedText style={styles.infoLabel}>
                      {t('chat.editedAtLabel')}
                    </ThemedText>
                    <ThemedText style={styles.infoValue}>
                      {formatDayLabel(infoMessage.editedAt)}{' '}
                      {formatMessageTime(infoMessage.editedAt)}
                    </ThemedText>
                  </>
                ) : null}

                {(() => {
                  const others =
                    conversation?.members?.filter((m) => userId(m.user) !== meId) ??
                    [];
                  const sentTime = new Date(infoMessage.createdAt).getTime();
                  const seen = others.filter(
                    (m) => new Date(m.lastReadAt).getTime() >= sentTime,
                  );
                  const unseen = others.filter(
                    (m) => new Date(m.lastReadAt).getTime() < sentTime,
                  );
                  if (!conversation?.isGroup) {
                    const seenAt = seen[0]?.lastReadAt;
                    return (
                      <>
                        <ThemedText style={styles.infoLabel}>
                          {t('chat.seenAt')}
                        </ThemedText>
                        <ThemedText style={styles.infoValue}>
                          {seenAt ? formatLastSeen(seenAt) : t('chat.notSeenYet')}
                        </ThemedText>
                      </>
                    );
                  }
                  return (
                    <>
                      <ThemedText style={styles.infoLabel}>
                        {t('chat.seenBy', { n: seen.length })}
                      </ThemedText>
                      {seen.length === 0 && (
                        <ThemedText style={styles.infoValue}>
                          {t('chat.notSeenYet')}
                        </ThemedText>
                      )}
                      {seen.map((m) => (
                        <View key={m.user.username} style={styles.infoRow}>
                          <Avatar user={m.user} size={28} />
                          <ThemedText style={styles.infoName} numberOfLines={1}>
                            {fullName(m.user)}
                          </ThemedText>
                          <ThemedText style={styles.infoTime}>
                            {formatLastSeen(m.lastReadAt)}
                          </ThemedText>
                        </View>
                      ))}
                      {unseen.length > 0 && (
                        <>
                          <ThemedText style={styles.infoLabel}>
                            {t('chat.notSeenBy')}
                          </ThemedText>
                          {unseen.map((m) => (
                            <View key={m.user.username} style={styles.infoRow}>
                              <Avatar user={m.user} size={28} />
                              <ThemedText
                                style={styles.infoName}
                                numberOfLines={1}
                              >
                                {fullName(m.user)}
                              </ThemedText>
                            </View>
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}
              </View>
            )}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={pendingImages !== null}
        animationType="slide"
        onRequestClose={() => setPendingImages(null)}
      >
        <ThemedView
          style={[
            styles.flex,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <View style={styles.previewHeader}>
            <Pressable
              onPress={() => setPendingImages(null)}
              hitSlop={12}
              disabled={uploading}
            >
              <ThemedText style={styles.previewCancelText}>{t('common.cancel')}</ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold">
              {t('chat.photosCount', { n: pendingImages?.length ?? 0 })}
            </ThemedText>
            <View style={styles.previewHeaderSpacer} />
          </View>

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <FlatList
              style={styles.flex}
              data={pendingImages ?? []}
              keyExtractor={(asset, index) => asset.assetId ?? asset.uri ?? String(index)}
              numColumns={2}
              contentContainerStyle={styles.previewGridContent}
              columnWrapperStyle={styles.previewGridRow}
              renderItem={({ item: asset }) => (
                <View
                  style={[
                    styles.previewImageWrap,
                    { width: previewImageSize, height: previewImageSize },
                  ]}
                >
                  <Image
                    source={{ uri: asset.uri }}
                    style={styles.previewImage}
                    contentFit="cover"
                  />
                </View>
              )}
            />

            <View style={styles.inputBar}>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder={t('chat.addCaption')}
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={caption}
                onChangeText={setCaption}
                multiline
              />
              <Pressable
                style={[styles.sendButton, uploading && styles.sendDisabled]}
                onPress={handleSendImages}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.sendText}>➤</ThemedText>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </ThemedView>
      </Modal>

      <Modal
        visible={viewerIndex !== null}
        animationType="fade"
        onRequestClose={() => setViewerIndex(null)}
      >
        <GestureHandlerRootView
          style={[
            styles.viewer,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <View style={styles.viewerSafe}>
            <View style={styles.viewerTop}>
              <Pressable
                onPress={() => setViewerIndex(null)}
                hitSlop={12}
                style={styles.viewerCloseButton}
              >
                <ThemedText style={styles.viewerClose}>✕</ThemedText>
              </Pressable>
              {viewerItem && (
                <ThemedText style={styles.viewerCaption} numberOfLines={1}>
                  {fullName(viewerItem.sender)} ·{' '}
                  {formatMessageTime(viewerItem.createdAt)}
                </ThemedText>
              )}
            </View>

            {viewerItem && <ZoomableImage key={viewerItem.key} uri={viewerItem.uri} />}

            <FlatList
              horizontal
              data={galleryItems}
              keyExtractor={(g) => g.key}
              style={styles.thumbStrip}
              contentContainerStyle={styles.thumbContent}
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={viewerIndex ?? 0}
              getItemLayout={(_, index) => ({
                length: 66,
                offset: 66 * index,
                index,
              })}
              renderItem={({ item: g, index }) => (
                <Pressable
                  onPress={() => setViewerIndex(index)}
                  style={[
                    styles.thumbWrap,
                    index === viewerIndex && styles.thumbWrapActive,
                  ]}
                >
                  <Image
                    source={{ uri: g.uri }}
                    style={[styles.thumb, index === viewerIndex && styles.thumbActive]}
                    contentFit="cover"
                  />
                </Pressable>
              )}
            />
          </View>
        </GestureHandlerRootView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  subtitleOnline: {
    color: '#22C55E',
    opacity: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  olderSpinner: {
    marginVertical: 12,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMine: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
  },
  bubbleTheirsDark: {
    backgroundColor: '#1E293B',
  },
  bubbleImage: {
    padding: 4,
  },
  attachmentImageWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: 220,
    height: 220,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    maxWidth: 224,
  },
  gridImageWrap: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridImage: {
    width: 108,
    height: 108,
  },
  captionText: {
    marginTop: 6,
    marginHorizontal: 4,
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreOverlayText: {
    color: '#fff',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },
  sender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 2,
  },
  textMine: {
    color: '#fff',
  },
  deleted: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 3,
    marginTop: 1,
  },
  time: {
    fontSize: 10,
    lineHeight: 13,
    opacity: 0.5,
  },
  timeMine: {
    color: '#DBEAFE',
    opacity: 0.9,
  },
  listWrap: {
    flex: 1,
  },
  newMessagesButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newMessagesBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newMessagesBadgeText: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  floatingDay: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dayLabelRow: {
    alignItems: 'center',
    marginVertical: 8,
  },
  dayChip: {
    backgroundColor: 'rgba(128,128,128,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  dayChipDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dayChipSolid: {
    backgroundColor: '#E5E7EB',
  },
  dayChipSolidDark: {
    backgroundColor: '#334155',
  },
  dayChipText: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.7,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    maxHeight: 120,
    color: '#11181C',
    backgroundColor: '#F8FAFC',
  },
  inputDark: {
    color: '#ECEDEE',
    borderColor: '#334155',
    backgroundColor: '#1E293B',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachText: {
    fontSize: 24,
    color: '#2563EB',
    lineHeight: 28,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 22,
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  reactionChip: {
    flexDirection: 'row',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  reactionChipMine: {
    backgroundColor: 'rgba(37,99,235,0.35)',
  },
  reactionText: {
    fontSize: 12,
    lineHeight: 16,
  },
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E2E8F0',
  },
  editBannerDark: {
    backgroundColor: '#1E293B',
  },
  editBannerText: {
    flex: 1,
    fontSize: 13,
    opacity: 0.8,
  },
  editBannerClose: {
    color: '#EF4444',
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  menu: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  menuDark: {
    backgroundColor: '#1E293B',
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  emojiButton: {
    padding: 6,
  },
  emoji: {
    fontSize: 26,
    lineHeight: 32,
  },
  menuItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.3)',
  },
  menuDanger: {
    color: '#EF4444',
  },
  menuTitle: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  infoBody: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    opacity: 0.5,
    marginTop: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  infoName: {
    flex: 1,
    fontSize: 14,
  },
  infoTime: {
    fontSize: 12,
    opacity: 0.5,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.3)',
  },
  previewHeaderSpacer: {
    width: 52,
  },
  previewCancelText: {
    color: '#EF4444',
  },
  previewGridContent: {
    padding: 16,
    gap: 8,
  },
  previewGridRow: {
    gap: 8,
  },
  previewImageWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    flex: 1,
  },
  viewer: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewerSafe: {
    flex: 1,
  },
  viewerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  viewerCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  viewerClose: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 26,
  },
  viewerCaption: {
    flex: 1,
    color: '#fff',
    opacity: 0.8,
    fontSize: 14,
  },
  thumbStrip: {
    flexGrow: 0,
    marginVertical: 12,
  },
  thumbContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  thumbWrap: {
    width: 58,
    height: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.5)',
    overflow: 'hidden',
  },
  thumbWrapActive: {
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  thumb: {
    flex: 1,
    opacity: 0.6,
  },
  thumbActive: {
    opacity: 1,
  },
});
