import { useHeaderHeight } from '@react-navigation/elements';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { emitTyping } from '@/services/chatSocket.service';
import {
  conversationTitle,
  fileUrl,
  formatMessageTime,
  fullName,
  isImageAttachment,
  userId,
} from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import type { Message } from '@/types';

const NO_MESSAGES: Message[] = [];
const NO_TYPING: string[] = [];
const TYPING_IDLE_MS = 3000;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const headerHeight = useHeaderHeight();
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
  const markRead = useChatStore((s) => s.markRead);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

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
    const ok = await sendMessage(id, content);
    if (ok) setDraft('');
    setSending(false);
  };

  const handlePickImage = async () => {
    if (uploading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    setUploading(true);
    await sendAttachment(id, {
      uri: asset.uri,
      name: asset.fileName ?? `photo_${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    });
    setUploading(false);
  };

  const renderItem = ({ item }: { item: Message }) => {
    const mine = userId(item.sender) === meId;
    const image = isImageAttachment(item.attachment);
    return (
      <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
        <View
          style={[
            styles.bubble,
            mine
              ? styles.bubbleMine
              : [styles.bubbleTheirs, isDark && styles.bubbleTheirsDark],
            image && !item.deletedAt && styles.bubbleImage,
          ]}
        >
          {!mine && conversation?.isGroup && (
            <ThemedText style={styles.sender}>{fullName(item.sender)}</ThemedText>
          )}
          {item.deletedAt ? (
            <ThemedText style={[styles.deleted, mine && styles.textMine]}>
              Bu mesaj silindi
            </ThemedText>
          ) : image ? (
            <Image
              source={{ uri: fileUrl(item.attachment!.url) }}
              style={styles.attachmentImage}
              contentFit="cover"
            />
          ) : (
            <ThemedText style={mine ? styles.textMine : undefined}>
              {item.attachment ? `📎 ${item.attachment.fileName}` : item.content}
            </ThemedText>
          )}
          <ThemedText
            style={[styles.time, mine && styles.timeMine, image && styles.timeOnImage]}
          >
            {formatMessageTime(item.createdAt)}
            {item.editedAt ? ' · düzenlendi' : ''}
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: conversation ? conversationTitle(conversation, meId) : 'Sohbet',
          headerBackTitle: 'Geri',
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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
    fontSize: 10,
    opacity: 0.5,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  timeMine: {
    color: '#DBEAFE',
    opacity: 0.9,
  },
  timeOnImage: {
    marginRight: 4,
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
});
