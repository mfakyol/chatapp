import { Pressable, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeStore, type ThemePreference } from '@/stores/theme.store';

const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: 'system', label: 'Sistem', hint: 'Telefonun temasına uyar' },
  { value: 'light', label: 'Açık', hint: 'Her zaman açık tema' },
  { value: 'dark', label: 'Koyu', hint: 'Her zaman koyu tema' },
];

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <ThemedView style={styles.flex}>
      <ScreenHeader title="Ayarlar" />

      <ThemedText style={styles.sectionHeader}>Görünüm</ThemedText>
      {THEME_OPTIONS.map((option) => {
        const selected = preference === option.value;
        return (
          <Pressable
            key={option.value}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => setPreference(option.value)}
          >
            <View style={styles.rowBody}>
              <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
              <ThemedText style={styles.hint}>{option.hint}</ThemedText>
            </View>
            <View
              style={[
                styles.radio,
                isDark && styles.radioDark,
                selected && styles.radioSelected,
              ]}
            >
              {selected && <View style={styles.radioDot} />}
            </View>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowBody: {
    flex: 1,
  },
  hint: {
    fontSize: 13,
    opacity: 0.5,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDark: {
    borderColor: '#334155',
  },
  radioSelected: {
    borderColor: '#2563EB',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
  },
});
