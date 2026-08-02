import { Pressable, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useT, type TranslationKey } from '@/lib/i18n';
import {
  useLanguageStore,
  type LanguagePreference,
} from '@/stores/language.store';
import { useThemeStore, type ThemePreference } from '@/stores/theme.store';

const THEME_OPTIONS: {
  value: ThemePreference;
  labelKey: TranslationKey;
  hintKey: TranslationKey;
}[] = [
  { value: 'system', labelKey: 'settings.system', hintKey: 'settings.systemHint' },
  { value: 'light', labelKey: 'settings.light', hintKey: 'settings.lightHint' },
  { value: 'dark', labelKey: 'settings.dark', hintKey: 'settings.darkHint' },
];

const LANGUAGE_OPTIONS: { value: LanguagePreference; label: string }[] = [
  { value: 'system', label: '' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'tr', label: 'Türkçe' },
];

export default function SettingsScreen() {
  const t = useT();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);
  const languagePreference = useLanguageStore((s) => s.preference);
  const setLanguagePreference = useLanguageStore((s) => s.setPreference);

  const radio = (selected: boolean) => (
    <View
      style={[styles.radio, isDark && styles.radioDark, selected && styles.radioSelected]}
    >
      {selected && <View style={styles.radioDot} />}
    </View>
  );

  return (
    <ThemedView style={styles.flex}>
      <ScreenHeader title={t('settings.title')} />

      <ThemedText style={styles.sectionHeader}>{t('settings.appearance')}</ThemedText>
      {THEME_OPTIONS.map((option) => (
        <Pressable
          key={option.value}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => setThemePreference(option.value)}
        >
          <View style={styles.rowBody}>
            <ThemedText type="defaultSemiBold">{t(option.labelKey)}</ThemedText>
            <ThemedText style={styles.hint}>{t(option.hintKey)}</ThemedText>
          </View>
          {radio(themePreference === option.value)}
        </Pressable>
      ))}

      <ThemedText style={styles.sectionHeader}>{t('settings.language')}</ThemedText>
      {LANGUAGE_OPTIONS.map((option) => (
        <Pressable
          key={option.value}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => setLanguagePreference(option.value)}
        >
          <View style={styles.rowBody}>
            <ThemedText type="defaultSemiBold">
              {option.value === 'system' ? t('settings.system') : option.label}
            </ThemedText>
            {option.value === 'system' && (
              <ThemedText style={styles.hint}>
                {t('settings.languageSystemHint')}
              </ThemedText>
            )}
          </View>
          {radio(languagePreference === option.value)}
        </Pressable>
      ))}
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
