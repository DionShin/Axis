import type { Routine, RoutineCheck, HeatmapItem, ReportData, HistoryItem, OnboardingStatus } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  let authHeader: Record<string, string> = {};
  try {
    const { getAccessToken } = await import('./supabase');
    const token = await getAccessToken();
    if (token) authHeader = { Authorization: `Bearer ${token}` };
  } catch {}

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

// ─── Routines ─────────────────────────────────────────────────────
export const routinesAPI = {
  getAll: (status = 'active') => fetchAPI<Routine[]>(`/routines/?status=${status}`),
  getToday: () => fetchAPI<Routine[]>('/routines/today'),
  getArchived: () => fetchAPI<Routine[]>('/routines/?status=archived'),
  create: (body: {
    name: string;
    category?: string;
    frequency_type: string;
    frequency_value?: number;
    days_of_week?: number[];
    preferred_time?: string;
  }) => fetchAPI<Routine>('/routines/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<{ name: string; category: string; frequency_type: string; frequency_value: number; days_of_week: number[]; preferred_time: string }>) =>
    fetchAPI<Routine>(`/routines/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  archive: (id: string) => fetchAPI<void>(`/routines/${id}/archive`, { method: 'POST' }),
  restart: (id: string) => fetchAPI<void>(`/routines/${id}/restart`, { method: 'POST' }),
  delete: (id: string) => fetchAPI<void>(`/routines/${id}`, { method: 'DELETE' }),
};

// ─── Checks ───────────────────────────────────────────────────────
export const checksAPI = {
  toggle: (routine_id: string, date: string, checked: boolean) =>
    fetchAPI<RoutineCheck>('/checks/toggle', { method: 'POST', body: JSON.stringify({ routine_id, date, checked }) }),
  heatmap: (days = 90) => fetchAPI<HeatmapItem[]>(`/checks/heatmap?days=${days}`),
  byRoutine: (routine_id: string, days = 30) => fetchAPI<RoutineCheck[]>(`/checks/${routine_id}?days=${days}`),
};

// ─── Reports ──────────────────────────────────────────────────────
export const reportsAPI = {
  weekly: () => fetchAPI<ReportData>('/reports/weekly'),
  monthly: () => fetchAPI<ReportData>('/reports/monthly'),
};

// ─── History ──────────────────────────────────────────────────────
export const historyAPI = {
  getAll: () => fetchAPI<HistoryItem[]>('/history/'),
};

// ─── Onboarding ───────────────────────────────────────────────────
export const onboardingAPI = {
  getStatus: () => fetchAPI<OnboardingStatus>('/onboarding/status'),
  saveProfile: (nickname: string) =>
    fetchAPI<{ message: string; nickname: string }>('/onboarding/profile', { method: 'POST', body: JSON.stringify({ nickname }) }),
  updateProfile: (nickname: string) =>
    fetchAPI<{ message: string; nickname: string }>('/onboarding/profile', { method: 'PUT', body: JSON.stringify({ nickname }) }),
  saveGoals: (goal_category: string, main_difficulty: string) =>
    fetchAPI<{ message: string }>('/onboarding/goals', { method: 'POST', body: JSON.stringify({ goal_category, main_difficulty }) }),
  getRecommendedRoutines: () =>
    fetchAPI<{ goal_category: string; routines: Array<{ name: string; category: string; frequency_type: string }> }>('/onboarding/recommended-routines'),
  saveRoutines: (routines: Array<{ name: string; category?: string; frequency_type: string; frequency_value?: number; days_of_week?: number[] }>) =>
    fetchAPI<{ message: string; created: string[] }>('/onboarding/routines', { method: 'POST', body: JSON.stringify({ routines }) }),
  saveReminder: (reminder_time: string) =>
    fetchAPI<{ message: string; reminder_time: string }>('/onboarding/reminder', { method: 'POST', body: JSON.stringify({ reminder_time }) }),
  complete: () => fetchAPI<{ message: string }>('/onboarding/complete', { method: 'POST' }),
};

// ─── Push ─────────────────────────────────────────────────────────
export const pushAPI = {
  getVapidKey: () => fetchAPI<{ vapidPublicKey: string }>('/push/vapid-key'),
  subscribe: (sub: PushSubscriptionJSON) =>
    fetchAPI<void>('/push/subscribe', { method: 'POST', body: JSON.stringify(sub) }),
  unsubscribe: (endpoint: string) =>
    fetchAPI<void>('/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) }),
};
