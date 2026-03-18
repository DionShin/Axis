"""
FastAPI 애플리케이션 진입점.

파이썬 관점: Django의 urls.py + wsgi.py를 합친 역할.
lifespan = Django의 AppConfig.ready()와 비슷한 앱 시작/종료 훅.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.routers import stats, categories, routines, logs, history, community, push, news, onboarding
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 앱 시작 시: DB 테이블 자동 생성
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # 푸시 알림 스케줄러 시작
    start_scheduler()
    yield
    # 앱 종료 시: 스케줄러 + 커넥션 풀 정리
    stop_scheduler()
    await engine.dispose()


app = FastAPI(
    title="Axis API",
    description="2030 남성 자기관리 앱 백엔드",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 설정: 프론트엔드(localhost:3000)에서 오는 요청 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록 (Django의 urlpatterns include와 동일)
app.include_router(stats.router,      prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(routines.router,   prefix="/api")
app.include_router(logs.router,       prefix="/api")
app.include_router(history.router,    prefix="/api")
app.include_router(community.router,  prefix="/api")
app.include_router(push.router,       prefix="/api")
app.include_router(news.router,       prefix="/api")
app.include_router(onboarding.router, prefix="/api")


@app.get("/")
async def root():
    return {"status": "ok", "message": "Axis API 서버 실행 중"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
