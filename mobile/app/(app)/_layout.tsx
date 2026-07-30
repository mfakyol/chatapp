import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { subscribeChatSocket } from '@/services/chatSocket.service';
import { useAuthStore } from '@/stores/auth.store';

export default function AppLayout() {
  const username = useAuthStore((s) => s.user?.username);

  useEffect(() => {
    if (!username) return;
    return subscribeChatSocket(username);
  }, [username]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
