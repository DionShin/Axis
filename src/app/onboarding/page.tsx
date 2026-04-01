'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { onboardingAPI } from '@/lib/api';

// ─── 상수 ──────────────────────────────────────────────────────────
const INTRO_CARDS = [
  { icon: '✅', title: '하루 1분 체크', desc: '복잡한 기록 없이, 오늘 루틴을 체크하는 것만으로 충분해요.' },
  { icon: '📈', title: '루틴 흐름 시각화', desc: '며칠, 몇 주에 걸친 내 루틴 패턴을 한눈에 볼 수 있어요.' },
  { icon: '🔄', title: '실패도 데이터예요', desc: '며칠 빠졌어도 괜찮아요. 다시 시작하면 그게 기록이에요.' },
];

const GOAL_CATEGORIES = [
  { id: '운동', icon: '💪', label: '운동' },
  { id: '공부', icon: '📚', label: '공부' },
  { id: '생산성', icon: '🎯', label: '생산성' },
  { id: '생활습관', icon: '🌿', label: '생활습관' },
  { id: '자기계발', icon: '🧠', label: '자기계발' },
];

const DIFFICULTY_OPTIONS = [
  { id: 'start', label: '시작하기', desc: '어디서 시작해야 할지 모르겠어요' },
  { id: 'consistency', label: '꾸준히 하기', desc: '시작은 하는데 며칠 못 가요' },
  { id: 'restart', label: '다시 시작하기', desc: '한번 끊기면 다시 못 시작해요' },
];

const REMINDER_OPTIONS = ['07:00', '08:00', '09:00', '20:00', '21:00', '22:00', '23:00'];

