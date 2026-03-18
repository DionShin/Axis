'use client';

import { Bell, ChevronRight, Flame, TrendingUp, BookOpen, ExternalLink, Play, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import StatRadarChart from '@/components/StatRadarChart';
import { statsAPI, routinesAPI, newsAPI, type StatResponse, type NewsArticle } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

// API 응답을 StatRadarChart가 기대하는 형태로 변환
function toChartStat(s: StatResponse) {
  return { id: s.id, name: s.name, icon: s.icon, color: s.color, score: s.score };
}

// ─── 뉴스 카드 (economy / knowledge) ─────────────────────────────
function NewsCard({ article }: { article: NewsArticle }) {
  const isYouTube = article.source === 'YouTube';
  const isEconomy = article.category === 'economy';

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
      style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* YouTube 썸네일 */}
      {article.thumbnail && (
        <img
          src={article.thumbnail}
          alt={article.title}
          className="w-full h-32 object-cover rounded-xl"
        />
      )}

      <div className="flex items-start gap-3 p-4">
        {/* 카테고리/소스 아이콘 */}
        <div
          className="rounded-xl p-2 mt-0.5 shrink-0"
          style={{
            background: isYouTube
              ? 'rgba(239,68,68,0.12)'
              : isEconomy
              ? 'rgba(34,197,94,0.1)'
              : 'rgba(168,85,247,0.1)',
          }}
        >
          {isYouTube ? (
            <Play size={14} className="text-red-500" fill="currentColor" />
          ) : isEconomy ? (
            <TrendingUp size={14} className="text-green-400" />
          ) : (
            <BookOpen size={14} className="text-purple-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-xs mb-0.5"
            style={{ color: isYouTube ? '#ef4444' : '#6b7280' }}
          >
            {article.source}
          </p>
          <p className="text-sm font-medium leading-snug line-clamp-2">{article.title}</p>
        </div>

        <ExternalLink size={13} className="text-gray-700 shrink-0 mt-1" />
      </div>
    </a>
  );
}

// ─── 쇼츠 카드 (가로 스크롤용) ────────────────────────────────────
function ShortsCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-36 rounded-2xl overflow-hidden transition-all active:scale-[0.97]"
      style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* 썸네일 or 플레이스홀더 */}
      {article.thumbnail ? (
        <div className="relative">
          <img
            src={article.thumbnail}
            alt={article.title}
            className="w-full h-24 object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full p-1.5" style={{ background: 'rgba(0,0,0,0.55)' }}>
              <Play size={14} className="text-white" fill="currentColor" />
            </div>
          </div>
        </div>
      ) : (
        <div
          className="w-full h-24 flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.08)' }}
        >
          <Play size={20} className="text-red-500" fill="currentColor" />
        </div>
      )}

      <div className="p-2.5">
        <p className="text-[10px] text-red-500 mb-0.5">{article.source}</p>
        <p className="text-xs font-medium leading-snug line-clamp-3">{article.title}</p>
      </div>
    </a>
  );
}

