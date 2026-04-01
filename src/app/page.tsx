'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Check, X } from 'lucide-react';
import { routinesAPI, checksAPI, onboardingAPI } from '@/lib/api';
import type { Routine } from '@/lib/types';
import AddRoutineSheet from '@/components/AddRoutineSheet';

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function formatFreq(r: Routine) {
  if (r.frequency_type === 'daily') return '매일';
  if (r.frequency_type === 'weekly') {
    if (r.days_of_week?.length) return r.days_of_week.map(d => DAY_KO[(d + 1) % 7]).join('·') + '요일';
    return `주 ${r.frequency_value ?? '?'}회`;
  }
  return '';
}

export default function HomePage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ['routines', 'today'],
    queryFn: routinesAPI.getToday,
  });

  const { data: status } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: onboardingAPI.getStatus,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, checked }: { id: string; checked: boolean }) =>
      checksAPI.toggle(id, todayString(), checked),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routines', 'today'] }),
  });

  const today = new Date();
  const dateLabel = `${today.getMonth() + 1}월 ${today.getDate()}일 (${DAY_KO[today.getDay()]})`;

  const checked = routines.filter(r => r.today_checked).length;
  const total = routines.length;
  const rate = total > 0 ? Math.round((checked / total) * 100) : 0;

  // 복귀 모드: 오늘 루틴이 있는데 아무것도 체크 안 했고 streak=0인 루틴이 많을 때
  const needsRecovery = total > 0 && checked === 0 && routines.every(r => r.streak === 0);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-600 text-sm animate-pulse">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-5 pt-8">

      {/* 날짜 */}
      <header className="mb-6">
        <p className="text-xs text-gray-500 tracking-wider mb-1">{dateLabel}</p>
        <h1 className="text-2xl font-black" style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
          {status?.nickname ? `${status.nickname}의 오늘` : '오늘의 루틴'}
        </h1>
      </header>

      {/* 달성률 */}
      {total > 0 && (
        <section className="mb-6">
          <div className="flex items-end justify-between mb-2">
            <span className="text-4xl font-black">{checked}<span className="text-lg text-gray-500 font-normal"> / {total}</span></span>
            <span className="text-sm text-gray-400">{rate}% 완료</span>
          </div>
          <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${rate}%`,
                background: rate === 100 ? 'linear-gradient(90deg, #fff, #d1d5db)' : 'rgba(255,255,255,0.7)',
              }}
            />
          </div>
        </section>
      )}

      {/* 복귀 모드 배너 */}
      {needsRecovery && (
        <section
          className="rounded-2xl p-4 mb-5 flex items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <RefreshCw size={18} className="text-white shrink-0" />
          <div>
            <p className="text-sm font-semibold">다시 시작해도 괜찮아요</p>
            <p className="text-xs text-gray-500 mt-0.5">오늘 하나만 체크해보세요. 그게 시작이에요.</p>
          </div>
        </section>
      )}

      {/* 구분선 */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', marginBottom: 20 }} />

      {/* 루틴 목록 */}
      <section className="space-y-3 mb-6">
        {total === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-sm mb-1">오늘 예정된 루틴이 없어요</p>
            <p className="text-gray-700 text-xs">아래 버튼으로 첫 루틴을 추가해보세요</p>
          </div>
        ) : (
          routines.map(routine => (
            <button
              key={routine.id}
              onClick={() => toggleMutation.mutate({ id: routine.id, checked: !routine.today_checked })}
              className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98] text-left"
              style={{
                background: routine.today_checked
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                border: routine.today_checked
                  ? '1px solid rgba(255,255,255,0.2)'
                  : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {/* 체크박스 */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all"
                style={{
                  background: routine.today_checked ? '#ffffff' : 'transparent',
                  border: routine.today_checked ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
                }}
              >
                {routine.today_checked && <Check size={14} color="#000" strokeWidth={3} />}
              </div>

              {/* 내용 */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${routine.today_checked ? 'text-gray-400 line-through' : 'text-white'}`}>
                  {routine.name}
                </p>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  {formatFreq(routine)}
                  {routine.preferred_time && ` · ${routine.preferred_time}`}
                  {routine.streak > 0 && ` · 🔥 ${routine.streak}일`}
                </p>
              </div>
            </button>
          ))
        )}
      </section>

      {/* 루틴 추가 버튼 */}
      <button
        onClick={() => setAddOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Plus size={16} />
        루틴 추가
      </button>

      <AddRoutineSheet open={addOpen} onClose={() => { setAddOpen(false); qc.invalidateQueries({ queryKey: ['routines'] }); }} />
    </main>
  );
}
