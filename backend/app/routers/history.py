from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.models import Routine

router = APIRouter(prefix="/history", tags=["history"])


class RoutineHistoryItem(BaseModel):
    id: str
    name: str
    category: Optional[str]
    status: str
    created_at: str
    archived_at: Optional[str]
    restarted_at: Optional[str]
    frequency_type: str
    frequency_value: Optional[int]


@router.get("/", response_model=list[RoutineHistoryItem])
async def get_history(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """모든 루틴(활성+중단) 목록 — 시작일/중단일/재시작 이력 포함."""
    result = await db.execute(
        select(Routine)
        .where(Routine.user_id == user_id)
        .order_by(Routine.created_at.desc())
    )
    routines = result.scalars().all()
    return [
        RoutineHistoryItem(
            id=r.id,
            name=r.name,
            category=r.category,
            status=r.status,
            created_at=str(r.created_at),
            archived_at=str(r.archived_at) if r.archived_at else None,
            restarted_at=str(r.restarted_at) if r.restarted_at else None,
            frequency_type=r.frequency_type,
            frequency_value=r.frequency_value,
        )
        for r in routines
    ]
