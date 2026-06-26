'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';

// Корневая страница: перенаправляем в зависимости от наличия токена
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) {
      router.replace('/applications');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return null;
}
