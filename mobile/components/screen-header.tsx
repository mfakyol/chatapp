import { useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string | null;
  subtitleStyle?: TextStyle;
  avatar?: ReactNode;
  onBodyPress?: () => void;
  right?: ReactNode;
  /** Back hedefi. Verilirse stack bu rotaya kadar boşaltılır; verilmezse bir adım geri. */
  backTo?: Href;
}

export function ScreenHeader({
  title,
  subtitle,
  subtitleStyle,
  avatar,
  onBodyPress,
  right,
  backTo,
}: ScreenHeaderProps) {
  const router = useRouter();

  const goBack = () => {
    if (backTo) {
      router.dismissTo(backTo);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView edges={['top']}>
      <View style={styles.row}>
        <Pressable
          onPress={goBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          hitSlop={8}
        >
          <ThemedText style={styles.backIcon}>‹</ThemedText>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.body, onBodyPress && pressed && styles.pressed]}
          onPress={onBodyPress}
          disabled={!onBodyPress}
        >
          {avatar}
          <View style={styles.texts}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {title}
            </ThemedText>
            {subtitle ? (
              <ThemedText numberOfLines={1} style={[styles.subtitle, subtitleStyle]}>
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
        </Pressable>
        {right}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.3)',
  },
  back: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  backIcon: {
    fontSize: 42,
    lineHeight: 46,
    color: '#2563EB',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  texts: {
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.6,
  },
});
