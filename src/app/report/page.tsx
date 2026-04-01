'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsAPI } from '@/lib/api';

type Period = 'weekly' | 'monthly';

export default function ReportPage() {
  const [period, setPeriod] = useState<Period>('weekly');

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', period],
    queryFn: () => period === 'weekly' ? reportsAPI.weekly() : reportsAPI.monthly(),
  });

  return (
    <main className="min-h-screen bg-black text-white px-5 pt-8">

      <header className="mb-6">
        <h1 className="text-xl font-black mb-1">리포트</h1>
        <p className="text-xs text-gray-500">내 루틴 패턴을 확인해보세요</p>
      </header>

      {/* 기간 토글 */}
      <div className="flex rounded-xl p-1 mb-6" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {(['weekly', 'monthly'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: period === p ? '#ffffff' : 'transparent', color: period === p ? '#000' : '#6b7280' }}
          >
            {p === 'weekly' ? '이번 주' : '이번 달'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : report ? (
        <div className="space-y-4">

          {/* 전체 달성률 */}
          <section
            className="rounded-2xl p-5"
            style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <p className="text-xs text-gray-500 mb-1">전체 달성률</p>
            <p className="text-4xl font-black mb-3" style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
              {report.completion_rate}<span className="text-xl font-normal text-gray-500">%</span>
            </p>
            <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${report.completion_rate}%`, background: 'rgba(255,255,255,0.8)' }}
              />
            </div>
            <p className="text-[10px] text-gray-600 mt-1.5">{report.period.start} ~ {report.period.end}</p>
          </section>

          {/* 베스트 / 워스트 */}
          <div className="grid grid-cols-2 gap-3">
            <section
              className="rounded-2xl p-4"
              style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-xs text-gray-500 mb-2">🏆 가장 잘 된 루틴</p>
              {report.best_routine ? (
                <>
                  <p className="text-sm font-bold leading-snug mb-1">{report.best_routine.name}</p>
                  <p className="text-xl font-black">{report.best_routine.rate}%</p>
                </>
              ) : <p className="text-xs text-gray-600">없음</p>}
            </section>
            <section
              className="rounded-2xl p-4"
              style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-xs text-gray-500 mb-2">💔 가장 많이 빠진 루틴</p>
              {report.worst_routine ? (
                <>
                  <p className="text-sm font-bold leading-snug mb-1">{report.worst_routine.name}</p>
                  <p className="text-xl font-black">{report.worst_routine.rate}%</p>
                </>
              ) : <p className="text-xs text-gray-600">없음</p>}
            </section>
          </div>

          {/* 패턴 요약 */}
          <section
            className="rounded-2xl p-4"
            style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-xs text-gray-500 mb-2">패턴 요약</p>
            <p className="text-sm leading-relaxed text-gray-200">{report.pattern_summary}</p>
          </section>

          {/* 다음 행동 제안 */}
          <section
            className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-xs text-gray-500 mb-2">→ 다음 행동 제안</p>
            <p className="text-sm leading-relaxed text-white font-medium">{report.next_action}</p>
          </section>

        </div>
      ) : null}
    </main>
  );
}
