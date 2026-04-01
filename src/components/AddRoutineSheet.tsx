'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { routinesAPI } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES = ['운동', '공부', '생산성', '생활습관', '자기계발', '기타'];
const FREQ_DAYS = [
  { label: '월', value: 0 }, { label: '화', value: 1 }, { label: '수', value: 2 },
  { label: '목', value: 3 }, { label: '금', value: 4 }, { label: '토', value: 5 }, { label: '일', value: 6 },
];

export default function AddRoutineSheet({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [freqType, setFreqType] = useState<'daily' | 'weekly'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [preferredTime, setPreferredTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleDay = (d: number) =>
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const reset = () => {
    setName(''); setCategory(''); setFreqType('daily');
    setSelectedDays([]); setPreferredTime(''); setError('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('루틴 이름을 입력해주세요.'); return; }
    if (freqType === 'weekly' && selectedDays.length === 0) { setError('요일을 선택해주세요.'); return; }
    setLoading(true);
    try {
      await routinesAPI.create({
        name: name.trim(),
        category: category || undefined,
        frequency_type: freqType,
        frequency_value: freqType === 'weekly' ? selectedDays.length : undefined,
        days_of_week: freqType === 'weekly' ? selectedDays : undefined,
        preferred_time: preferredTime || undefined,
      });
      reset();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={() => { reset(); onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl p-6 pb-10 max-h-[85vh] overflow-y-auto"
        style={{ background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black">루틴 추가</h2>
          <button onClick={() => { reset(); onClose(); }}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">루틴 이름 *</p>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="예: 스트레칭 10분" maxLength={50}
            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>

        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">카테고리 (선택)</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(prev => prev === c ? '' : c)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{ background: category === c ? '#fff' : 'rgba(255,255,255,0.06)', color: category === c ? '#000' : '#9ca3af' }}
              >{c}</button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">빈도</p>
          <div className="flex rounded-xl p-1 mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {(['daily', 'weekly'] as const).map(t => (
              <button key={t} onClick={() => setFreqType(t)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: freqType === t ? '#fff' : 'transparent', color: freqType === t ? '#000' : '#6b7280' }}
              >{t === 'daily' ? '매일' : '특정 요일'}</button>
            ))}
          </div>
          {freqType === 'weekly' && (
            <div className="flex gap-1.5">
              {FREQ_DAYS.map(d => (
                <button key={d.value} onClick={() => toggleDay(d.value)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: selectedDays.includes(d.value) ? '#fff' : 'rgba(255,255,255,0.06)', color: selectedDays.includes(d.value) ? '#000' : '#6b7280' }}
                >{d.label}</button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-2">선호 시간 (선택)</p>
          <input type="time" value={preferredTime} onChange={e => setPreferredTime(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
          />
        </div>

        {error && <p className="text-xs text-red-400 mb-4">{error}</p>}

        <button onClick={handleSubmit} disabled={loading || !name.trim()}
          className="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #ffffff, #d1d5db)', color: '#000' }}
        >
          {loading ? '추가 중...' : '루틴 추가하기'}
        </button>
      </div>
    </div>
  );
}
