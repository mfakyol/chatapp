import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { fullName, userAvatarUrl, userId } from '@/lib/utils';
import type { PublicUser } from '@/types';

const COLORS = ['#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#16A34A', '#0891B2'];

function initials(user?: PublicUser | null): string {
  const name = fullName(user);
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

function colorFor(user?: PublicUser | null): string {
  const id = userId(user);
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface AvatarProps {
  user?: PublicUser | null;
  size?: number;
}

export function Avatar({ user, size = 48 }: AvatarProps) {
  const uri = userAvatarUrl(user);
  const round = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={round} contentFit="cover" />;
  }

  return (
    <View style={[styles.fallback, round, { backgroundColor: colorFor(user) }]}>
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials(user)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '600',
  },
});
