# Axis 앱 — Claude 작업 가이드

## 프로젝트
- **앱 이름**: Axis (구 Level-Up) — 한국 2030 남성 자기관리 플랫폼
- **프론트엔드**: https://axis0843.vercel.app (Vercel, Next.js 14)
- **백엔드**: Railway (FastAPI + PostgreSQL)
- **인증**: Supabase (https://hjgkolkwsxmijhmeethp.supabase.co)

## 기술 스택
- Frontend: Next.js 14 App Router + TypeScript + TanStack Query + Tailwind CSS
- Backend: FastAPI + async SQLAlchemy 2.0 + asyncpg
- Auth: Supabase Auth
- Push: Web Push API + VAPID + APScheduler
- News: 네이버 Search API + YouTube Data API v3

## 배포 설정
- Railway: Root Directory = `backend`, PYTHONPATH=/app
- Railway 환경변수: DATABASE_URL, SUPABASE_URL, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, YOUTUBE_API_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
- Vercel 환경변수: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_URL, SUPABASE_SERVICE_ROLE_KEY, NAVER_LOGIN_CLIENT_ID, NAVER_LOGIN_CLIENT_SECRET
- alembic 실행 안 함 — FastAPI lifespan의 create_all 사용

## 완료된 기능
- 이메일+비밀번호 회원가입/로그인 (Supabase)
- Google 로그인 (Supabase Provider — 설정 필요)
- 카카오 로그인 (Supabase Provider — 설정 필요)
- 네이버 로그인 (커스텀 OAuth — 환경변수 설정 필요)
- 4단계 온보딩: 키워드 선택 → 카테고리/루틴 자동생성 → SNS → 알림
- 온보딩 완료 후 로그아웃 → 로그인 화면 → 메인 흐름
- SVG 직접 렌더링 n각형 레이더 차트 (3~8각형 유기적 애니메이션)
- 스탯 추가/삭제 UI (메인화면 "편집" 버튼)
- 루틴 관리 (CRUD, 일별 체크, 스트릭)
- 루틴 기반 개인화 인사이트 (내 카테고리 키워드로 뉴스/유튜브 검색)
- 커뮤니티 (공유/검색/포크/좋아요)
- 프로필 (닉네임 편집, 스탯 요약, 알림 토글, 설정 시트, 로그아웃)
- 푸시 알림 (07:30 브리핑, 22:00 리마인더)
- user_id 개인화 (유저별 데이터 분리)

## 남은 작업 (유저 직접 설정 필요)

### 1. Google OAuth 활성화
- Supabase → Authentication → Providers → Google → Enable
- Google Cloud Console에서 OAuth Client 생성
- Redirect URI: `https://hjgkolkwsxmijhmeethp.supabase.co/auth/v1/callback`

### 2. 카카오 OAuth 활성화
- Supabase → Authentication → Providers → Kakao → Enable
- https://developers.kakao.com 에서 앱 생성
- REST API 키 → Supabase Client ID
- Redirect URI: `https://hjgkolkwsxmijhmeethp.supabase.co/auth/v1/callback`

### 3. 네이버 OAuth 활성화
- https://developers.naver.com → 애플리케이션 등록
- 사용 API: 네이버 로그인
- Callback URL: `https://axis0843.vercel.app/api/auth/naver/callback`
- Vercel에 추가: NAVER_LOGIN_CLIENT_ID, NAVER_LOGIN_CLIENT_SECRET

### 4. Vercel 환경변수 추가
- `NEXT_PUBLIC_APP_URL` = `https://axis0843.vercel.app`
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase → Settings → API → service_role 키
- `NAVER_LOGIN_CLIENT_ID`, `NAVER_LOGIN_CLIENT_SECRET`

### 5. 앱 아이콘
- Gemini로 icon-192.png, icon-512.png 생성
- `public/icons/` 폴더에 추가 후 git push
