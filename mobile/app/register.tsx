import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import { useT } from '@/lib/i18n';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth.store';

export default function RegisterScreen() {
  const t = useT();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const register = useAuthStore((s) => s.register);
  const error = useAuthStore((s) => s.error);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    username.trim().length >= 3 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await register({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password,
    });
    setSubmitting(false);
  };

  const inputStyle = [
    styles.input,
    {
      color: isDark ? '#ECEDEE' : '#11181C',
      borderColor: isDark ? '#334155' : '#CBD5E1',
      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
    },
  ];
  const placeholderColor = isDark ? '#64748B' : '#94A3B8';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ThemedView style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText type="title" style={styles.title}>
            {t('auth.registerTitle')}
          </ThemedText>

          <TextInput
            style={inputStyle}
            placeholder={t('auth.firstName')}
            placeholderTextColor={placeholderColor}
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={inputStyle}
            placeholder={t('auth.lastName')}
            placeholderTextColor={placeholderColor}
            value={lastName}
            onChangeText={setLastName}
          />
          <TextInput
            style={inputStyle}
            placeholder={t('auth.usernameHint')}
            placeholderTextColor={placeholderColor}
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={inputStyle}
            placeholder={t('auth.email')}
            placeholderTextColor={placeholderColor}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={inputStyle}
            placeholder={t('auth.passwordHint')}
            placeholderTextColor={placeholderColor}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
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
              <ThemedText style={styles.buttonText}>{t('auth.createAccount')}</ThemedText>
            )}
          </Pressable>

          <Link href="/login" style={styles.link}>
            <ThemedText style={styles.linkText}>{t('auth.haveAccount')}</ThemedText>
          </Link>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
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
