'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellOff, Check, Pencil, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { onboardingAPI } from '@/lib/api';
import { subscribePush, unsubscribePush, isPushSubscribed } from '@/lib/push';
import { useAuth } from '@/lib/auth-context';

const REMINDER_OPTIONS = ['07:00', '08:00', '09:00', '12:00', '18:00', '20:00', '21:00', '22:00', '23:00'];

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [nickname, setNickname] = useState('');
  const [editingNick, setEditingNick] = useState(false);
  const [draftNick, setDraftNick] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [reminderTime, setReminderTime] = useState('22:00');
  const [reminderSaving, setReminderSaving] = useState(false);

  const { data: status } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: onboardingAPI.getStatus,
  });

  useEffect(() => {
    if (status) {
      setNickname(status.nickname || '');
      setReminderTime(status.reminder_time || '22:00');
    }
  }, [status]);

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled);
  }, []);

  const saveNickname = async () => {
    const trimmed = draftNick.trim();
    if (!trimmed) return;
    try {
      await onboardingAPI.updateProfile(trimmed);
      setNickname(trimmed);
    } catch {}
    setEditingNick(false);
  };

  const togglePush = async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unsubscribePush();
        setPushEnabled(false);
      } else {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/push/vapid-key`).catch(() => null);
        if (!res?.ok) { alert('VAPID 키 설정이 필요합니다.'); return; }
        const { vapidPublicKey } = await res.json();
        if (!vapidPublicKey || vapidPublicKey.startsWith('YOUR_')) { alert('VAPID 키를 설정해주세요.'); return; }
        const ok = await subscribePush(vapidPublicKey);
        setPushEnabled(ok);
        if (!ok) alert('알림 권한이 거부되었습니다.');
      }
    } finally {
      setPushLoading(false);
    }
  };

  const saveReminderTime = async (time: string) => {
    setReminderTime(time);
    setReminderSaving(true);
    try {
      await onboardingAPI.saveReminder(time);
    } finally {
      setReminderSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-5 pt-8">

      <header className="mb-8">
        <h1 className="text-xl font-black">설정</h1>
      </header>

      {/* 프로필 */}
      <section className="mb-6">
        <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-3">프로필</p>
        <div
          className="rounded-2xl p-4"
          style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-[10px] text-gray-500 mb-1">닉네임</p>
          {editingNick ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={draftNick}
                onChange={e => setDraftNick(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveNickname()}
                maxLength={20}
                className="flex-1 bg-transparent border-b border-white text-base font-bold outline-none text-white"
              />
              <button onClick={saveNickname}><Check size={15} className="text-white" /></button>
              <button onClick={() => setEditingNick(false)}><X size={15} className="text-gray-500" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-base font-bold">{nickname || '—'}</p>
              <button onClick={() => { setDraftNick(nickname); setEditingNick(true); }}>
                <Pencil size={13} className="text-gray-600" />
              </button>
            </div>
          )}
          {user?.email && <p className="text-xs text-gray-600 mt-2">{user.email}</p>}
        </div>
      </section>

      {/* 알림 */}
      <section className="mb-6">
        <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-3">알림</p>
        <div
          className="rounded-2xl p-4 mb-3"
          style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {pushEnabled ? <Bell size={16} className="text-white" /> : <BellOff size={16} className="text-gray-500" />}
              <span className="text-sm">{pushLoading ? '처리 중...' : pushEnabled ? '알림 켜짐' : '알림 받기'}</span>
            </div>
            <button
              onClick={togglePush}
              disabled={pushLoading}
              className="w-10 h-5 rounded-full transition-colors relative disabled:opacity-50"
              style={{ background: pushEnabled ? '#ffffff' : 'rgba(255,255,255,0.1)' }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                style={{ left: pushEnabled ? 22 : 2, background: pushEnabled ? '#000' : '#fff' }}
              />
            </button>
          </div>
        </div>

        <div
          className="rounded-2xl p-4"
          style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-xs text-gray-500 mb-3">알림 시간 {reminderSaving && <span className="text-gray-600">저장 중...</span>}</p>
          <div className="flex flex-wrap gap-2">
            {REMINDER_OPTIONS.map(t => (
              <button
                key={t}
                onClick={() => saveReminderTime(t)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: reminderTime === t ? '#ffffff' : 'rgba(255,255,255,0.06)',
                  color: reminderTime === t ? '#000' : '#9ca3af',
                  border: reminderTime === t ? 'none' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 계정 */}
      <section className="mb-6">
        <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-3">계정</p>
        <button
          onClick={signOut}
          className="w-full p-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}
        >
          로그아웃
        </button>
      </section>

    </main>
  );
}
