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
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
  formatLastSeen,
  formatMessageTime,
  fullName,
  messageImages,
  otherParticipant,
  userId,
} from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import type { Message } from '@/types';

const NO_MESSAGES: Message[] = [];
const NO_TYPING: string[] = [];
const TYPING_IDLE_MS = 3000;
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const previewImageSize = (windowWidth - 16 * 2 - 8) / 2;
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

  const typingSent = useRef(false);
  const typingIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const inverted = useMemo(() => [...messages].reverse(), [messages]);

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
    Alert.alert('Mesajı sil', 'Bu mesaj herkes için silinecek. Emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
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
    const files = pendingImages.map((asset) => ({
      uri: asset.uri,
      name: asset.fileName ?? `photo_${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    }));
    const ok = await sendAttachment(id, files, caption.trim() || undefined);
    setUploading(false);
    if (ok) {
      setPendingImages(null);
      setCaption('');
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const mine = userId(item.sender) === meId;
    const images = messageImages(item);
    const hasImages = images.length > 0;
    return (
      <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
        <Pressable
          onLongPress={() => {
            if (!item.deletedAt) setSelected(item);
          }}
          delayLongPress={300}
          style={[
            styles.bubble,
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
              Bu mesaj silindi
            </ThemedText>
          ) : (
            <>
              {images.length === 1 && (
                <Pressable
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
          <ThemedText style={[styles.time, mine && styles.timeMine]}>
            {formatMessageTime(item.createdAt)}
            {item.editedAt ? ' · dzn' : ''}
          </ThemedText>
        </Pressable>
      </View>
    );
  };

  const other =
    conversation && !conversation.isGroup
      ? otherParticipant(conversation, meId)
      : undefined;
  const title = conversation ? conversationTitle(conversation, meId) : 'Sohbet';
  const subtitle = conversation
    ? conversation.isGroup
      ? `${conversation.members?.length ?? conversation.participants.length} üye`
      : other?.isOnline
        ? 'çevrimiçi'
        : other?.lastSeen
          ? `son görülme: ${formatLastSeen(other.lastSeen)}`
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
            !conversation?.isGroup && other?.isOnline ? styles.subtitleOnline : undefined
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
        <FlatList
          data={inverted}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          inverted
          contentContainerStyle={styles.listContent}
          onEndReached={() => loadOlderMessages(id)}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingOlder ? <ActivityIndicator style={styles.olderSpinner} /> : null
          }
          ListHeaderComponent={
            typingNames.length > 0 ? (
              <View style={[styles.bubbleRow, styles.rowTheirs]}>
                <View
                  style={[
                    styles.bubble,
                    styles.bubbleTheirs,
                    isDark && styles.bubbleTheirsDark,
                  ]}
                >
                  <ThemedText style={styles.typingText}>
                    {typingNames.join(', ')} yazıyor...
                  </ThemedText>
                </View>
              </View>
            ) : null
          }
        />

        <SafeAreaView edges={['bottom']}>
          {editing && (
            <View style={[styles.editBanner, isDark && styles.editBannerDark]}>
              <ThemedText numberOfLines={1} style={styles.editBannerText}>
                Düzenleniyor: {editing.content}
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
              placeholder="Mesaj yaz..."
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
                {!selected.attachment && (
                  <Pressable style={styles.menuItem} onPress={startEdit}>
                    <ThemedText>Düzenle</ThemedText>
                  </Pressable>
                )}
                <Pressable style={styles.menuItem} onPress={confirmDelete}>
                  <ThemedText style={styles.menuDanger}>Sil</ThemedText>
                </Pressable>
              </>
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
              <ThemedText style={styles.previewCancelText}>Vazgeç</ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold">
              {pendingImages?.length} fotoğraf
            </ThemedText>
            <View style={styles.previewHeaderSpacer} />
          </View>

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.previewGrid}
            >
              {pendingImages?.map((asset, index) => (
                <Image
                  key={index}
                  source={{ uri: asset.uri }}
                  style={[
                    styles.previewImage,
                    { width: previewImageSize, height: previewImageSize },
                  ]}
                  contentFit="cover"
                />
              ))}
            </ScrollView>

            <View style={styles.inputBar}>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Mesaj ekle..."
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
                length: 64,
                offset: 64 * index,
                index,
              })}
              renderItem={({ item: g, index }) => (
                <Pressable onPress={() => setViewerIndex(index)}>
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
    gap: 4,
  },
  olderSpinner: {
    marginVertical: 12,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
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
  attachmentImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.35)',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    maxWidth: 224,
  },
  gridImage: {
    width: 108,
    height: 108,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.35)',
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
  typingText: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
  time: {
    fontSize: 9,
    lineHeight: 11,
    opacity: 0.5,
    alignSelf: 'flex-end',
  },
  timeMine: {
    color: '#DBEAFE',
    opacity: 0.9,
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
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
    gap: 8,
  },
  previewImage: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.35)',
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
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    opacity: 0.6,
  },
  thumbActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#2563EB',
  },
});
