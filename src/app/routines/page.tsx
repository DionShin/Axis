'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Archive, RotateCcw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { routinesAPI } from '@/lib/api';
import type { Routine } from '@/lib/types';
import AddRoutineSheet from '@/components/AddRoutineSheet';

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function formatFreq(r: Routine) {
  if (r.frequency_type === 'daily') return '매일';
  if (r.frequency_type === 'weekly') {
    if (r.days_of_week?.length) return r.days_of_week.map(d => DAY_KO[(d + 1) % 7]).join('·') + '요일';
    return `주 ${r.frequency_value ?? '?'}회`;
  }
  return '';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function RoutinesPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { data: active = [] } = useQuery({
    queryKey: ['routines', 'active'],
    queryFn: () => routinesAPI.getAll('active'),
  });

  const { data: archived = [] } = useQuery({
    queryKey: ['routines', 'archived'],
    queryFn: () => routinesAPI.getAll('archived'),
    enabled: showArchived,
  });

  const archiveMutation = useMutation({
    mutationFn: routinesAPI.archive,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routines'] }); },
  });

  const restartMutation = useMutation({
    mutationFn: routinesAPI.restart,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routines'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: routinesAPI.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routines'] }); },
  });

  return (
    <main className="min-h-screen bg-black text-white px-5 pt-8">

      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black mb-1">루틴 관리</h1>
          <p className="text-xs text-gray-500">활성 루틴 {active.length}개</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <Plus size={14} />
          추가
        </button>
      </header>

      {/* 활성 루틴 */}
      <section className="space-y-3 mb-6">
        {active.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-600 text-sm">아직 루틴이 없어요</p>
            <p className="text-gray-700 text-xs mt-1">추가 버튼을 눌러 첫 루틴을 만들어보세요</p>
          </div>
        ) : (
          active.map(r => (
            <div
              key={r.id}
              className="rounded-2xl p-4"
              style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{r.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {r.category && `${r.category} · `}{formatFreq(r)}
                    {r.preferred_time && ` · ${r.preferred_time}`}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">주간 {r.weekly_rate}%</span>
                    {r.streak > 0 && <span className="text-xs text-gray-400">🔥 {r.streak}일 연속</span>}
                  </div>
                </div>
                <button
                  onClick={() => archiveMutation.mutate(r.id)}
                  className="p-2 rounded-xl transition-all active:scale-95 shrink-0"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  title="중단"
                >
                  <Archive size={13} className="text-gray-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* 구분선 */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', marginBottom: 16 }} />

      {/* 중단된 루틴 토글 */}
      <button
        onClick={() => setShowArchived(v => !v)}
        className="w-full flex items-center justify-between py-3 text-sm text-gray-400 mb-3"
      >
        <span>중단된 루틴 {archived.length > 0 ? `(${archived.length})` : ''}</span>
        {showArchived ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {showArchived && (
        <section className="space-y-3 pb-24">
          {archived.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-4">중단된 루틴이 없어요</p>
          ) : (
            archived.map(r => (
              <div
                key={r.id}
                className="rounded-2xl p-4 opacity-60"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-through text-gray-400">{r.name}</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      중단일: {r.archived_at ? formatDate(r.archived_at) : '—'}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => restartMutation.mutate(r.id)}
                      className="p-2 rounded-xl transition-all active:scale-95"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                      title="재시작"
                    >
                      <RotateCcw size={13} className="text-white" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(r.id)}
                      className="p-2 rounded-xl transition-all active:scale-95"
                      style={{ background: 'rgba(239,68,68,0.08)' }}
                      title="삭제"
                    >
                      <Trash2 size={13} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      <AddRoutineSheet
        open={addOpen}
        onClose={() => { setAddOpen(false); qc.invalidateQueries({ queryKey: ['routines'] }); }}
      />
    </main>
  );
}
