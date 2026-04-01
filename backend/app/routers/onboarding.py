from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.models import Routine, UserProfile

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

RECOMMENDED_ROUTINES = {
    "운동": [
        {"name": "스트레칭 10분", "category": "운동", "frequency_type": "daily"},
        {"name": "유산소 30분", "category": "운동", "frequency_type": "weekly", "frequency_value": 3, "days_of_week": [0, 2, 4]},
        {"name": "근력 운동", "category": "운동", "frequency_type": "weekly", "frequency_value": 3, "days_of_week": [1, 3, 5]},
    ],
    "공부": [
        {"name": "독서 30분", "category": "공부", "frequency_type": "daily"},
        {"name": "강의 1개 수강", "category": "공부", "frequency_type": "daily"},
        {"name": "복습 정리", "category": "공부", "frequency_type": "weekly", "frequency_value": 3, "days_of_week": [0, 2, 4]},
    ],
    "생산성": [
        {"name": "오늘 할 일 3개 정하기", "category": "생산성", "frequency_type": "daily"},
        {"name": "하루 회고 5분", "category": "생산성", "frequency_type": "daily"},
        {"name": "주간 계획 세우기", "category": "생산성", "frequency_type": "weekly", "frequency_value": 1, "days_of_week": [0]},
    ],
    "생활습관": [
        {"name": "물 2L 마시기", "category": "생활습관", "frequency_type": "daily"},
        {"name": "11시 이전 취침", "category": "생활습관", "frequency_type": "daily"},
        {"name": "비타민 챙겨 먹기", "category": "생활습관", "frequency_type": "daily"},
    ],
    "자기계발": [
        {"name": "유익한 콘텐츠 1개 시청", "category": "자기계발", "frequency_type": "daily"},
        {"name": "새로운 것 1가지 배우기", "category": "자기계발", "frequency_type": "weekly", "frequency_value": 2, "days_of_week": [1, 4]},
        {"name": "목표 점검", "category": "자기계발", "frequency_type": "weekly", "frequency_value": 1, "days_of_week": [6]},
    ],
}


async def _get_or_create_profile(db: AsyncSession, user_id: str) -> UserProfile:
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
        await db.flush()
    return profile


# ─── 상태 확인 ────────────────────────────────────────────────────
@router.get("/status")
async def get_status(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    return {
        "completed": profile.onboarding_completed if profile else False,
        "nickname": profile.nickname if profile else "",
        "goal_category": profile.goal_category if profile else None,
        "main_difficulty": profile.main_difficulty if profile else None,
        "reminder_time": profile.reminder_time if profile else None,
    }


# ─── 닉네임 저장 ──────────────────────────────────────────────────
class ProfileRequest(BaseModel):
    nickname: str


@router.post("/profile")
async def save_profile(
    body: ProfileRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    profile = await _get_or_create_profile(db, user_id)
    profile.nickname = body.nickname.strip()
    await db.commit()
    return {"message": "닉네임 저장 완료", "nickname": profile.nickname}


@router.put("/profile")
async def update_profile(
    body: ProfileRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    profile = await _get_or_create_profile(db, user_id)
    profile.nickname = body.nickname.strip()
    await db.commit()
    return {"message": "닉네임 수정 완료", "nickname": profile.nickname}


# ─── 목표 저장 ────────────────────────────────────────────────────
class GoalsRequest(BaseModel):
    goal_category: str   # 운동/공부/생산성/생활습관/자기계발
    main_difficulty: str  # start/consistency/restart


@router.post("/goals")
async def save_goals(
    body: GoalsRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    profile = await _get_or_create_profile(db, user_id)
    profile.goal_category = body.goal_category
    profile.main_difficulty = body.main_difficulty
    await db.commit()
    return {"message": "목표 저장 완료"}


# ─── 추천 루틴 목록 반환 ──────────────────────────────────────────
@router.get("/recommended-routines")
async def get_recommended_routines(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    goal = profile.goal_category if profile else "생활습관"
    routines = RECOMMENDED_ROUTINES.get(goal, RECOMMENDED_ROUTINES["생활습관"])
    return {"goal_category": goal, "routines": routines}


# ─── 첫 루틴 생성 ─────────────────────────────────────────────────
class RoutineItem(BaseModel):
    name: str
    category: Optional[str] = None
    frequency_type: str = "daily"
    frequency_value: Optional[int] = None
    days_of_week: Optional[list[int]] = None
    preferred_time: Optional[str] = None


class RoutinesRequest(BaseModel):
    routines: list[RoutineItem]


@router.post("/routines")
async def save_routines(
    body: RoutinesRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    created = []
    for item in body.routines[:5]:  # 최대 5개
        routine = Routine(
            user_id=user_id,
            name=item.name,
            category=item.category,
            frequency_type=item.frequency_type,
            frequency_value=item.frequency_value,
            days_of_week=item.days_of_week,
            preferred_time=item.preferred_time,
        )
        db.add(routine)
        created.append(item.name)
    await db.commit()
    return {"message": "루틴 생성 완료", "created": created}


# ─── 알림 시간 저장 ───────────────────────────────────────────────
class ReminderRequest(BaseModel):
    reminder_time: str  # "22:00"


@router.post("/reminder")
async def save_reminder(
    body: ReminderRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    profile = await _get_or_create_profile(db, user_id)
    profile.reminder_time = body.reminder_time
    await db.commit()
    return {"message": "알림 시간 저장 완료", "reminder_time": body.reminder_time}


# ─── 온보딩 완료 ──────────────────────────────────────────────────
@router.post("/complete")
async def complete_onboarding(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    profile = await _get_or_create_profile(db, user_id)
    profile.onboarding_completed = True
    await db.commit()
    return {"message": "온보딩 완료"}
