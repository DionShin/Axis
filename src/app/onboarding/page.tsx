'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { onboardingAPI } from '@/lib/api';

// ─── 키워드 목록 (스탯별 그룹) ───────────────────────────────────
const KEYWORD_GROUPS = [
  {
    emoji: '💪',
    stat: '외모',
    keywords: ['꿀피부', '어깨깡패', '깔끔한인상', '패션센스', '다이어트'],
  },
  {
    emoji: '🎯',
    stat: '매너',
    keywords: ['말잘하는법', '비호감탈출', '비즈니스매너', '데이트고수', '인싸력상승'],
  },
  {
    emoji: '⚡',
    stat: '체력',
    keywords: ['헬스', '러닝', '수면최적화', '면역력강화', '유연성'],
  },
  {
    emoji: '📚',
    stat: '지성',
    keywords: ['경제공부', '독서왕', '영어공부', '자격증', '코딩'],
  },
  {
    emoji: '💰',
    stat: '자산',
    keywords: ['주식투자', '절약고수', '부업수익', '부동산공부', '재테크루틴'],
  },
];

// ─── 비밀번호 검증 규칙 ──────────────────────────────────────────
function validatePassword(pw: string) {
  return {
    length: pw.length >= 8,
    number: /\d/.test(pw),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw),
  };
}

// ─── 진행 점 인디케이터 ──────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: i + 1 === current ? '24px' : '8px',
            background: i + 1 === current ? '#3b82f6' : 'rgba(255,255,255,0.15)',
          }}
        />
      ))}
    </div>
  );
}

// ─── 공통 카드 스타일 ────────────────────────────────────────────
const cardStyle = {
  background: '#0f1117',
  border: '1px solid rgba(255,255,255,0.07)',
};

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
};

