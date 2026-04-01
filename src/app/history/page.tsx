'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { checksAPI, routinesAPI } from '@/lib/api';
import type { HeatmapItem } from '@/lib/types';

type Period = 'weekly' | 'monthly';

function getRateColor(rate: number): string {
  if (rate === 0) return 'rgba(255,255,255,0.05)';
  if (rate < 40) return 'rgba(255,255,255,0.15)';
  if (rate < 70) return 'rgba(255,255,255,0.4)';
  return 'rgba(255,255,255,0.85)';
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

export default function HistoryPage() {
  const [period, setPeriod] = useState<Period>('weekly');
  const days = period === 'weekly' ? 28 : 90;

  const { data: heatmap = [], isLoading } = useQuery({
    queryKey: ['heatmap', days],
    queryFn: () => checksAPI.heatmap(days),
  });

  const { data: routines = [] } = useQuery({
    queryKey: ['routines', 'active'],
    queryFn: () => routinesAPI.getAll('active'),
  });

  // 히트맵을 주 단위로 그룹핑
  const weeks: HeatmapItem[][] = [];
  if (heatmap.length > 0) {
    // 첫날 요일에 맞게 패딩
    const firstDate = new Date(heatmap[0].date);
    const firstDow = (firstDate.getDay() + 6) % 7; // 월=0
    const padded: (HeatmapItem | null)[] = [...Array(firstDow).fill(null), ...heatmap];
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7) as HeatmapItem[]);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-5 pt-8">

      <header className="mb-6">
        <h1 className="text-xl font-black mb-1">히스토리</h1>
        <p className="text-xs text-gray-500">내 루틴의 흐름을 확인해보세요</p>
      </header>

      {/* 기간 토글 */}
      <div
        className="flex rounded-xl p-1 mb-6"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        {(['weekly', 'monthly'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: period === p ? '#ffffff' : 'transparent',
              color: period === p ? '#000' : '#6b7280',
            }}
          >
            {p === 'weekly' ? '4주' : '3개월'}
          </button>
        ))}
      </div>

      {/* 히트맵 */}
      <section className="mb-8">
        <div className="flex gap-1 mb-1.5">
          {DAY_LABELS.map(d => (
            <div key={d} className="flex-1 text-center text-[10px] text-gray-600">{d}</div>
          ))}
        </div>
        {isLoading ? (
          <div className="h-32 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ) : (
          <div className="space-y-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex gap-1">
                {Array.from({ length: 7 }, (_, di) => {
                  const item = week[di];
                  if (!item) return <div key={di} className="flex-1 aspect-square" />;
                  return (
                    <div
                      key={di}
                      className="flex-1 aspect-square rounded-sm"
                      style={{ background: getRateColor(item.rate) }}
                      title={`${item.date}: ${item.checked}/${item.total}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-2 justify-end">
          <span className="text-[10px] text-gray-600">적음</span>
          {[0, 25, 50, 75, 100].map(r => (
            <div key={r} className="w-3 h-3 rounded-sm" style={{ background: getRateColor(r) }} />
          ))}
          <span className="text-[10px] text-gray-600">많음</span>
        </div>
      </section>

      {/* 구분선 */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', marginBottom: 24 }} />

      {/* 루틴별 현황 */}
      <section className="space-y-3 pb-24">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">루틴별 현황</h2>
        {routines.map(r => (
          <div
            key={r.id}
            className="rounded-2xl p-4"
            style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">{r.name}</p>
              <div className="flex items-center gap-2">
                {r.streak > 0 && <span className="text-xs text-gray-400">🔥 {r.streak}일</span>}
                <span className="text-xs font-bold text-white">{r.weekly_rate}%</span>
              </div>
            </div>
            <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${r.weekly_rate}%`, background: 'rgba(255,255,255,0.7)' }}
              />
            </div>
            <p className="text-[10px] text-gray-600 mt-1.5">최근 7일 달성률</p>
          </div>
        ))}
        {routines.length === 0 && (
          <p className="text-center text-gray-600 text-sm py-8">활성 루틴이 없어요</p>
        )}
      </section>
    </main>
  );
}
