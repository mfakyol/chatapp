import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';

import { useT } from '@/lib/i18n';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth.store';

export default function LoginScreen() {
  const t = useT();
  const colorScheme = useColorScheme();
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await login(identifier.trim(), password);
    setSubmitting(false);
  };

  const isDark = colorScheme === 'dark';
  const inputStyle = [
    styles.input,
    {
      color: isDark ? '#ECEDEE' : '#11181C',
      borderColor: isDark ? '#334155' : '#CBD5E1',
      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
    },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Chatapp
        </ThemedText>
        <ThemedText style={styles.subtitle}>{t('auth.loginSubtitle')}</ThemedText>

        <TextInput
          style={inputStyle}
          placeholder={t('auth.identifier')}
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          autoCapitalize="none"
          autoCorrect={false}
          value={identifier}
          onChangeText={setIdentifier}
          returnKeyType="next"
        />
        <TextInput
          style={inputStyle}
          placeholder={t('auth.password')}
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />

        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.buttonText}>{t('auth.login')}</ThemedText>
          )}
        </Pressable>

        <Link href="/register" style={styles.link}>
          <ThemedText style={styles.linkText}>{t('auth.noAccount')}</ThemedText>
        </Link>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  error: {
    color: '#EF4444',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  link: {
    alignSelf: 'center',
    marginTop: 8,
  },
  linkText: {
    color: '#2563EB',
  },
});