// ─── 메인 컴포넌트 ────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 이미 로그인된 상태면 step 1(회원가입) 건너뛰고 step 2(키워드)부터
  // 프로필이 없으면 이메일로 기본 프로필 생성
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      setStep(2);
      try {
        const status = await onboardingAPI.getStatus();
        if (!status.nickname) {
          const email = data.session.user.email ?? '사용자';
          const defaultNickname = email.split('@')[0];
          await onboardingAPI.saveProfile(defaultNickname);
          setNickname(defaultNickname);
        } else {
          setNickname(status.nickname);
        }
      } catch { /* 무시 */ }
    });
  }, []);

  // Step 1
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  // Step 2
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());

  // Step 3
  const [instagramId, setInstagramId] = useState('');
  const [kakaoId, setKakaoId] = useState('');
  const [phone, setPhone] = useState('');

  const pwCheck = validatePassword(password);
  const step1Valid =
    email.includes('@') &&
    pwCheck.length &&
    pwCheck.number &&
    pwCheck.special &&
    nickname.trim().length > 0;

  // ── Step 1: 회원가입 ─────────────────────────────────────────────
  const handleStep1 = async () => {
    if (!step1Valid) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) {
        const msg = signUpError.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already been registered')) {
          throw new Error('이미 가입된 이메일입니다. 로그인 페이지로 이동해주세요.');
        }
        throw new Error(signUpError.message);
      }

      // 이메일 인증이 필요한 경우 (session이 null)
      if (!data.session) {
        // 이미 가입된 이메일인지 확인 (Supabase는 보안상 에러 대신 빈 세션 반환)
        const { error: loginCheck } = await supabase.auth.signInWithPassword({ email, password });
        if (!loginCheck) {
          // 로그인 성공 = 이미 가입된 계정
          router.push('/');
          return;
        }
        if (loginCheck.message.includes('Email not confirmed')) {
          throw new Error('가입 확인 이메일을 발송했습니다. 메일함을 확인한 후 로그인해주세요.');
        }
        throw new Error('이미 가입된 이메일입니다. 로그인 페이지로 이동해주세요.');
      }

      await onboardingAPI.saveProfile(nickname.trim());
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: 키워드 선택 ──────────────────────────────────────────
  const toggleKeyword = (kw: string) => {
    setSelectedKeywords(prev => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });
  };

  const handleStep2 = async () => {
    if (selectedKeywords.size === 0) return;
    setLoading(true);
    setError('');
    try {
      await onboardingAPI.saveKeywords(Array.from(selectedKeywords));
      setStep(3);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: SNS 연동 ────────────────────────────────────────────
  const handleStep3 = async (skip = false) => {
    setLoading(true);
    setError('');
    try {
      if (!skip) {
        const snsData: { instagram_id?: string; kakao_id?: string; phone?: string } = {};
        if (instagramId.trim()) snsData.instagram_id = instagramId.trim().replace(/^@/, '');
        if (kakaoId.trim()) snsData.kakao_id = kakaoId.trim();
        if (phone.trim()) snsData.phone = phone.trim();
        await onboardingAPI.saveSNS(snsData);
      }
      setStep(4);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4: 알림 + 완료 ─────────────────────────────────────────
  const handleComplete = async (requestNotification: boolean) => {
    setLoading(true);
    setError('');
    try {
      if (requestNotification && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted' && 'serviceWorker' in navigator && 'PushManager' in window) {
          try {
            const reg = await navigator.serviceWorker.ready;
            // VAPID 공개키가 설정된 경우 push 구독
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (vapidKey) {
              await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidKey,
              });
            }
          } catch {
            // 구독 실패는 무시 (알림 허용은 됨)
          }
        }
      }
      await onboardingAPI.complete();
      router.push('/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ── 체크 아이콘 ─────────────────────────────────────────────────
  const Check = ({ ok }: { ok: boolean }) => (
    <span style={{ color: ok ? '#3b82f6' : 'rgba(255,255,255,0.25)' }}>
      {ok ? '✓' : '✗'}
    </span>
  );

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center px-6 py-12">

      {/* 로고 */}
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">⬡</div>
        <h1 className="text-2xl font-black tracking-tight">AXIS</h1>
      </div>

      <StepDots current={step} total={4} />

      {/* ── STEP 1: 계정 만들기 ─────────────────────────────────── */}
      {step === 1 && (
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">계정 만들기</h2>
            <p className="text-sm text-gray-500 mt-1">AXIS를 시작하세요</p>
          </div>

          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="이메일 주소"
            className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
            style={inputStyle}
          />

          <div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
              style={inputStyle}
            />
            {password.length > 0 && (
              <div
                className="mt-2 px-4 py-3 rounded-xl text-xs space-y-1"
                style={cardStyle}
              >
                <p><Check ok={pwCheck.length} /> 8자 이상</p>
                <p><Check ok={pwCheck.number} /> 숫자 포함</p>
                <p><Check ok={pwCheck.special} /> 특수문자 포함</p>
              </div>
            )}
          </div>

          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="닉네임 (앱에서 표시되는 이름)"
            className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
            style={inputStyle}
          />

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <button
            onClick={handleStep1}
            disabled={!step1Valid || loading}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: '#3b82f6', color: '#fff' }}
          >
            {loading ? '처리 중...' : '다음'}
          </button>

          <p className="text-center text-xs text-gray-600">
            이미 계정이 있나요?{' '}
            <a href="/login" className="text-blue-400 font-semibold">로그인</a>
          </p>
        </div>
      )}

      {/* ── STEP 2: 관심사 선택 ─────────────────────────────────── */}
      {step === 2 && (
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">관심사 선택</h2>
            <p className="text-sm text-gray-500 mt-1">
              원하는 키워드를 골라보세요 — 루틴이 자동으로 만들어져요
            </p>
          </div>

          <div className="space-y-5">
            {KEYWORD_GROUPS.map(group => (
              <div key={group.stat}>
                <p className="text-sm font-semibold mb-2 text-gray-300">
                  {group.emoji} {group.stat}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.keywords.map(kw => {
                    const selected = selectedKeywords.has(kw);
                    return (
                      <button
                        key={kw}
                        onClick={() => toggleKeyword(kw)}
                        className="px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95"
                        style={{
                          background: selected
                            ? 'rgba(59,130,246,0.15)'
                            : 'rgba(255,255,255,0.06)',
                          border: selected
                            ? '1px solid #3b82f6'
                            : '1px solid rgba(255,255,255,0.1)',
                          color: selected ? '#60a5fa' : 'rgba(255,255,255,0.75)',
                        }}
                      >
                        #{kw}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-red-400 text-center mt-3">{error}</p>}

          <button
            onClick={handleStep2}
            disabled={selectedKeywords.size === 0 || loading}
            className="w-full mt-6 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: '#3b82f6', color: '#fff' }}
          >
            {loading
              ? '처리 중...'
              : `다음 (${selectedKeywords.size}개 선택됨)`}
          </button>
        </div>
      )}

      {/* ── STEP 3: SNS 연동 ────────────────────────────────────── */}
      {step === 3 && (
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">SNS 연동</h2>
            <p className="text-sm text-gray-500 mt-1">
              선택사항이에요 — 나중에도 추가할 수 있어요
            </p>
          </div>

          <div
            className="rounded-2xl p-5 space-y-4"
            style={cardStyle}
          >
            {/* 인스타그램 */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">인스타그램 ID</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">@</span>
                <input
                  type="text"
                  value={instagramId}
                  onChange={e => setInstagramId(e.target.value)}
                  placeholder="username"
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* 카카오톡 */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">카카오톡 ID</label>
              <input
                type="text"
                value={kakaoId}
                onChange={e => setKakaoId(e.target.value)}
                placeholder="카카오톡 아이디"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                style={inputStyle}
              />
            </div>

            {/* 전화번호 */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">전화번호</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400 text-center mt-3">{error}</p>}

          <div className="mt-4 space-y-2">
            <button
              onClick={() => handleStep3(false)}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ background: '#3b82f6', color: '#fff' }}
            >
              {loading ? '처리 중...' : '연동하기'}
            </button>
            <button
              onClick={() => handleStep3(true)}
              disabled={loading}
              className="w-full py-3 rounded-2xl font-medium text-sm text-gray-500 transition-all active:scale-[0.98] disabled:opacity-40"
            >
              건너뛰기
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: 알림 설정 ───────────────────────────────────── */}
      {step === 4 && (
        <div className="w-full max-w-sm text-center">
          <div className="mb-8">
            <div className="text-7xl mb-5">🔔</div>
            <h2 className="text-xl font-bold mb-2">알림 설정</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              루틴 알림, 아침 브리핑을 받아보세요.<br />
              매일 목표를 달성하는 데 도움이 됩니다.
            </p>
          </div>

          <div
            className="rounded-2xl p-5 mb-6 text-left space-y-3"
            style={cardStyle}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">⏰</span>
              <div>
                <p className="text-sm font-semibold">루틴 알림</p>
                <p className="text-xs text-gray-500">설정한 시간에 루틴을 상기시켜 드려요</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">🌅</span>
              <div>
                <p className="text-sm font-semibold">아침 브리핑</p>
                <p className="text-xs text-gray-500">오늘 해야 할 루틴을 아침에 요약해 드려요</p>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-400 text-center mb-3">{error}</p>}

          <div className="space-y-2">
            <button
              onClick={() => handleComplete(true)}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ background: '#3b82f6', color: '#fff' }}
            >
              {loading ? '처리 중...' : '알림 허용'}
            </button>
            <button
              onClick={() => handleComplete(false)}
              disabled={loading}
              className="w-full py-3 rounded-2xl font-medium text-sm text-gray-500 transition-all active:scale-[0.98] disabled:opacity-40"
            >
              나중에
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
