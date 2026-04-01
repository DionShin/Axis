export interface Routine {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  frequency_type: 'daily' | 'weekly';
  frequency_value: number | null;
  days_of_week: number[] | null;
  preferred_time: string | null;
  status: 'active' | 'archived';
  created_at: string;
  archived_at: string | null;
  restarted_at: string | null;
  streak: number;
  weekly_rate: number;
  today_checked: boolean;
}

export interface RoutineCheck {
  id: string;
  routine_id: string;
  date: string;
  checked: boolean;
}

export interface HeatmapItem {
  date: string;
  total: number;
  checked: number;
  rate: number;
}

export interface ReportData {
  period: { start: string; end: string };
  total_routines: number;
  completion_rate: number;
  best_routine: { id: string; name: string; rate: number } | null;
  worst_routine: { id: string; name: string; rate: number } | null;
  pattern_summary: string;
  next_action: string;
}

export interface HistoryItem {
  id: string;
  name: string;
  category: string | null;
  status: 'active' | 'archived';
  created_at: string;
  archived_at: string | null;
  restarted_at: string | null;
  frequency_type: string;
  frequency_value: number | null;
}

export interface OnboardingStatus {
  completed: boolean;
  nickname: string;
  goal_category: string | null;
  main_difficulty: string | null;
  reminder_time: string | null;
}
