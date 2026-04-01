from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.models import Routine, RoutineCheck

router = APIRouter(prefix="/reports", tags=["reports"])

DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"]


async def _compute_report(db: AsyncSession, user_id: str, start: date, end: date) -> dict:
    days = (end - start).days + 1

    result = await db.execute(
        select(Routine).where(Routine.user_id == user_id, Routine.status == "active")
    )
    routines = result.scalars().all()

    if not routines:
        return {
            "period": {"start": str(start), "end": str(end)},
            "total_routines": 0,
            "completion_rate": 0,
            "best_routine": None,
            "worst_routine": None,
            "pattern_summary": "아직 루틴이 없어요. 첫 루틴을 추가해보세요.",
            "next_action": "루틴을 추가해보세요.",
        }

    # 루틴별 달성률 계산
    routine_rates = []
    for r in routines:
        result = await db.execute(
            select(func.count(RoutineCheck.id), func.sum(RoutineCheck.checked.cast("int")))
            .where(
                RoutineCheck.routine_id == r.id,
                RoutineCheck.user_id == user_id,
                RoutineCheck.date >= start,
                RoutineCheck.date <= end,
            )
        )
        row = result.one()
        total, done = row[0], int(row[1] or 0)
        rate = round(done / total * 100) if total > 0 else 0
        routine_rates.append({"id": r.id, "name": r.name, "rate": rate, "done": done, "total": total})

    routine_rates.sort(key=lambda x: x["rate"])

    best = routine_rates[-1] if routine_rates else None
    worst = routine_rates[0] if routine_rates else None

    # 전체 달성률
    total_done = sum(r["done"] for r in routine_rates)
    total_possible = sum(r["total"] for r in routine_rates)
    completion_rate = round(total_done / total_possible * 100) if total_possible > 0 else 0

    # 요일별 패턴 (어떤 요일에 가장 많이 빠지는지)
    result = await db.execute(
        select(RoutineCheck.date, RoutineCheck.checked)
        .where(
            RoutineCheck.user_id == user_id,
            RoutineCheck.date >= start,
            RoutineCheck.date <= end,
        )
    )
    all_checks = result.all()

    dow_stats: dict[int, dict] = {i: {"total": 0, "done": 0} for i in range(7)}
    for check_date, checked in all_checks:
        dow = check_date.weekday()
        dow_stats[dow]["total"] += 1
        if checked:
            dow_stats[dow]["done"] += 1

    worst_dow = min(
        (k for k, v in dow_stats.items() if v["total"] > 0),
        key=lambda k: dow_stats[k]["done"] / dow_stats[k]["total"] if dow_stats[k]["total"] > 0 else 1,
        default=None,
    )
    best_dow = max(
        (k for k, v in dow_stats.items() if v["total"] > 0),
        key=lambda k: dow_stats[k]["done"] / dow_stats[k]["total"] if dow_stats[k]["total"] > 0 else 0,
        default=None,
    )

    # 패턴 요약 텍스트
    if completion_rate >= 80:
        summary = f"이번 기간 전체 달성률 {completion_rate}%. 꾸준히 잘 유지되고 있어요."
    elif completion_rate >= 50:
        summary = f"이번 기간 전체 달성률 {completion_rate}%. 절반 이상 달성했지만 개선 여지가 있어요."
    else:
        summary = f"이번 기간 전체 달성률 {completion_rate}%. 다시 페이스를 찾아볼 때예요."

    if worst_dow is not None and dow_stats[worst_dow]["total"] > 0:
        worst_rate = round(dow_stats[worst_dow]["done"] / dow_stats[worst_dow]["total"] * 100)
        if worst_rate < 60:
            summary += f" {DAY_NAMES[worst_dow]}요일에 가장 많이 빠졌어요."

    # 다음 행동 제안
    if best and worst and best["id"] != worst["id"] and worst["rate"] < 50:
        next_action = f"'{worst['name']}' 루틴이 가장 힘들었어요. 횟수를 줄이거나 시간대를 바꿔보세요."
    elif completion_rate >= 80:
        next_action = "잘 하고 있어요! 새로운 루틴 하나를 추가해볼 시점이에요."
    else:
        next_action = "오늘 하루만 집중해보세요. 작은 달성이 습관을 만들어요."

    return {
        "period": {"start": str(start), "end": str(end)},
        "total_routines": len(routines),
        "completion_rate": completion_rate,
        "best_routine": {"id": best["id"], "name": best["name"], "rate": best["rate"]} if best else None,
        "worst_routine": {"id": worst["id"], "name": worst["name"], "rate": worst["rate"]} if worst else None,
        "pattern_summary": summary,
        "next_action": next_action,
    }


@router.get("/weekly")
async def get_weekly_report(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    today = date.today()
    start = today - timedelta(days=6)
    return await _compute_report(db, user_id, start, today)


@router.get("/monthly")
async def get_monthly_report(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    today = date.today()
    start = today.replace(day=1)
    return await _compute_report(db, user_id, start, today)
