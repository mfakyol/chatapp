'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/chat' : '/login');
  }, [user, loading, router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-[#8696a0]">Loading...</p>
    </div>
  );
}
