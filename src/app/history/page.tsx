'use client';

import { useQuery } from '@tanstack/react-query';
import { historyAPI, statsAPI } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import type { HistoryEventType } from '@/lib/types';

// 이벤트 타입별 아이콘, 라벨, 색상
const EVENT_META: Record<HistoryEventType, { icon: string; label: string; color: string }> = {
  routine_added:   { icon: '➕', label: '루틴 시작',      color: '#ffffff' },
  routine_deleted: { icon: '🗑️', label: '루틴 삭제',      color: '#f87171' },
  habit_formed:    { icon: '🏆', label: '습관 정착',      color: '#fbbf24' },
  forked:          { icon: '🔀', label: '루틴 복제',      color: '#a78bfa' },
  quit:            { icon: '🚩', label: '포기',           color: '#f87171' },
  streak_broken:   { icon: '💔', label: '연속 달성 중단', color: '#fb923c' },
};

// 날짜 포맷: '2026.03.11 (수)'
function formatFullDate(isoString: string): string {
  const d = new Date(isoString);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${days[d.getDay()]})`;
}

export default function HistoryPage() {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: historyAPI.getAll,
  });

  const { data: stats = [] } = useQuery({
    queryKey: ['stats'],
    queryFn: statsAPI.getAll,
  });

  // 이미 내림차순 정렬돼서 옴 (서버에서 처리)
  const sorted = history;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-600 text-sm animate-pulse">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-5 pt-8">

      {/* 헤더 */}
      <header className="mb-8">
        <h1 className="text-xl font-black mb-1">성장 히스토리</h1>
        <p className="text-xs text-gray-500">나의 루틴 여정을 돌아보세요</p>
      </header>

      {/* 요약 통계 */}
      <section className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: '정착한 습관', value: history.filter(h => h.event_type === 'habit_formed').length, color: '#fbbf24', icon: '🏆' },
          { label: '복제한 루틴', value: history.filter(h => h.event_type === 'forked').length,       color: '#a78bfa', icon: '🔀' },
          { label: '시작한 루틴', value: history.filter(h => h.event_type === 'routine_added').length, color: '#ffffff', icon: '➕' },
        ].map(item => (
          <div
            key={item.label}
            className="rounded-2xl p-4 flex flex-col items-center gap-1"
            style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-xl font-black" style={{ color: item.color }}>{item.value}</span>
            <span className="text-[10px] text-gray-500 text-center">{item.label}</span>
          </div>
        ))}
      </section>

      {/* 타임라인 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-300 mb-5">타임라인</h2>
        <div className="relative">
          {/* 세로 선 */}
          <div
            className="absolute left-[19px] top-2 bottom-2 w-px"
            style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)' }}
          />

          <div className="space-y-6">
            {sorted.map((item) => {
              const meta = EVENT_META[item.event_type as HistoryEventType] ?? { icon: '📌', label: '기록', color: '#94a3b8' };
              const stat = stats.find(s => s.id === item.stat_id);

              return (
                <div key={item.id} className="flex gap-4">
                  {/* 타임라인 도트 */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0 relative z-10"
                    style={{ background: meta.color + '18', border: `1px solid ${meta.color}33` }}
                  >
                    {meta.icon}
                  </div>

                  {/* 카드 */}
                  <div
                    className="flex-1 rounded-2xl p-4 mb-0"
                    style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {/* 상단 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: meta.color + '18', color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        {stat && (
                          <span
                            className="text-[10px] font-semibold"
                            style={{ color: stat.color }}
                          >
                            {stat.icon} {stat.name}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-600">{timeAgo(item.created_at)}</span>
                    </div>

                    {/* 루틴명 */}
                    {item.routine_name && (
                      <p className="text-sm font-semibold mb-1">'{item.routine_name}'</p>
                    )}

                    {/* 내용 */}
                    <p className="text-xs text-gray-400">{item.content}</p>

                    {/* 메모 (선택) */}
                    {item.note && (
                      <div
                        className="mt-2 p-2 rounded-lg text-[11px] text-gray-500 italic"
                        style={{ background: 'rgba(255,255,255,0.03)' }}
                      >
                        💬 {item.note}
                      </div>
                    )}

                    {/* 날짜 */}
                    <p className="text-[10px] text-gray-700 mt-2">{formatFullDate(item.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
