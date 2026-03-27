'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronRight } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { communityAPI, routinesAPI, statsAPI, type RoutineResponse } from '@/lib/api';

const ALL_TAGS = ['피부', '헬스', '독서', '경제', '자세', '루틴화'];

const FREQ_LABEL: Record<string, string> = {
  daily: '매일',
  alternate: '격일',
  weekdays: '요일 선택',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ShareRoutineSheet({ open, onClose }: Props) {
  const qc = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineResponse | null>(null);
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: todayRoutines = [] } = useQuery({
    queryKey: ['routines', 'today'],
    queryFn: routinesAPI.getToday,
    enabled: open,
  });

  const { data: stats = [] } = useQuery({
    queryKey: ['stats'],
    queryFn: statsAPI.getAll,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: communityAPI.share,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community'] });
      handleClose();
    },
  });

  const handleClose = () => {
    setStep(1);
    setSelectedRoutine(null);
    setDescription('');
    setSelectedTags([]);
    onClose();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (!selectedRoutine) return;

    // stat_id: 오늘 루틴에는 stat_id가 없고 category_id만 있으므로 stat_id는 빈 문자열로 대체
    // 실제 stat_id는 category 조회를 통해 얻어야 하지만 여기서는 category_id를 stat_id 대신 사용
    mutation.mutate({
      stat_id: '',
      category_name: selectedRoutine.name,
      routine_name: selectedRoutine.name,
      description: description.trim() || (selectedRoutine.description ?? ''),
      frequency: selectedRoutine.frequency,
      days_of_week: selectedRoutine.days_of_week,
      notification_time: selectedRoutine.notification_time,
      tags: selectedTags,
      author_name: '익명',
      author_level: 1,
    });
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
  };

  const stepTitle = step === 1 ? '루틴 선택' : step === 2 ? '상세 정보 입력' : '공유 확인';

  return (
    <BottomSheet open={open} onClose={handleClose} title={stepTitle}>
      <div className="space-y-4">

        {/* 스텝 인디케이터 */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {([1, 2, 3] as const).map(s => (
            <div
              key={s}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: step >= s ? '#ffffff' : 'rgba(255,255,255,0.12)',
                width: step === s ? '20px' : '8px',
              }}
            />
          ))}
        </div>

        {/* Step 1: 루틴 선택 */}
        {step === 1 && (
          <>
            <p className="text-xs text-gray-500">공유할 루틴을 선택하세요</p>
            {todayRoutines.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-6">오늘 등록된 루틴이 없습니다.</p>
            )}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {todayRoutines.map(routine => (
                <button
                  key={routine.id}
                  onClick={() => setSelectedRoutine(routine)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all active:scale-[0.98]"
                  style={{
                    background: selectedRoutine?.id === routine.id
                      ? 'rgba(255,255,255,0.15)'
                      : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${selectedRoutine?.id === routine.id ? 'rgba(255,255,255,0.4)' : 'transparent'}`,
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{routine.name}</p>
                    {routine.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{routine.description}</p>
                    )}
                    <p className="text-[10px] text-gray-600 mt-1">
                      {FREQ_LABEL[routine.frequency] ?? routine.frequency}
                    </p>
                  </div>
                  {selectedRoutine?.id === routine.id && (
                    <Check size={16} className="text-white shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => selectedRoutine && setStep(2)}
              disabled={!selectedRoutine}
              className="w-full py-3.5 rounded-xl text-sm font-black transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: '#ffffff', color: '#fff' }}
            >
              다음 <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* Step 2: 설명 + 태그 */}
        {step === 2 && selectedRoutine && (
          <>
            {/* 선택된 루틴 미리보기 */}
            <div
              className="px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <p className="text-xs text-white font-semibold">{selectedRoutine.name}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {FREQ_LABEL[selectedRoutine.frequency] ?? selectedRoutine.frequency}
              </p>
            </div>

            {/* 공유 설명 */}
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">공유 설명 (선택)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={selectedRoutine.description ?? '이 루틴에 대해 설명해주세요...'}
                maxLength={200}
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-none"
                style={inputStyle}
              />
              <p className="text-[10px] text-gray-700 text-right mt-1">{description.length}/200</p>
            </div>

            {/* 태그 선택 */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">태그 선택 (복수 가능)</label>
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                    style={{
                      background: selectedTags.includes(tag)
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(255,255,255,0.05)',
                      color: selectedTags.includes(tag) ? '#ffffff' : '#6b7280',
                      border: `1px solid ${selectedTags.includes(tag) ? 'rgba(255,255,255,0.4)' : 'transparent'}`,
                    }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}
              >
                이전
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-[2] py-3.5 rounded-xl text-sm font-black transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: '#ffffff', color: '#fff' }}
              >
                다음 <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* Step 3: 확인 */}
        {step === 3 && selectedRoutine && (
          <>
            <p className="text-xs text-gray-500">아래 내용으로 커뮤니티에 공유됩니다</p>

            <div
              className="rounded-xl p-4 space-y-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
                >
                  익
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">익명</p>
                  <p className="text-[10px] text-gray-600">Lv.1</p>
                </div>
              </div>

              <p className="font-black text-base text-white">{selectedRoutine.name}</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                {description.trim() || selectedRoutine.description || '(설명 없음)'}
              </p>
              <p className="text-[11px] text-gray-600">
                {FREQ_LABEL[selectedRoutine.frequency] ?? selectedRoutine.frequency}
              </p>

              {selectedTags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {selectedTags.map(tag => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {mutation.isError && (
              <p className="text-xs text-red-400">공유 실패. 다시 시도해주세요.</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                disabled={mutation.isPending}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}
              >
                이전
              </button>
              <button
                onClick={handleSubmit}
                disabled={mutation.isPending}
                className="flex-[2] py-3.5 rounded-xl text-sm font-black transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: '#ffffff', color: '#fff' }}
              >
                {mutation.isPending ? '공유 중...' : '커뮤니티에 공유하기'}
              </button>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
