'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
  };

  // 구글 로그인
  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  // 카카오 로그인
  const handleKakao = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  // 네이버 로그인
  const handleNaver = () => {
    window.location.href = '/api/auth/naver';
  };

  // 이메일 매직링크
  const handleMagicLink = async () => {
    if (!email) return;
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    else setMagicSent(true);
    setLoading(false);
  };

  // 이메일 + 비밀번호 로그인
  const handleEmailLogin = async () => {
    if (!email || !password) return;
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message.includes('Invalid login credentials')
        ? '이메일 또는 비밀번호가 올바르지 않습니다.'
        : error.message;
      setError(msg);
      setLoading(false);
    } else router.push('/');
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">

      {/* 로고 */}
      <div className="mb-12 text-center">
        <div className="text-5xl mb-4">⬡</div>
        <h1 className="text-3xl font-black tracking-tight">AXIS</h1>
      </div>

      {/* 매직링크 발송 완료 */}
      {magicSent ? (
        <div
          className="w-full max-w-sm rounded-2xl p-6 text-center"
          style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="text-4xl mb-3">📬</div>
          <h2 className="font-bold mb-2">이메일을 확인하세요</h2>
          <p className="text-sm text-gray-400">
            <span className="text-white">{email}</span>로<br />
            로그인 링크를 발송했습니다.
          </p>
          <button onClick={() => setMagicSent(false)} className="mt-4 text-xs text-gray-600 underline">
            다시 시도
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-3">

          {/* 카카오 로그인 */}
          <button
            onClick={handleKakao}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: '#FEE500', color: '#191919' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.548 1.516 4.795 3.836 6.178-.169.618-.611 2.241-.7 2.588-.11.424.155.418.326.304.134-.09 2.124-1.44 2.984-2.022A11.4 11.4 0 0 0 12 18c5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
            </svg>
            카카오로 로그인
          </button>

          {/* 네이버 로그인 */}
          <button
            onClick={handleNaver}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: '#03C75A', color: '#fff' }}
          >
            <span className="font-black text-base leading-none">N</span>
            네이버로 로그인
          </button>

          {/* 구글 로그인 */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: '#fff', color: '#111' }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.2H42V20H24v8h11.3C33.7 32.8 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.8z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.2 0-9.7-3.4-11.3-8H6.4C9.6 37.3 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.2H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C37.1 36.7 44 31 44 24c0-1.3-.1-2.6-.4-3.8z"/>
            </svg>
            Google로 로그인
          </button>

          {/* 구분선 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-600">또는 이메일</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* 이메일 입력 */}
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="이메일 주소"
            className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
            style={inputStyle}
          />

          {/* 비밀번호 입력 */}
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
            style={inputStyle}
            onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
          />

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <button
            onClick={handleEmailLogin}
            disabled={!email || !password || loading}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #ffffff, #d1d5db)', color: '#000' }}
          >
            {loading ? '처리 중...' : '로그인'}
          </button>

          <button
            onClick={handleMagicLink}
            disabled={!email || loading}
            className="w-full py-3 rounded-xl font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-40 text-gray-400"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            이메일 링크로 로그인 (비밀번호 없이)
          </button>

          <p className="text-center text-xs text-gray-600 pt-1">
            처음이신가요?{' '}
            <Link href="/onboarding" className="text-white font-semibold">
              회원가입
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}
