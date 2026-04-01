import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.auth import get_current_user_id

from app.core.config import settings
from app.core.database import engine, Base
from app.routers import routines, checks, reports, history, push, onboarding
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        # RESET_DB=true 이면 기존 테이블 전부 삭제 후 재생성 (스키마 마이그레이션용)
        if os.getenv("RESET_DB", "").lower() == "true":
            await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    start_scheduler()
    yield
    stop_scheduler()
    await engine.dispose()


app = FastAPI(
    title="Axis API",
    description="Axis — 루틴 체크 & 히스토리 앱 백엔드",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(onboarding.router, prefix="/api")
app.include_router(routines.router,   prefix="/api")
app.include_router(checks.router,     prefix="/api")
app.include_router(reports.router,    prefix="/api")
app.include_router(history.router,    prefix="/api")
app.include_router(push.router,       prefix="/api")


@app.get("/")
async def root():
    return {"status": "ok", "message": "Axis API v2"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/debug/me")
async def debug_me(user_id: str = Depends(get_current_user_id)):
    return {"user_id": user_id}
