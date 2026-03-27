'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, GitFork } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { statsAPI, categoriesAPI, communityAPI } from '@/lib/api';
import type { CommunityRoutineResponse } from '@/lib/api';

interface Props {
  routine: CommunityRoutineResponse | null;
  onClose: () => void;
}

/**
 * 커뮤니티 루틴 포킹 모달.
 * Step 1: 스탯 선택 → Step 2: 카테고리 선택 → Step 3: 알림 시간 커스텀 → 완료
 */
export default function ForkModal({ routine, onClose }: Props) {
  const qc = useQueryClient();
  const open = !!routine;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedStatId, setSelectedStatId] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [notifTime, setNotifTime] = useState(routine?.notification_time ?? '');

  const { data: stats = [] } = useQuery({
    queryKey: ['stats'],
    queryFn: statsAPI.getAll,
    enabled: open,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', selectedStatId],
    queryFn: () => categoriesAPI.getByStat(selectedStatId),
    enabled: !!selectedStatId,
  });

  const mutation = useMutation({
    mutationFn: () =>
      communityAPI.fork(routine!.id, selectedCatId, notifTime || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routines'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      handleClose();
    },
  });

  const handleClose = () => {
    setStep(1); setSelectedStatId(''); setSelectedCatId('');
    setNotifTime(routine?.notification_time ?? '');
    onClose();
  };

  const selectedStat = stats.find(s => s.id === selectedStatId);

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title={step === 1 ? '어느 스탯에 추가?' : step === 2 ? '어느 카테고리에 추가?' : '알림 시간 설정'}
    >
      {/* Step 1: 스탯 선택 */}
      {step === 1 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-4">
            <span className="text-white font-semibold">'{routine?.routine_name}'</span>을 어느 스탯에 추가할까요?
          </p>
          {stats.map(stat => (
            <button
              key={stat.id}
              onClick={() => { setSelectedStatId(stat.id); setStep(2); }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-xl">{stat.icon}</span>
              <span className="flex-1 font-semibold text-sm">{stat.name}</span>
              <ChevronRight size={15} className="text-gray-600" />
            </button>
          ))}
        </div>
      )}

      {/* Step 2: 카테고리 선택 */}
      {step === 2 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setStep(1)} className="text-xs text-gray-500">← 스탯 변경</button>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: (selectedStat?.color ?? '#ffffff') + '22', color: selectedStat?.color }}
            >
              {selectedStat?.icon} {selectedStat?.name}
            </span>
          </div>
          {categories.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">카테고리가 없습니다. 먼저 카테고리를 추가해주세요.</p>
          )}
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCatId(cat.id); setStep(3); }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-xl">{cat.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm">{cat.name}</p>
                <p className="text-[11px] text-gray-500">{cat.routine_count}개 루틴</p>
              </div>
              <ChevronRight size={15} className="text-gray-600" />
            </button>
          ))}
        </div>
      )}

      {/* Step 3: 알림 시간 커스텀 */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setStep(2)} className="text-xs text-gray-500">← 카테고리 변경</button>
          </div>

          {/* 루틴 요약 */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs text-gray-500 mb-1">추가될 루틴</p>
            <p className="font-bold">{routine?.routine_name}</p>
            <p className="text-xs text-gray-500 mt-0.5">by {routine?.author_name}</p>
          </div>

          {/* 알림 시간 */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">알림 시간 커스텀</label>
            <input
              type="time"
              value={notifTime}
              onChange={e => setNotifTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
            />
            <p className="text-[11px] text-gray-600 mt-1">비워두면 원본 시간({routine?.notification_time ?? '없음'}) 유지</p>
          </div>

          {mutation.isError && (
            <p className="text-xs text-red-400">추가 실패. 다시 시도해주세요.</p>
          )}

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: '#ffffff', color: '#fff' }}
          >
            <GitFork size={15} />
            {mutation.isPending ? '추가 중...' : '내 플랜에 추가하기'}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
