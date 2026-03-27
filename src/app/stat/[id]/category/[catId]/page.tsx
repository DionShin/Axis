'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Plus, GitFork, Flame } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statsAPI, categoriesAPI, routinesAPI, logsAPI } from '@/lib/api';
import { formatFrequency, rateColor } from '@/lib/utils';
import WeeklyDots from '@/components/WeeklyDots';
import AddRoutineSheet from '@/components/AddRoutineSheet';
import type { RoutineLog } from '@/lib/types';

export default function CategoryDetailPage() {
  const { id: statId, catId } = useParams<{ id: string; catId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: stat } = useQuery({
    queryKey: ['stat', statId],
    queryFn: () => statsAPI.getOne(statId),
  });

  const { data: category, isLoading } = useQuery({
    queryKey: ['category', catId],
    queryFn: () => categoriesAPI.getOne(catId),
  });

  const { data: routines = [] } = useQuery({
    queryKey: ['routines', catId],
    queryFn: () => routinesAPI.getByCategory(catId),
  });

  // 각 루틴의 주간 로그 조회
  const { data: logsMap = {} } = useQuery({
    queryKey: ['logs', catId],
    queryFn: async () => {
      const entries = await Promise.all(
        routines.map(async r => {
          const logs = await logsAPI.getByRoutine(r.id, 7);
          return [r.id, logs] as const;
        })
      );
      return Object.fromEntries(entries);
    },
    enabled: routines.length > 0,
  });

  // O/X 토글 mutation
  const toggleMutation = useMutation({
    mutationFn: logsAPI.toggle,
    onSuccess: () => {
      // 캐시 무효화 → 자동 리페치
      queryClient.invalidateQueries({ queryKey: ['logs', catId] });
      queryClient.invalidateQueries({ queryKey: ['routines', catId] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const handleToggle = (routineId: string, currentlyDone: boolean) => {
    const today = new Date().toISOString().split('T')[0];
    toggleMutation.mutate({
      routine_id: routineId,
      date: today,
      completed: !currentlyDone,
    });
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="text-gray-600 text-sm animate-pulse">Loading...</div>
      </main>
    );
  }

  if (!category) {
    return (
      <main className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center">
        <p className="text-gray-500">카테고리를 찾을 수 없습니다.</p>
      </main>
    );
  }

  const statColor = stat?.color ?? '#ffffff';
  const today = new Date().toISOString().split('T')[0];

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white px-5 pt-6">

      {/* 헤더 */}
      <header className="flex items-center gap-3 mb-7">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <p className="text-[11px] text-gray-500">{stat?.icon} {stat?.name}</p>
          <h1 className="text-lg font-black">{category.icon} {category.name}</h1>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] text-gray-500">주간 달성률</p>
          <p className="text-lg font-black" style={{ color: rateColor(category.weekly_rate) }}>
            {category.weekly_rate}%
          </p>
        </div>
      </header>

      {/* 루틴 목록 (L3) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300">루틴 목록</h2>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl font-semibold"
            style={{ background: statColor + '22', color: statColor }}
          >
            <Plus size={13} />
            루틴 추가
          </button>
        </div>

        <div className="space-y-3">
          {routines.map(routine => {
            const logs = logsMap[routine.id] ?? [];
            // API 로그를 WeeklyDots가 기대하는 형태로 변환
            const routineLogs: RoutineLog[] = logs.map(l => ({
              routineId: l.routine_id,
              date: l.date,
              completed: l.completed,
            }));
            const todayLog = logs.find(l => l.date === today);
            const isChecked = todayLog?.completed ?? false;

            return (
              <div
                key={routine.id}
                className="rounded-2xl p-4"
                style={{
                  background: '#0f1117',
                  border: isChecked
                    ? `1px solid ${statColor}40`
                    : '1px solid rgba(255,255,255,0.05)',
                }}
              >
                {/* 루틴 상단 행 */}
                <div className="flex items-start gap-3 mb-3">
                  {/* O/X 체크 버튼 */}
                  <button
                    onClick={() => handleToggle(routine.id, isChecked)}
                    disabled={toggleMutation.isPending}
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm transition-all shrink-0 active:scale-90 disabled:opacity-50"
                    style={{
                      background: isChecked ? statColor : 'rgba(255,255,255,0.05)',
                      color: isChecked ? '#fff' : '#4b5563',
                      border: `1.5px solid ${isChecked ? statColor : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {isChecked ? 'O' : '·'}
                  </button>

                  {/* 루틴 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold text-sm ${isChecked ? 'line-through text-gray-500' : ''}`}>
                        {routine.name}
                      </p>
                      {routine.is_forked && (
                        <GitFork size={11} className="text-purple-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-500">
                        {formatFrequency(routine.frequency, routine.days_of_week)}
                      </span>
                      {routine.notification_time && (
                        <span className="text-[11px] text-gray-600">· {routine.notification_time}</span>
                      )}
                    </div>
                  </div>

                  {/* 스트릭 */}
                  {routine.streak > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Flame size={13} className="text-orange-400" />
                      <span className="text-[11px] text-orange-400 font-semibold">{routine.streak}</span>
                    </div>
                  )}
                </div>

                {/* 주간 O/X 도트 */}
                <div className="flex items-center justify-between">
                  <WeeklyDots logs={routineLogs} color={statColor} />
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: rateColor(routine.weekly_rate) }}
                  >
                    {routine.weekly_rate}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <AddRoutineSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        categoryId={catId}
        statColor={statColor}
      />
    </main>
  );
}
