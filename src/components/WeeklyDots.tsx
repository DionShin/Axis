'use client';

import { DAY_LABELS, getWeekDates } from '@/lib/utils';
import type { RoutineLog } from '@/lib/types';

interface Props {
  logs: RoutineLog[];
  color?: string;
}

// 요일별 O/X 도트 (이번 주 7일 표시)
export default function WeeklyDots({ logs, color = '#ffffff' }: Props) {
  const weekDates = getWeekDates();
  const logMap = new Map(logs.map(l => [l.date, l.completed]));
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex gap-1.5">
      {weekDates.map((date, i) => {
        const completed = logMap.get(date);
        const isFuture = date > today;
        const isToday = date === today;

        return (
          <div key={date} className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-gray-600">{DAY_LABELS[i]}</span>
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border ${
                isToday ? 'border-white/20' : 'border-transparent'
              }`}
              style={{
                background: isFuture
                  ? 'rgba(255,255,255,0.04)'
                  : completed
                  ? color + '33'  // 33 = 20% opacity in hex
                  : completed === false
                  ? 'rgba(248,113,113,0.15)'
                  : 'rgba(255,255,255,0.04)',
              }}
            >
              {!isFuture && completed !== undefined && (
                <span style={{ color: completed ? color : '#f87171' }}>
                  {completed ? 'O' : 'X'}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
