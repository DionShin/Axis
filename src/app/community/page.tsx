'use client';

import { useState } from 'react';
import { GitFork, Heart, Search, Share2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityAPI, statsAPI, type CommunityRoutineResponse } from '@/lib/api';
import { formatFrequency } from '@/lib/utils';
import ForkModal from '@/components/ForkModal';
import ShareRoutineSheet from '@/components/ShareRoutineSheet';

const ALL_TAGS = ['전체', '피부', '헬스', '독서', '경제', '자세', '루틴화'];

export default function CommunityPage() {
  const qc = useQueryClient();
  const [selectedTag, setSelectedTag] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [forkTarget, setForkTarget] = useState<CommunityRoutineResponse | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [forkedIds, setForkedIds] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ['community', selectedTag, searchQuery],
    queryFn: () => communityAPI.getAll(selectedTag, searchQuery || undefined),
  });

  const { data: stats = [] } = useQuery({
    queryKey: ['stats'],
    queryFn: statsAPI.getAll,
  });

  const likeMutation = useMutation({
    mutationFn: (id: string) => communityAPI.like(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community'] }),
  });

  const handleLike = (id: string) => {
    if (likedIds.has(id)) return; // 한 번만 가능
    setLikedIds(prev => new Set(prev).add(id));
    likeMutation.mutate(id);
  };

  const getStat = (statId: string) => stats.find(s => s.id === statId);

  return (
    <main className="min-h-screen bg-black text-white px-5 pt-8">

      {/* 헤더 */}
      <header className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-black mb-1">커뮤니티 루틴</h1>
          <p className="text-xs text-gray-500">다른 유저의 루틴을 내 플랜으로 복제하세요</p>
        </div>
        <button
          onClick={() => setShareOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 mt-1"
          style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}
        >
          <Share2 size={13} />
          공유하기
        </button>
      </header>

      {/* 검색바 */}
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-2xl mb-4"
        style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Search size={15} className="text-gray-600 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="루틴명, 설명, 카테고리 검색..."
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-gray-600 text-xs hover:text-gray-400 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* 태그 필터 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {ALL_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: selectedTag === tag ? '#ffffff' : 'rgba(255,255,255,0.05)',
              color: selectedTag === tag ? '#000' : '#6b7280',
            }}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      )}

      {/* 검색 결과 없음 */}
      {!isLoading && routines.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-600 text-sm">검색 결과가 없습니다.</p>
          {searchQuery && (
            <p className="text-gray-700 text-xs mt-1">"{searchQuery}" 관련 루틴을 찾지 못했습니다.</p>
          )}
        </div>
      )}

      {/* 루틴 카드 목록 */}
      <div className="space-y-4">
        {routines.map(routine => {
          const stat = getStat(routine.stat_id);
          const isForked = forkedIds.has(routine.id);
          const isLiked = likedIds.has(routine.id);

          return (
            <div
              key={routine.id}
              className="rounded-2xl p-5"
              style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* 저자 + 스탯 뱃지 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: (stat?.color ?? '#ffffff') + '22', color: stat?.color ?? '#ffffff' }}
                  >
                    {routine.author_name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{routine.author_name}</p>
                    <p className="text-[10px] text-gray-600">Lv.{routine.author_level}</p>
                  </div>
                </div>
                <div
                  className="px-2 py-1 rounded-full text-[10px] font-semibold"
                  style={{ background: (stat?.color ?? '#ffffff') + '18', color: stat?.color ?? '#ffffff' }}
                >
                  {stat?.icon} {routine.category_name}
                </div>
              </div>

              {/* 루틴 정보 */}
              <h3 className="font-black text-base mb-1">{routine.routine_name}</h3>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">{routine.description}</p>

              {/* 메타 */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <span
                  className="text-[11px] px-2.5 py-1 rounded-lg font-medium"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}
                >
                  {formatFrequency(routine.frequency, routine.days_of_week)}
                </span>
                {routine.notification_time && (
                  <span
                    className="text-[11px] px-2.5 py-1 rounded-lg font-medium"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}
                  >
                    🔔 {routine.notification_time}
                  </span>
                )}
              </div>

              {/* 태그 */}
              <div className="flex gap-1.5 mb-4 flex-wrap">
                {routine.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.04)', color: '#6b7280' }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* 포크 / 좋아요 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (!isForked) setForkTarget(routine);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
                  style={{
                    background: isForked ? (stat?.color ?? '#ffffff') + '33' : 'rgba(255,255,255,0.05)',
                    color: isForked ? (stat?.color ?? '#ffffff') : '#6b7280',
                    border: `1px solid ${isForked ? (stat?.color ?? '#ffffff') + '44' : 'transparent'}`,
                  }}
                >
                  <GitFork size={14} />
                  {isForked ? '추가됨' : '내 플랜에 추가'}
                </button>

                <button
                  onClick={() => handleLike(routine.id)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl transition-all active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <Heart
                    size={14}
                    className={isLiked ? 'text-red-400 fill-red-400' : 'text-gray-600'}
                  />
                  <span className="text-xs text-gray-500">
                    {routine.like_count + (isLiked ? 1 : 0)}
                  </span>
                </button>

                <div className="flex items-center gap-1 px-2">
                  <GitFork size={12} className="text-gray-700" />
                  <span className="text-xs text-gray-600">
                    {routine.fork_count + (isForked ? 1 : 0)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 포킹 모달 */}
      <ForkModal
        routine={forkTarget}
        onClose={() => {
          // 포킹 성공 시 해당 루틴을 forkedIds에 추가
          if (forkTarget) setForkedIds(prev => new Set(prev).add(forkTarget.id));
          setForkTarget(null);
        }}
      />

      {/* 루틴 공유 시트 */}
      <ShareRoutineSheet open={shareOpen} onClose={() => setShareOpen(false)} />
    </main>
  );
}