// ─── 메인 대시보드 ────────────────────────────────────────────────
export default function Dashboard() {
  const { signOut } = useAuth();
  const { data: stats = [], isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: statsAPI.getAll,
  });

  const { data: todayRoutines = [] } = useQuery({
    queryKey: ['routines', 'today'],
    queryFn: routinesAPI.getToday,
  });

  const { data: economyNews = [] } = useQuery({
    queryKey: ['news', 'economy'],
    queryFn: () => newsAPI.getAll('economy', 3),
    staleTime: 10 * 60 * 1000,
  });

  const { data: knowledgeNews = [] } = useQuery({
    queryKey: ['news', 'knowledge'],
    queryFn: () => newsAPI.getAll('knowledge', 3),
    staleTime: 10 * 60 * 1000,
  });

  const { data: shorts = [] } = useQuery({
    queryKey: ['news', 'shorts'],
    queryFn: () => newsAPI.getAll('shorts', 4),
    staleTime: 10 * 60 * 1000,
  });

  const avgScore = stats.length
    ? Math.round(stats.reduce((s, r) => s + r.score, 0) / stats.length)
    : 0;
  const level = Math.floor(avgScore / 5) + 1;
  const xpCurrent = (avgScore % 5) * 20;

  const upcomingRoutine = todayRoutines.find(r => r.notification_time) ?? todayRoutines[0];
  const streakRoutines = todayRoutines.filter(r => r.streak > 3).slice(0, 2);

  if (statsLoading) {
    return (
      <main className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="text-gray-600 text-sm animate-pulse">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white px-5 pt-8">

      {/* 상단: 레벨 & XP 바 */}
      <section className="mb-8">
        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-[10px] text-gray-600 mb-0.5 tracking-widest uppercase">Your Level</p>
            <h2 className="text-2xl font-black italic text-blue-400">Lv.{level}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600">{xpCurrent} / 100 XP</span>
            <button
              onClick={signOut}
              className="p-1.5 rounded-lg transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.04)' }}
              title="로그아웃"
            >
              <LogOut size={14} className="text-gray-600" />
            </button>
          </div>
        </div>
        <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-700"
            style={{ width: `${xpCurrent}%` }}
          />
        </div>
      </section>

      {/* 중앙: 오각형 레이더 차트 */}
      <section className="mb-5">
        <p className="text-[10px] text-gray-600 text-center mb-3 tracking-wider">꼭짓점을 탭해서 스탯 관리</p>
        <div
          className="w-full aspect-square rounded-[2rem] flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, #0f1117, #0a0a0c)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <StatRadarChart stats={stats.map(toChartStat)} />
        </div>
      </section>

      {/* 스탯 미니 진행바 */}
      <section className="mb-7 grid grid-cols-5 gap-2">
        {stats.map(stat => (
          <div key={stat.id} className="flex flex-col items-center gap-1.5">
            <span className="text-sm">{stat.icon}</span>
            <div className="w-full h-0.5 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${stat.score}%`, background: stat.color }}
              />
            </div>
            <span className="text-[10px] font-bold" style={{ color: stat.color }}>
              {Math.round(stat.score)}
            </span>
          </div>
        ))}
      </section>

      {/* 오늘의 루틴 */}
      <section className="space-y-3 pb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300">오늘의 루틴</h3>
          <span className="text-xs text-blue-400">{todayRoutines.length}개 예정</span>
        </div>

        {/* 다음 알림 */}
        {upcomingRoutine && (
          <div
            className="rounded-2xl p-4 flex gap-3 items-start"
            style={{ background: '#0f1117', border: '1px solid rgba(59,130,246,0.2)' }}
          >
            <div className="rounded-xl p-2 mt-0.5 shrink-0" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <Bell size={15} className="text-blue-400" />
            </div>
            <div>
              <p className="text-[11px] text-gray-500 mb-0.5">오늘 {upcomingRoutine.notification_time}</p>
              <p className="text-sm font-semibold">
                <span className="text-blue-400">'{upcomingRoutine.name}'</span> 루틴 예정
              </p>
            </div>
          </div>
        )}

        {/* 스트릭 루틴들 */}
        {streakRoutines.map(routine => (
          <div
            key={routine.id}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="rounded-xl p-2 shrink-0" style={{ background: 'rgba(251,191,36,0.1)' }}>
              <Flame size={15} className="text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{routine.name}</p>
              <p className="text-[11px] text-gray-500">{routine.streak}일 연속 달성 중</p>
            </div>
            <ChevronRight size={15} className="text-gray-700 shrink-0" />
          </div>
        ))}

        {todayRoutines.length === 0 && (
          <p className="text-center text-gray-600 text-sm py-6">오늘 예정된 루틴이 없습니다</p>
        )}
      </section>

      {/* ① 오늘의 경제 인사이트 */}
      {economyNews.length > 0 && (
        <section className="pb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300">오늘의 경제 인사이트</h3>
            <span className="text-xs text-gray-600">네이버뉴스 · YouTube</span>
          </div>
          <div className="space-y-2.5">
            {economyNews.map((article, i) => (
              <NewsCard key={`economy-${i}`} article={article} />
            ))}
          </div>
        </section>
      )}

      {/* ② 자기계발 콘텐츠 */}
      {knowledgeNews.length > 0 && (
        <section className="pb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300">자기계발 콘텐츠</h3>
            <span className="text-xs text-gray-600">네이버블로그 · YouTube</span>
          </div>
          <div className="space-y-2.5">
            {knowledgeNews.map((article, i) => (
              <NewsCard key={`knowledge-${i}`} article={article} />
            ))}
          </div>
        </section>
      )}

      {/* ③ 쇼츠 · 릴스 — 가로 스크롤 */}
      {shorts.length > 0 && (
        <section className="pb-24">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300">쇼츠 · 릴스</h3>
            <span className="text-xs text-red-500">YouTube Shorts</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {shorts.map((article, i) => (
              <ShortsCard key={`shorts-${i}`} article={article} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
