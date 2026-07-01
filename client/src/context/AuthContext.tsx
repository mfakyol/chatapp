'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, setToken } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { PublicUser } from '@/types';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const bootstrap = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<{ user: PublicUser }>('/auth/me');
      setUser(data.user);
      connectSocket(token);
    } catch {
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  async function login(identifier: string, password: string) {
    const data = await apiFetch<{ token: string; user: PublicUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    setToken(data.token);
    setUser(data.user);
    connectSocket(data.token);
    router.push('/chat');
  }

  async function register(payload: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const data = await apiFetch<{ token: string; user: PublicUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setToken(data.token);
    setUser(data.user);
    connectSocket(data.token);
    router.push('/chat');
  }

  function logout() {
    setToken(null);
    setUser(null);
    disconnectSocket();
    router.push('/login');
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
