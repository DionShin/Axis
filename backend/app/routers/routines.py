from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.models import Routine, RoutineCheck

router = APIRouter(prefix="/routines", tags=["routines"])


async def calc_streak(db: AsyncSession, routine_id: str, user_id: str) -> int:
    result = await db.execute(
        select(RoutineCheck.date)
        .where(RoutineCheck.routine_id == routine_id, RoutineCheck.user_id == user_id, RoutineCheck.checked == True)
        .order_by(RoutineCheck.date.desc())
    )
    dates = [row[0] for row in result.all()]
    if not dates:
        return 0
    streak = 0
    expected = date.today()
    for d in dates:
        if d == expected:
            streak += 1
            expected -= timedelta(days=1)
        else:
            break
    return streak


async def calc_weekly_rate(db: AsyncSession, routine_id: str, user_id: str) -> int:
    since = date.today() - timedelta(days=6)
    result = await db.execute(
        select(func.count(RoutineCheck.id), func.sum(RoutineCheck.checked.cast("int")))
        .where(RoutineCheck.routine_id == routine_id, RoutineCheck.user_id == user_id, RoutineCheck.date >= since)
    )
    row = result.one()
    total, done = row[0], int(row[1] or 0)
    return round(done / total * 100) if total > 0 else 0


async def is_today_checked(db: AsyncSession, routine_id: str, user_id: str) -> bool:
    result = await db.execute(
        select(RoutineCheck).where(
            RoutineCheck.routine_id == routine_id,
            RoutineCheck.user_id == user_id,
            RoutineCheck.date == date.today(),
            RoutineCheck.checked == True,
        )
    )
    return result.scalar_one_or_none() is not None


class RoutineCreate(BaseModel):
    name: str
    category: Optional[str] = None
    frequency_type: str = "daily"
    frequency_value: Optional[int] = None
    days_of_week: Optional[list[int]] = None
    preferred_time: Optional[str] = None


class RoutineUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    frequency_type: Optional[str] = None
    frequency_value: Optional[int] = None
    days_of_week: Optional[list[int]] = None
    preferred_time: Optional[str] = None


class RoutineResponse(BaseModel):
    id: str
    user_id: str
    name: str
    category: Optional[str]
    frequency_type: str
    frequency_value: Optional[int]
    days_of_week: Optional[list[int]]
    preferred_time: Optional[str]
    status: str
    created_at: str
    archived_at: Optional[str]
    restarted_at: Optional[str]
    streak: int
    weekly_rate: int
    today_checked: bool


async def to_response(routine: Routine, db: AsyncSession, user_id: str) -> RoutineResponse:
    return RoutineResponse(
        id=routine.id,
        user_id=routine.user_id,
        name=routine.name,
        category=routine.category,
        frequency_type=routine.frequency_type,
        frequency_value=routine.frequency_value,
        days_of_week=routine.days_of_week,
        preferred_time=routine.preferred_time,
        status=routine.status,
        created_at=str(routine.created_at),
        archived_at=str(routine.archived_at) if routine.archived_at else None,
        restarted_at=str(routine.restarted_at) if routine.restarted_at else None,
        streak=await calc_streak(db, routine.id, user_id),
        weekly_rate=await calc_weekly_rate(db, routine.id, user_id),
        today_checked=await is_today_checked(db, routine.id, user_id),
    )


@router.get("/today", response_model=list[RoutineResponse])
async def get_today_routines(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    dow = date.today().weekday()  # 0=월 ~ 6=일
    result = await db.execute(
        select(Routine)
        .where(Routine.user_id == user_id, Routine.status == "active")
        .order_by(Routine.preferred_time.nullslast(), Routine.created_at)
    )
    routines = result.scalars().all()
    today_list = []
    for r in routines:
        if r.frequency_type == "daily":
            today_list.append(r)
        elif r.frequency_type == "weekly" and r.days_of_week and dow in r.days_of_week:
            today_list.append(r)
    return [await to_response(r, db, user_id) for r in today_list]


@router.get("/", response_model=list[RoutineResponse])
async def get_routines(
    status: str = "active",
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Routine)
        .where(Routine.user_id == user_id, Routine.status == status)
        .order_by(Routine.created_at)
    )
    return [await to_response(r, db, user_id) for r in result.scalars().all()]


@router.post("/", response_model=RoutineResponse, status_code=201)
async def create_routine(
    body: RoutineCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    routine = Routine(
        user_id=user_id,
        name=body.name,
        category=body.category,
        frequency_type=body.frequency_type,
        frequency_value=body.frequency_value,
        days_of_week=body.days_of_week,
        preferred_time=body.preferred_time,
    )
    db.add(routine)
    await db.commit()
    await db.refresh(routine)
    return await to_response(routine, db, user_id)


@router.patch("/{routine_id}", response_model=RoutineResponse)
async def update_routine(
    routine_id: str,
    body: RoutineUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(Routine).where(Routine.id == routine_id, Routine.user_id == user_id))
    routine = result.scalar_one_or_none()
    if not routine:
        raise HTTPException(status_code=404, detail="루틴을 찾을 수 없습니다.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(routine, field, value)
    await db.commit()
    await db.refresh(routine)
    return await to_response(routine, db, user_id)


@router.post("/{routine_id}/archive", status_code=200)
async def archive_routine(
    routine_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(Routine).where(Routine.id == routine_id, Routine.user_id == user_id))
    routine = result.scalar_one_or_none()
    if not routine:
        raise HTTPException(status_code=404, detail="루틴을 찾을 수 없습니다.")
    routine.status = "archived"
    routine.archived_at = datetime.now()
    await db.commit()
    return {"message": "루틴이 중단되었습니다."}


@router.post("/{routine_id}/restart", status_code=200)
async def restart_routine(
    routine_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(Routine).where(Routine.id == routine_id, Routine.user_id == user_id))
    routine = result.scalar_one_or_none()
    if not routine:
        raise HTTPException(status_code=404, detail="루틴을 찾을 수 없습니다.")
    routine.status = "active"
    routine.restarted_at = datetime.now()
    await db.commit()
    return {"message": "루틴이 재시작되었습니다."}


@router.delete("/{routine_id}", status_code=204)
async def delete_routine(
    routine_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(Routine).where(Routine.id == routine_id, Routine.user_id == user_id))
    routine = result.scalar_one_or_none()
    if not routine:
        raise HTTPException(status_code=404, detail="루틴을 찾을 수 없습니다.")
    await db.delete(routine)
    await db.commit()
