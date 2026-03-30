'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Settings, Bell, BellOff, Share2, ChevronRight, Trophy, Target, Flame, Check, Pencil, X } from 'lucide-react';
import { statsAPI, routinesAPI, historyAPI, onboardingAPI } from '@/lib/api';
import { subscribePush, unsubscribePush, isPushSubscribed } from '@/lib/push';
import { useAuth } from '@/lib/auth-context';

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [editingName, setEditingName] = useState(false);
  const [nickname, setNickname] = useState('');
  const [draftName, setDraftName] = useState('');
  const [nicknameLoading, setNicknameLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 닉네임 로드
  useEffect(() => {
    onboardingAPI.getStatus().then(data => {
      setNickname(data.nickname || '나의 닉네임');
    }).catch(() => {
      setNickname('나의 닉네임');
    }).finally(() => {
      setNicknameLoading(false);
    });
  }, []);

  // 현재 구독 상태 확인
  useEffect(() => {
    isPushSubscribed().then(setPushEnabled);
  }, []);

  const togglePush = async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unsubscribePush();
        setPushEnabled(false);
      } else {
        // VAPID 공개키 조회
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/push/vapid-key`).catch(() => null);
        let vapidKey = '';
        if (res?.ok) {
          const json = await res.json();
          vapidKey = json.vapidPublicKey;
        }
        if (!vapidKey || vapidKey.startsWith('YOUR_')) {
          alert('알림 기능은 VAPID 키 설정 후 사용할 수 있습니다.\nbackend/.env에 VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY를 설정하세요.');
          return;
        }
        const ok = await subscribePush(vapidKey);
        setPushEnabled(ok);
        if (!ok) alert('알림 권한이 거부되었거나 오류가 발생했습니다.');
      }
    } finally {
      setPushLoading(false);
    }
  };

  const { data: stats = [] } = useQuery({ queryKey: ['stats'], queryFn: statsAPI.getAll });
  const { data: todayRoutines = [] } = useQuery({ queryKey: ['routines', 'today'], queryFn: routinesAPI.getToday });
  const { data: history = [] } = useQuery({ queryKey: ['history'], queryFn: historyAPI.getAll });

  const avgScore = stats.length
    ? Math.round(stats.reduce((s, r) => s + r.score, 0) / stats.length)
    : 0;
  const level = Math.floor(avgScore / 5) + 1;
  const xpCurrent = (avgScore % 5) * 20;
  const totalStreak = todayRoutines.length ? Math.max(...todayRoutines.map(r => r.streak), 0) : 0;
  const habitsFormed = history.filter(h => h.event_type === 'habit_formed').length;

  const startEdit = () => { setDraftName(nickname); setEditingName(true); };
  const confirmEdit = async () => {
    const trimmed = draftName.trim();
    if (trimmed) {
      try {
        await onboardingAPI.updateProfile(trimmed);
        setNickname(trimmed);
      } catch {
        // 실패해도 로컬 상태는 유지
        setNickname(trimmed);
      }
    }
    setEditingName(false);
  };

  return (
    <main className="min-h-screen bg-black text-white px-5 pt-8">

      {/* 헤더 */}
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-black">프로필</h1>
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <Settings size={18} className="text-gray-400" />
        </button>
      </header>

      {/* 유저 카드 */}
      <section
        className="rounded-2xl p-5 mb-6"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            🧑
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-white font-semibold tracking-wider mb-0.5">LEVEL {level}</p>
            {/* 닉네임 인라인 편집 */}
            {nicknameLoading ? (
              <div className="h-7 w-32 bg-gray-800 rounded animate-pulse" />
            ) : editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmEdit()}
                  maxLength={20}
                  className="bg-transparent border-b border-white text-xl font-black outline-none w-36 text-white"
                />
                <button onClick={confirmEdit}>
                  <Check size={16} className="text-white" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black truncate">{nickname}</h2>
                <button onClick={startEdit}>
                  <Pencil size={13} className="text-gray-600" />
                </button>
              </div>
            )}
            {user?.email && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>
            )}
            <p className="text-xs text-gray-500">{todayRoutines.length}개 루틴 운영 중</p>
          </div>
        </div>

        {/* XP 바 */}
        <div className="mb-1 flex justify-between text-[10px] text-gray-500">
          <span>Lv.{level}</span>
          <span>{xpCurrent} / 100 XP → Lv.{level + 1}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-white to-gray-400 transition-all duration-700"
            style={{ width: `${xpCurrent}%` }}
          />
        </div>
      </section>

      {/* 스탯 요약 */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">5대 스탯</h2>
        <div className="space-y-2.5">
          {stats.map(stat => (
            <div key={stat.id} className="flex items-center gap-3">
              <span className="text-base w-6 text-center">{stat.icon}</span>
              <span className="text-xs text-gray-400 w-12">{stat.name}</span>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${stat.score}%`, background: stat.color }}
                />
              </div>
              <span className="text-xs font-bold w-8 text-right" style={{ color: stat.color }}>
                {Math.round(stat.score)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 업적 카드 */}
      <section className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: <Flame size={20} className="text-orange-400" />, value: `${totalStreak}일`, label: '최장 스트릭', bg: 'rgba(251,146,60,0.1)' },
          { icon: <Trophy size={20} className="text-yellow-400" />, value: `${habitsFormed}개`, label: '정착한 습관', bg: 'rgba(251,191,36,0.1)' },
          { icon: <Target size={20} className="text-white" />,   value: `${todayRoutines.length}개`, label: '오늘 루틴', bg: 'rgba(255,255,255,0.1)' },
        ].map(item => (
          <div
            key={item.label}
            className="rounded-2xl p-4 flex flex-col items-center gap-2"
            style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: item.bg }}>
              {item.icon}
            </div>
            <span className="text-base font-black">{item.value}</span>
            <span className="text-[10px] text-gray-500 text-center">{item.label}</span>
          </div>
        ))}
      </section>

      {/* 설정 메뉴 */}
      <section className="space-y-2">
        {/* 푸시 알림 토글 */}
        <button
          onClick={togglePush}
          disabled={pushLoading}
          className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {pushEnabled
            ? <Bell size={16} className="text-white" />
            : <BellOff size={16} className="text-gray-400" />
          }
          <span className="text-sm flex-1 text-left">
            {pushLoading ? '처리 중...' : pushEnabled ? '알림 켜짐' : '알림 받기'}
          </span>
          {/* 토글 스위치 */}
          <div
            className="w-10 h-5 rounded-full transition-colors duration-200 relative"
            style={{ background: pushEnabled ? '#ffffff' : 'rgba(255,255,255,0.1)' }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
              style={{ left: pushEnabled ? '22px' : '2px' }}
            />
          </div>
        </button>

        <button
          onClick={() => router.push('/community')}
          className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Share2 size={16} className="text-gray-400" />
          <span className="text-sm flex-1 text-left">내 루틴 공유하기</span>
          <ChevronRight size={15} className="text-gray-700" />
        </button>
      </section>

      {/* 설정 시트 */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl p-6 pb-10"
            style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black">설정</h2>
              <button onClick={() => setSettingsOpen(false)} className="p-1">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* 계정 섹션 */}
            <div className="mb-6">
              <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">계정</p>
              <div
                className="rounded-2xl p-4"
                style={{ background: '#000', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <p className="text-xs text-gray-500 mb-0.5">이메일</p>
                <p className="text-sm text-white">{user?.email ?? '—'}</p>
              </div>
            </div>

            {/* 로그아웃 */}
            <button
              onClick={signOut}
              className="w-full p-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] mb-3"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
            >
              로그아웃
            </button>

            {/* 닫기 */}
            <button
              onClick={() => setSettingsOpen(false)}
              className="w-full p-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', color: '#9ca3af' }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
