# Axis 앱 — Claude 작업 가이드

## 프로젝트
- **앱 이름**: Axis (구 Level-Up) — 한국 2030 남성 자기관리 플랫폼
- **프론트엔드**: https://axis0843.vercel.app (Vercel, Next.js 14)
- **백엔드**: Railway (FastAPI + PostgreSQL)
- **인증**: Supabase (https://hjgkolkwsxmijhmeethp.supabase.co)
- **GitHub**: https://github.com/DionShin/Axis

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

### 인증
- 이메일+비밀번호 회원가입/로그인 (Supabase)
- Google 로그인 ✅ (Supabase Provider + Google Cloud Console 설정 완료)
- 카카오 로그인 (Supabase 설정은 됐으나 비즈앱 미전환으로 제한적)
- 네이버 로그인 (커스텀 OAuth — 환경변수 설정 필요)
- 로그인/온보딩 화면에서 하단 네비게이션 숨김

### 온보딩 플로우 (완전 분리)
- **이메일 유저**: `/onboarding` → 이메일+비번+닉네임 → 키워드 → SNS → 알림 → 로그인화면
- **OAuth 유저**: `/onboarding/nickname` → 닉네임만 입력 → `/onboarding?from=oauth` → 키워드 → SNS → 알림 → 메인
- OAuth 콜백(`/auth/callback`) → `/onboarding/nickname`으로 리다이렉트
- 온보딩 완료된 유저는 닉네임 페이지에서 바로 메인으로 스킵

### 핵심 기능
- SVG n각형 레이더 차트 (3~8각형 유기적 애니메이션, 라벨 클리핑 패딩 처리)
- 스탯 추가/삭제 즉시 반영 (204 응답 처리 수정)
- 루틴 관리 (CRUD, 일별 체크, 스트릭)
- 루틴 기반 개인화 인사이트 (내 카테고리 키워드로 뉴스/유튜브 검색)
- 커뮤니티 (공유/검색/포크/좋아요)
- 프로필 (닉네임 편집, 스탯 요약, 알림 토글, 설정 시트, 로그아웃)
- 푸시 알림 (07:30 브리핑, 22:00 리마인더)
- user_id 개인화 (유저별 데이터 완전 분리 — SUPABASE_URL Railway 환경변수 필수)

### 버그 수정 이력
- Railway `SUPABASE_URL` 오타(SUPERBASE_URL)로 모든 유저가 동일 데이터 보이던 문제 수정
- JWT JWKS 캐시 실패 시 폴백 로직 수정 (`get_unverified_claims` 사용)
- 스탯 삭제 후 화면 즉시 반영 안 되던 문제 (204 응답 JSON 파싱 오류) 수정
- 로그인/온보딩 화면에서 하단 네비 뜨던 문제 수정

## 남은 작업

### 유저 직접 설정 필요
1. **카카오 OAuth**: 비즈앱 전환 (사업자 등록 필요) 또는 스킵
2. **네이버 OAuth**: developers.naver.com 앱 등록 → Vercel에 NAVER_LOGIN_CLIENT_ID, NAVER_LOGIN_CLIENT_SECRET 추가
3. **앱 아이콘**: icon-192.png, icon-512.png 생성 → `public/icons/` 폴더에 추가 후 git push

### 테스트 필요
- OAuth 온보딩 플로우 전체 검증 (닉네임 → 키워드 → SNS → 알림 → 메인)
- 두 계정 간 데이터 격리 확인

### 추후 개발
- Capacitor로 Android APK 빌드 → 플레이스토어 출시
- iOS 출시 (Apple Developer 계정 $99/년 필요)
