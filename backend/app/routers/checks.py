from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import and_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.models import Routine, RoutineCheck

router = APIRouter(prefix="/checks", tags=["checks"])


class CheckToggleRequest(BaseModel):
    routine_id: str
    date: str       # "YYYY-MM-DD"
    checked: bool


class CheckResponse(BaseModel):
    id: str
    routine_id: str
    date: str
    checked: bool


class HeatmapItem(BaseModel):
    date: str
    total: int
    checked: int
    rate: int


@router.post("/toggle", response_model=CheckResponse)
async def toggle_check(
    body: CheckToggleRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    check_date = date.fromisoformat(body.date)

    # 루틴 소유권 확인
    result = await db.execute(
        select(Routine).where(Routine.id == body.routine_id, Routine.user_id == user_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="루틴을 찾을 수 없습니다.")

    # upsert
    result = await db.execute(
        select(RoutineCheck).where(
            RoutineCheck.routine_id == body.routine_id,
            RoutineCheck.user_id == user_id,
            RoutineCheck.date == check_date,
        )
    )
    check = result.scalar_one_or_none()

    if check:
        check.checked = body.checked
    else:
        check = RoutineCheck(
            routine_id=body.routine_id,
            user_id=user_id,
            date=check_date,
            checked=body.checked,
        )
        db.add(check)

    await db.commit()
    await db.refresh(check)
    return CheckResponse(id=check.id, routine_id=check.routine_id, date=str(check.date), checked=check.checked)


@router.get("/heatmap", response_model=list[HeatmapItem])
async def get_heatmap(
    days: int = 90,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """days일치 날짜별 체크 현황 반환."""
    since = date.today() - timedelta(days=days - 1)

    # 활성 루틴 수
    routine_result = await db.execute(
        select(func.count(Routine.id)).where(Routine.user_id == user_id, Routine.status == "active")
    )
    total_routines = routine_result.scalar() or 0

    # 날짜별 체크 집계
    result = await db.execute(
        select(RoutineCheck.date, func.sum(RoutineCheck.checked.cast("int")).label("checked_count"))
        .where(RoutineCheck.user_id == user_id, RoutineCheck.date >= since)
        .group_by(RoutineCheck.date)
        .order_by(RoutineCheck.date)
    )
    rows = result.all()

    check_map = {str(row.date): int(row.checked_count or 0) for row in rows}

    heatmap = []
    for i in range(days):
        d = since + timedelta(days=i)
        ds = str(d)
        checked = check_map.get(ds, 0)
        rate = round(checked / total_routines * 100) if total_routines > 0 else 0
        heatmap.append(HeatmapItem(date=ds, total=total_routines, checked=checked, rate=rate))

    return heatmap


@router.get("/{routine_id}", response_model=list[CheckResponse])
async def get_checks_for_routine(
    routine_id: str,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    since = date.today() - timedelta(days=days - 1)
    result = await db.execute(
        select(RoutineCheck).where(
            RoutineCheck.routine_id == routine_id,
            RoutineCheck.user_id == user_id,
            RoutineCheck.date >= since,
        ).order_by(RoutineCheck.date)
    )
    checks = result.scalars().all()
    return [CheckResponse(id=c.id, routine_id=c.routine_id, date=str(c.date), checked=c.checked) for c in checks]
