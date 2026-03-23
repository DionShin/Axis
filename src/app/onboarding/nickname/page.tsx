'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { onboardingAPI } from '@/lib/api';

export default function NicknamePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace('/login');
        return;
      }
      try {
        const status = await onboardingAPI.getStatus();
        if (status.completed) {
          router.replace('/');
          return;
        }
        if (status.nickname) setNickname(status.nickname);
      } catch { /* 무시 */ }
      setReady(true);
    });
  }, []);

  const handleNext = async () => {
    if (!nickname.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onboardingAPI.saveProfile(nickname.trim());
      router.push('/onboarding?from=oauth');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="text-gray-600 text-sm animate-pulse">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">

        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⬡</div>
          <h1 className="text-2xl font-black tracking-tight">AXIS</h1>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold mb-1">닉네임 설정</h2>
          <p className="text-sm text-gray-500">앱에서 표시될 이름을 입력해주세요</p>
        </div>

        <input
          type="text"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNext()}
          placeholder="닉네임"
          maxLength={12}
          autoFocus
          className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        />

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}

        <button
          onClick={handleNext}
          disabled={!nickname.trim() || loading}
          className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: '#3b82f6', color: '#fff' }}
        >
          {loading ? '처리 중...' : '다음'}
        </button>
      </div>
    </main>
  );
}
