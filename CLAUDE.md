# Axis 앱 — Claude 작업 가이드

## 프로젝트
- **앱 이름**: Axis — 하루 1분 체크로 루틴 흐름을 남기는 자기관리 히스토리 앱
- **프론트엔드**: https://axis0843.vercel.app (Vercel, Next.js 14 PWA)
- **백엔드**: Railway (FastAPI + PostgreSQL)
- **인증**: Supabase (https://hjgkolkwsxmijhmeethp.supabase.co)
- **GitHub**: https://github.com/DionShin/Axis

## 기술 스택
- Frontend: Next.js 14 App Router + TypeScript + TanStack Query + Tailwind CSS
- Backend: FastAPI + async SQLAlchemy 2.0 + asyncpg
- Auth: Supabase Auth (이메일+비밀번호, Google OAuth, 카카오, 네이버)
- Push: Web Push API + VAPID + APScheduler

## 배포 설정
- Railway: Root Directory = `backend`, PYTHONPATH=/app
- Railway 환경변수: DATABASE_URL, SUPABASE_URL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
- Vercel 환경변수: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_URL, SUPABASE_SERVICE_ROLE_KEY, NAVER_LOGIN_CLIENT_ID, NAVER_LOGIN_CLIENT_SECRET
- alembic 실행 안 함 — FastAPI lifespan의 create_all 사용

## DB 스키마 리셋 방법
1. Railway 환경변수에 `RESET_DB=true` 추가
2. 배포 (lifespan에서 drop_all → create_all 실행됨)
3. **바로 `RESET_DB` 환경변수 삭제** (재배포하면 또 리셋됨 주의!)

## 데이터 모델
- **UserProfile**: user_id, nickname, onboarding_completed, goal_category, main_difficulty, reminder_time
- **Routine**: id, user_id, name, category(레이블), frequency_type(daily/weekly), frequency_value, days_of_week, preferred_time, status(active/archived), created_at, archived_at, restarted_at
- **RoutineCheck**: id, routine_id(FK), user_id, date, checked
- **InsightReport**: id, user_id, period_type, start_date, end_date, completion_rate, summary
- **PushSubscription**: 변경 없음

## 앱 구조 (화면별)
| 경로 | 설명 |
|------|------|
| `/` | 오늘 체크 홈 (루틴 토글 + 진행률 + 리커버리 배너) |
| `/history` | 히트맵 + 루틴별 주간 달성률 카드 |
| `/report` | 주간/월간 리포트 (달성률, 베스트/워스트 루틴, 패턴 요약) |
| `/routines` | 루틴 관리 (추가/중단/재시작/삭제) |
| `/settings` | 설정 (닉네임 편집, 푸시 알림, 알림 시간, 로그아웃) |
| `/login` | 로그인 (구글/카카오/네이버/이메일) |
| `/onboarding/nickname` | OAuth 유저 닉네임 설정 |
| `/onboarding` | 온보딩 (목표 카테고리 → 루틴 선택 → 알림 시간) |

## 온보딩 플로우
- OAuth 유저: `/auth/callback` → `/onboarding/nickname` → `/onboarding`
- 이메일 유저: `/login` → 로그인 후 `/` → (닉네임 없으면 `/onboarding/nickname` 리다이렉트)
- 온보딩 완료된 유저: `/onboarding` 접근 시 `/`로 스킵

## 백엔드 라우터
- `/onboarding/*`: 온보딩 상태 조회/저장, 추천 루틴 제공
- `/routines/*`: CRUD, archive, restart, today 조회, 스트릭/달성률 계산
- `/checks/*`: toggle(upsert), heatmap, 루틴별 체크 이력
- `/reports/*`: 주간/월간 리포트 on-the-fly 계산
- `/history/*`: 전체 루틴 생애주기 조회
- `/push/*`: VAPID 키, subscribe, unsubscribe, 푸시 발송

## VAPID 키 (푸시 알림)
- PUBLIC: `BPTTfdFazrdnLN-9MjHpWDqUvhvD2jT1b5SH9JX0mGLEvcfpnaCjYisj5w1Ly2BYFjuVZ2voTPkF2QKqtrtaoVw`
- PRIVATE: `DjlZyShlwN0s_DnZgO9QgeskpOdLvzZl_7NxbWex9zo`
- Railway + Vercel 모두 설정 필요 (NEXT_PUBLIC_VAPID_PUBLIC_KEY)

## 향후 계획
- Next.js PWA MVP 검증 후 Expo + React Native 마이그레이션
- api.ts, auth-context, supabase 로직 재사용 가능
