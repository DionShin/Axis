/**
 * 백엔드 API 클라이언트.
 *
 * 파이썬의 requests 라이브러리와 동일한 역할.
 * 모든 API 호출을 이 파일에서 중앙 관리하여 나중에 URL 변경 시 한 곳만 수정.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ─── 공통 fetch 래퍼 ──────────────────────────────────────────────
async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  // Supabase JWT 토큰을 Authorization 헤더에 자동 첨부
  let authHeader: Record<string, string> = {};
  try {
    const { getAccessToken } = await import('./supabase');
    const token = await getAccessToken();
    if (token) authHeader = { Authorization: `Bearer ${token}` };
  } catch {
    // 빌드 타임 / SSR 환경에서는 무시
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader, ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail ?? `API Error ${res.status}`);
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T;
  return res.json();
}

// ─── Stats API ────────────────────────────────────────────────────
export const statsAPI = {
  getAll: () => fetchAPI<StatResponse[]>('/stats/'),
  getOne: (id: string) => fetchAPI<StatResponse>(`/stats/${id}`),
  create: (body: { name: string; icon: string; color: string }) =>
    fetchAPI<StatResponse>('/stats/', { method: 'POST', body: JSON.stringify(body) }),
  deleteStat: (id: string) =>
    fetchAPI<void>(`/stats/${id}`, { method: 'DELETE' }),
};

// ─── Categories API ───────────────────────────────────────────────
export const categoriesAPI = {
  getByStat: (statId: string) => fetchAPI<CategoryResponse[]>(`/categories/by-stat/${statId}`),
  getOne: (catId: string) => fetchAPI<CategoryResponse>(`/categories/${catId}`),
  create: (body: CategoryCreateRequest) =>
    fetchAPI<CategoryResponse>('/categories/', { method: 'POST', body: JSON.stringify(body) }),
  delete: (catId: string) =>
    fetchAPI<void>(`/categories/${catId}`, { method: 'DELETE' }),
};

// ─── Routines API ─────────────────────────────────────────────────
export const routinesAPI = {
  getByCategory: (catId: string) => fetchAPI<RoutineResponse[]>(`/routines/by-category/${catId}`),
  getToday: () => fetchAPI<RoutineResponse[]>('/routines/today'),
  create: (body: RoutineCreateRequest) =>
    fetchAPI<RoutineResponse>('/routines/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<RoutineCreateRequest>) =>
    fetchAPI<RoutineResponse>(`/routines/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string, note?: string) =>
    fetchAPI<void>(`/routines/${id}${note ? `?note=${encodeURIComponent(note)}` : ''}`, { method: 'DELETE' }),
};

// ─── Logs API ─────────────────────────────────────────────────────
export const logsAPI = {
  toggle: (body: LogToggleRequest) =>
    fetchAPI<LogResponse>('/logs/toggle', { method: 'POST', body: JSON.stringify(body) }),
  getByRoutine: (routineId: string, days = 7) =>
    fetchAPI<LogResponse[]>(`/logs/${routineId}?days=${days}`),
};

// ─── History API ──────────────────────────────────────────────────
export const historyAPI = {
  getAll: () => fetchAPI<HistoryResponse[]>('/history/'),
};

// ─── Community API ────────────────────────────────────────────────
export const communityAPI = {
  getAll: (tag?: string, q?: string) =>
    fetchAPI<CommunityRoutineResponse[]>(
      `/community/?${tag && tag !== '전체' ? `tag=${tag}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`
    ),
  share: (body: CommunityShareRequest) =>
    fetchAPI<CommunityRoutineResponse>('/community/share', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  fork: (communityId: string, categoryId: string, notificationTime?: string) =>
    fetchAPI<{ message: string; new_routine_id: string }>(
      `/community/${communityId}/fork?category_id=${categoryId}${notificationTime ? `&notification_time=${notificationTime}` : ''}`,
      { method: 'POST' }
    ),
  like: (communityId: string) =>
    fetchAPI<{ like_count: number }>(`/community/${communityId}/like`, { method: 'POST' }),
};

// ─── Onboarding API ───────────────────────────────────────────────
export const onboardingAPI = {
  saveProfile: (nickname: string) =>
    fetchAPI<{ message: string; nickname: string }>('/onboarding/profile', {
      method: 'POST',
      body: JSON.stringify({ nickname }),
    }),
  saveKeywords: (keywords: string[]) =>
    fetchAPI<{ message: string; created_categories: string[]; created_routines: string[] }>(
      '/onboarding/keywords',
      { method: 'POST', body: JSON.stringify({ keywords }) }
    ),
  saveSNS: (data: { instagram_id?: string; kakao_id?: string; phone?: string }) =>
    fetchAPI<{ message: string }>('/onboarding/sns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  complete: () =>
    fetchAPI<{ message: string }>('/onboarding/complete', { method: 'POST' }),
  getStatus: () =>
    fetchAPI<{ completed: boolean; nickname: string }>('/onboarding/status'),
  updateProfile: (nickname: string) =>
    fetchAPI<{ message: string; nickname: string }>('/onboarding/profile', { method: 'PUT', body: JSON.stringify({ nickname }) }),
};

// ─── News API ─────────────────────────────────────────────────────
export const newsAPI = {
  getAll: (category?: 'economy' | 'knowledge' | 'shorts' | 'all', pageSize = 10) =>
    fetchAPI<NewsArticle[]>(`/news/?page_size=${pageSize}${category ? `&category=${category}` : ''}`),
};

// ─── 응답 타입 (백엔드 스키마와 1:1 대응) ────────────────────────
export interface StatResponse {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  score: number;
}

export interface CategoryResponse {
  id: string;
  stat_id: string;
  user_id: string;
  name: string;
  icon: string;
  description?: string;
  order_index: number;
  routine_count: number;
  weekly_rate: number;
}

export interface RoutineResponse {
  id: string;
  category_id: string;
  user_id: string;
  name: string;
  description?: string;
  frequency: string;
  days_of_week?: number[];
  notification_time?: string;
  is_active: boolean;
  is_forked: boolean;
  original_author?: string;
  weekly_rate: number;
  streak: number;
  created_at: string;
}

export interface LogResponse {
  id: string;
  routine_id: string;
  date: string;
  completed: boolean;
  note?: string;
}

export interface HistoryResponse {
  id: string;
  user_id: string;
  routine_id?: string;
  routine_name?: string;
  stat_id?: string;
  event_type: string;
  content: string;
  note?: string;
  created_at: string;
}

export interface CommunityRoutineResponse {
  id: string;
  author_user_id: string;
  author_name: string;
  author_level: number;
  stat_id: string;
  category_name: string;
  routine_name: string;
  description: string;
  frequency: string;
  days_of_week?: number[];
  notification_time?: string;
  tags: string[];
  fork_count: number;
  like_count: number;
  created_at: string;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  published_at: string;
  category: string;
  thumbnail?: string;
}

// 요청 타입
export interface CategoryCreateRequest { stat_id: string; name: string; icon: string; description?: string; }
export interface RoutineCreateRequest {
  category_id: string; name: string; description?: string;
  frequency: string; days_of_week?: number[]; notification_time?: string;
  is_forked?: boolean; original_routine_id?: string; original_author?: string;
}
export interface LogToggleRequest { routine_id: string; date: string; completed: boolean; note?: string; }
export interface CommunityShareRequest {
  stat_id: string;
  category_name: string;
  routine_name: string;
  description: string;
  frequency: string;
  days_of_week?: number[];
  notification_time?: string;
  tags: string[];
  author_name: string;
  author_level: number;
}
