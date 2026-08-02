import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { groupAvatarUrl } from '@/lib/utils';
import type { Conversation } from '@/types';

interface GroupAvatarProps {
  conversation: Conversation;
  size?: number;
}

export function GroupAvatar({ conversation, size = 52 }: GroupAvatarProps) {
  const uri = groupAvatarUrl(conversation);
  const round = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={round} contentFit="cover" />;
  }

  return (
    <View style={[styles.fallback, round]}>
      <Text style={{ fontSize: size * 0.45, lineHeight: size * 0.6 }}>👥</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(37,99,235,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
