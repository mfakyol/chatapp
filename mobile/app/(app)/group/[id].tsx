import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Avatar } from '@/components/avatar';
import { useT } from '@/lib/i18n';
import { GroupAvatar } from '@/components/group-avatar';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fullName, userId } from '@/lib/utils';
import * as userService from '@/services/user.service';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import type { ConversationMemberInfo, PublicUser } from '@/types';

export default function GroupInfoScreen() {
  const t = useT();
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
  const setMemberRole = useChatStore((s) => s.setMemberRole);
  const addGroupMember = useChatStore((s) => s.addGroupMember);
  const removeGroupMember = useChatStore((s) => s.removeGroupMember);
  const leaveGroup = useChatStore((s) => s.leaveGroup);
  const deleteConversation = useChatStore((s) => s.deleteConversation);

  const isAdmin = conversation?.admins?.includes(meId) ?? false;

  const [name, setName] = useState(conversation?.name ?? '');
  const [description, setDescription] = useState(conversation?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [memberMenu, setMemberMenu] = useState<ConversationMemberInfo | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (addOpen && friends.length === 0) {
      userService.getFriends().then((res) => {
        if (res.success) setFriends(res.data.friends);
      });
    }
  }, [addOpen, friends.length]);

  if (!conversation) {
    return (
      <ThemedView style={styles.flex}>
        <ScreenHeader title={t('group.infoTitle')} />
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
    if (result.error) Alert.alert(t('common.error'), result.error);
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
    if (res.error) Alert.alert(t('common.error'), res.error);
  };

  const memberUsernames = new Set(
    (conversation.members ?? []).map((m) => m.user.username),
  );
  const addableFriends = friends.filter((f) => !memberUsernames.has(f.username));

  const runMemberAction = async (action: () => Promise<{ error?: string }>) => {
    if (busy) return;
    setBusy(true);
    const res = await action();
    setBusy(false);
    setMemberMenu(null);
    if (res.error) Alert.alert(t('common.error'), res.error);
  };

  const handleLeave = () => {
    Alert.alert(t('group.leave'), t('group.leaveConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('group.leaveAction'),
        style: 'destructive',
        onPress: async () => {
          const res = await leaveGroup(id);
          if (res.error) {
            Alert.alert(t('common.error'), res.error);
          } else {
            router.dismissTo('/');
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      t('group.delete'),
      t('group.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const res = await deleteConversation(id);
            if (res.error) {
              Alert.alert(t('common.error'), res.error);
            } else {
              router.dismissTo('/');
            }
          },
        },
      ],
    );
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
      <ScreenHeader title={t('group.infoTitle')} />
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
                <ThemedText style={styles.changePhoto}>{t('group.changePhoto')}</ThemedText>
              </Pressable>
            )}

            {isAdmin ? (
              <>
                <TextInput
                  style={inputStyle}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('group.name')}
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                />
                <TextInput
                  style={[inputStyle, styles.descriptionInput]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('group.descriptionPlaceholder')}
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
                      <ThemedText style={styles.saveText}>{t('common.save')}</ThemedText>
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
              {t('group.membersHeader', { n: conversation.members?.length ?? 0 })}
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
                {userId(item.user) === meId ? ` ${t('contacts.you')}` : ''}
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
                <ThemedText style={styles.adminBadgeText}>{t('group.admin')}</ThemedText>
              </View>
            )}
            {isAdmin && item.user.username !== me?.username && (
              <Pressable
                onPress={() => setMemberMenu(item)}
                hitSlop={8}
                style={styles.moreButton}
              >
                <ThemedText style={styles.moreText}>⋯</ThemedText>
              </Pressable>
            )}
          </Pressable>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {isAdmin && (
              <>
                <Pressable
                  style={styles.addToggle}
                  onPress={() => setAddOpen((open) => !open)}
                >
                  <ThemedText style={styles.addToggleText}>
                    {addOpen ? '−' : '＋'} {t('group.addMember')}
                  </ThemedText>
                </Pressable>
                {addOpen &&
                  (addableFriends.length === 0 ? (
                    <ThemedText style={styles.addEmpty}>{t('group.noAddable')}</ThemedText>
                  ) : (
                    addableFriends.map((friend) => (
                      <Pressable
                        key={friend.username}
                        style={styles.addRow}
                        onPress={() =>
                          runMemberAction(() => addGroupMember(id, friend.username))
                        }
                      >
                        <Avatar user={friend} size={36} />
                        <ThemedText style={styles.addName}>
                          {fullName(friend)}
                        </ThemedText>
                        <ThemedText style={styles.addAction}>{t('common.add')}</ThemedText>
                      </Pressable>
                    ))
                  ))}
              </>
            )}
            <Pressable style={styles.leaveButton} onPress={handleLeave}>
              <ThemedText style={styles.leaveText}>{t('group.leave')}</ThemedText>
            </Pressable>
            {isAdmin && (
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <ThemedText style={styles.deleteText}>{t('group.delete')}</ThemedText>
              </Pressable>
            )}
          </View>
        }
      />

      <Modal
        visible={memberMenu !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMemberMenu(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMemberMenu(null)}>
          <View style={[styles.menu, isDark && styles.menuDark]}>
            <ThemedText type="defaultSemiBold" style={styles.menuTitle}>
              {memberMenu ? fullName(memberMenu.user) : ''}
            </ThemedText>
            {busy ? (
              <ActivityIndicator style={styles.menuBusy} />
            ) : (
              <>
                <Pressable
                  style={styles.menuItem}
                  onPress={() =>
                    memberMenu &&
                    runMemberAction(() =>
                      setMemberRole(
                        id,
                        memberMenu.user.username,
                        memberMenu.role === 'admin' ? 'member' : 'admin',
                      ),
                    )
                  }
                >
                  <ThemedText>
                    {memberMenu?.role === 'admin'
                      ? t('group.removeAdmin')
                      : t('group.makeAdmin')}
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={styles.menuItem}
                  onPress={() =>
                    memberMenu &&
                    runMemberAction(() =>
                      removeGroupMember(id, memberMenu.user.username),
                    )
                  }
                >
                  <ThemedText style={styles.menuDanger}>{t('group.removeMember')}</ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
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
  moreButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  moreText: {
    fontSize: 22,
    lineHeight: 24,
    opacity: 0.6,
  },
  footer: {
    padding: 24,
    gap: 8,
  },
  addToggle: {
    paddingVertical: 8,
  },
  addToggleText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  addEmpty: {
    opacity: 0.5,
    fontSize: 14,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  addName: {
    flex: 1,
  },
  addAction: {
    color: '#2563EB',
    fontWeight: '600',
  },
  leaveButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#EF4444',
  },
  leaveText: {
    color: '#fff',
    fontWeight: '600',
  },
  deleteButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  deleteText: {
    color: '#EF4444',
    fontWeight: '600',
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
  menuTitle: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  menuBusy: {
    marginVertical: 16,
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
});