type Step = 'intro' | 'goals' | 'routines' | 'reminder' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step | null>(null);
  const [introIndex, setIntroIndex] = useState(0);

  // goals step
  const [goalCat, setGoalCat] = useState('');
  const [difficulty, setDifficulty] = useState('');

  // routines step
  const [recommended, setRecommended] = useState<{ name: string; category: string; frequency_type: string }[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [customName, setCustomName] = useState('');

  // reminder step
  const [reminderTime, setReminderTime] = useState('22:00');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return; }
      try {
        const status = await onboardingAPI.getStatus();
        if (status.completed) { router.replace('/'); return; }
        if (!status.nickname) { router.replace('/onboarding/nickname'); return; }
        // 닉네임 있으면 goals 단계부터
        setStep(status.goal_category ? 'routines' : 'goals');
        if (status.goal_category) {
          setGoalCat(status.goal_category);
          loadRecommended();
        }
      } catch {
        setStep('goals');
      }
    });
  }, []);

  const loadRecommended = async () => {
    try {
      const res = await onboardingAPI.getRecommendedRoutines();
      setRecommended(res.routines);
      setSelected(new Set([0, 1])); // 기본 첫 2개 선택
    } catch {}
  };

  // ─── 인트로 ────────────────────────────────────────────────────
  if (step === null) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-gray-600 text-sm animate-pulse">Loading...</div>
    </main>
  );

  // intro는 goals 전에 별도 처리
  if (step === 'intro') {
    const card = INTRO_CARDS[introIndex];
    return (
      <main className="min-h-screen bg-black text-white flex flex-col px-6 pt-16">
        <div className="flex gap-1.5 mb-12">
          {INTRO_CARDS.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full" style={{ background: i <= introIndex ? '#fff' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-5xl mb-8">{card.icon}</p>
          <h2 className="text-3xl font-black mb-4">{card.title}</h2>
          <p className="text-gray-400 text-base leading-relaxed">{card.desc}</p>
        </div>
        <button
          onClick={() => {
            if (introIndex < INTRO_CARDS.length - 1) { setIntroIndex(i => i + 1); }
            else setStep('goals');
          }}
          className="w-full py-4 rounded-2xl font-bold text-base mb-8 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #fff, #d1d5db)', color: '#000' }}
        >
          {introIndex < INTRO_CARDS.length - 1 ? '다음' : '시작하기'}
          <ChevronRight size={18} />
        </button>
      </main>
    );
  }

  // ─── 목표 선택 ────────────────────────────────────────────────
  if (step === 'goals') {
    const canNext = goalCat && difficulty;
    return (
      <main className="min-h-screen bg-black text-white px-5 pt-12">
        <p className="text-xs text-gray-500 tracking-wider mb-2">1 / 3</p>
        <h2 className="text-2xl font-black mb-1">어떤 영역을 관리하고 싶나요?</h2>
        <p className="text-sm text-gray-500 mb-8">메인으로 관리할 분야를 하나 선택하세요</p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {GOAL_CATEGORIES.map(g => (
            <button
              key={g.id}
              onClick={() => setGoalCat(g.id)}
              className="flex flex-col items-center gap-2 py-5 rounded-2xl transition-all"
              style={{
                background: goalCat === g.id ? '#ffffff' : 'rgba(255,255,255,0.05)',
                border: goalCat === g.id ? 'none' : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <span className="text-2xl">{g.icon}</span>
              <span className="text-sm font-semibold" style={{ color: goalCat === g.id ? '#000' : '#fff' }}>{g.label}</span>
            </button>
          ))}
        </div>

        <p className="text-sm font-semibold mb-3">가장 어려운 문제는 뭔가요?</p>
        <div className="space-y-2 mb-8">
          {DIFFICULTY_OPTIONS.map(d => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
              style={{
                background: difficulty === d.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                border: difficulty === d.id ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {difficulty === d.id && <Check size={14} className="text-white shrink-0" />}
              {difficulty !== d.id && <div className="w-3.5 h-3.5 rounded-full border border-gray-600 shrink-0" />}
              <div>
                <p className="text-sm font-semibold">{d.label}</p>
                <p className="text-xs text-gray-500">{d.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          disabled={!canNext || loading}
          onClick={async () => {
            setLoading(true);
            try {
              await onboardingAPI.saveGoals(goalCat, difficulty);
              await loadRecommended();
              setStep('routines');
            } finally { setLoading(false); }
          }}
          className="w-full py-4 rounded-2xl font-bold text-base mb-8 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #fff, #d1d5db)', color: '#000' }}
        >
          {loading ? '저장 중...' : '다음'}
        </button>
      </main>
    );
  }

  // ─── 첫 루틴 선택 ────────────────────────────────────────────
  if (step === 'routines') {
    return (
      <main className="min-h-screen bg-black text-white px-5 pt-12">
        <p className="text-xs text-gray-500 tracking-wider mb-2">2 / 3</p>
        <h2 className="text-2xl font-black mb-1">첫 루틴을 골라보세요</h2>
        <p className="text-sm text-gray-500 mb-2">적게 시작하는 게 오래 갑니다. 1~3개를 추천해요.</p>
        <p className="text-xs text-gray-600 mb-6">선택 후 언제든 추가/삭제할 수 있어요</p>

        <div className="space-y-2 mb-4">
          {recommended.map((r, i) => (
            <button
              key={i}
              onClick={() => setSelected(prev => {
                const next = new Set(prev);
                next.has(i) ? next.delete(i) : next.add(i);
                return next;
              })}
              className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
              style={{
                background: selected.has(i) ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                border: selected.has(i) ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: selected.has(i) ? '#fff' : 'transparent', border: selected.has(i) ? 'none' : '1.5px solid rgba(255,255,255,0.25)' }}
              >
                {selected.has(i) && <Check size={11} color="#000" strokeWidth={3} />}
              </div>
              <div>
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-gray-500">{r.frequency_type === 'daily' ? '매일' : '주 3회'}</p>
              </div>
            </button>
          ))}
        </div>

        {/* 직접 추가 */}
        <div className="flex gap-2 mb-8">
          <input
            type="text"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            placeholder="직접 입력 (선택)"
            maxLength={40}
            onKeyDown={async e => {
              if (e.key === 'Enter' && customName.trim()) {
                setRecommended(prev => [...prev, { name: customName.trim(), category: goalCat, frequency_type: 'daily' }]);
                setSelected(prev => new Set([...prev, recommended.length]));
                setCustomName('');
              }
            }}
            className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>

        <button
          disabled={selected.size === 0 || loading}
          onClick={async () => {
            setLoading(true);
            try {
              const toCreate = [...selected].map(i => ({
                name: recommended[i].name,
                category: recommended[i].category,
                frequency_type: recommended[i].frequency_type,
              }));
              await onboardingAPI.saveRoutines(toCreate);
              setStep('reminder');
            } finally { setLoading(false); }
          }}
          className="w-full py-4 rounded-2xl font-bold text-base mb-4 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #fff, #d1d5db)', color: '#000' }}
        >
          {loading ? '저장 중...' : `${selected.size}개 루틴으로 시작하기`}
        </button>

        <button onClick={() => setStep('reminder')} className="w-full py-3 text-sm text-gray-600">
          건너뛰기
        </button>
      </main>
    );
  }

  // ─── 알림 시간 ───────────────────────────────────────────────
  if (step === 'reminder') {
    return (
      <main className="min-h-screen bg-black text-white px-5 pt-12">
        <p className="text-xs text-gray-500 tracking-wider mb-2">3 / 3</p>
        <h2 className="text-2xl font-black mb-1">언제 알림을 보내드릴까요?</h2>
        <p className="text-sm text-gray-500 mb-8">매일 이 시간에 루틴 체크 알림을 보내드려요</p>

        <div className="grid grid-cols-3 gap-3 mb-10">
          {REMINDER_OPTIONS.map(t => (
            <button
              key={t}
              onClick={() => setReminderTime(t)}
              className="py-4 rounded-2xl text-sm font-bold transition-all"
              style={{
                background: reminderTime === t ? '#ffffff' : 'rgba(255,255,255,0.05)',
                color: reminderTime === t ? '#000' : '#9ca3af',
                border: reminderTime === t ? 'none' : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              await onboardingAPI.saveReminder(reminderTime);
              await onboardingAPI.complete();
              router.replace('/');
            } finally { setLoading(false); }
          }}
          className="w-full py-4 rounded-2xl font-bold text-base mb-4 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #fff, #d1d5db)', color: '#000' }}
        >
          {loading ? '완료 중...' : '시작하기'}
        </button>

        <button
          onClick={async () => {
            await onboardingAPI.complete();
            router.replace('/');
          }}
          className="w-full py-3 text-sm text-gray-600"
        >
          알림 없이 시작하기
        </button>
      </main>
    );
  }

  return null;
}
