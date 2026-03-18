'use client';

/**
 * 인증 상태를 앱 전체에서 공유하는 Context.
 * 파이썬의 전역 변수처럼 쓰되, React의 구독 방식으로 리렌더링 트리거.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { onboardingAPI } from './api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

const SKIP_ONBOARDING_CHECK = ['/login', '/onboarding', '/auth/callback'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 로그인 후 온보딩 완료 여부 확인 → 미완료면 /onboarding으로
  const checkOnboarding = async (currentPath: string) => {
    if (SKIP_ONBOARDING_CHECK.some(p => currentPath.startsWith(p))) return;
    try {
      const status = await onboardingAPI.getStatus();
      if (!status.completed) router.push('/onboarding');
    } catch {
      // 백엔드 미연결 시 무시
    }
  };

  useEffect(() => {
    // 초기 세션 로드
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session?.user) checkOnboarding(pathname);
    });

    // 로그인/로그아웃 이벤트 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        router.push('/login');
      } else if (event === 'SIGNED_IN') {
        checkOnboarding(pathname);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
