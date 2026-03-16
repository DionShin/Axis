from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.models import CommunityRoutine, Routine
from app.schemas.schemas import CommunityRoutineCreate, CommunityRoutineResponse, RoutineCreate
from app.services.routine_service import add_history_event

router = APIRouter(prefix="/community", tags=["community"])


@router.get("/", response_model=list[CommunityRoutineResponse])
async def get_community_routines(
    tag: str | None = None,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """커뮤니티 루틴 목록 (태그 필터 + 텍스트 검색 선택)."""
    result = await db.execute(
        select(CommunityRoutine).order_by(CommunityRoutine.fork_count.desc())
    )
    routines = result.scalars().all()

    if tag and tag != "전체":
        routines = [r for r in routines if tag in r.tags]

    if q:
        q_lower = q.lower()
        routines = [
            r for r in routines
            if q_lower in r.routine_name.lower()
            or q_lower in (r.description or "").lower()
            or q_lower in r.category_name.lower()
        ]

    return [CommunityRoutineResponse(
        id=r.id,
        author_user_id=r.author_user_id,
        author_name=r.author_name,
        author_level=r.author_level,
        stat_id=r.stat_id,
        category_name=r.category_name,
        routine_name=r.routine_name,
        description=r.description,
        frequency=r.frequency,
        days_of_week=r.days_of_week,
        notification_time=r.notification_time,
        tags=r.tags,
        fork_count=r.fork_count,
        like_count=r.like_count,
        created_at=r.created_at,
    ) for r in routines]


@router.post("/share", response_model=CommunityRoutineResponse, status_code=201)
async def share_routine(body: CommunityRoutineCreate, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """내 루틴을 커뮤니티에 공유."""
    body_data = body.model_dump()
    author_name = body_data.pop("author_name", "익명")
    author_level = body_data.pop("author_level", 1)

    cr = CommunityRoutine(
        author_user_id=user_id,
        author_name=author_name,
        author_level=author_level,
        **body_data,
    )
    db.add(cr)
    await db.commit()
    await db.refresh(cr)
    return CommunityRoutineResponse(
        id=cr.id, author_user_id=cr.author_user_id, author_name=cr.author_name,
        author_level=cr.author_level, stat_id=cr.stat_id, category_name=cr.category_name,
        routine_name=cr.routine_name, description=cr.description, frequency=cr.frequency,
        days_of_week=cr.days_of_week, notification_time=cr.notification_time,
        tags=cr.tags, fork_count=cr.fork_count, like_count=cr.like_count, created_at=cr.created_at,
    )


@router.post("/{community_id}/fork", response_model=dict)
async def fork_routine(
    community_id: str,
    category_id: str,               # 어느 카테고리에 추가할지
    notification_time: str | None = None,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    커뮤니티 루틴을 내 플랜으로 복제 (소셜 포킹).
    1. community_routine 조회
    2. 내 Routine 테이블에 복사본 생성 (is_forked=True)
    3. fork_count +1
    4. 히스토리 기록
    """
    result = await db.execute(select(CommunityRoutine).where(CommunityRoutine.id == community_id))
    cr = result.scalar_one_or_none()
    if not cr:
        raise HTTPException(status_code=404, detail="커뮤니티 루틴을 찾을 수 없습니다.")

    # 내 루틴으로 복제
    new_routine = Routine(
        category_id=category_id,
        user_id=user_id,
        name=cr.routine_name,
        description=cr.description,
        frequency=cr.frequency,
        days_of_week=cr.days_of_week,
        notification_time=notification_time or cr.notification_time,
        is_forked=True,
        original_routine_id=cr.id,
        original_author=cr.author_name,
    )
    db.add(new_routine)
    await db.flush()

    # fork_count 증가
    cr.fork_count += 1

    # 히스토리 기록
    await add_history_event(
        db,
        user_id=user_id,
        event_type="forked",
        content=f"{cr.author_name}의 루틴을 내 플랜에 추가",
        routine_id=new_routine.id,
    )

    await db.commit()
    return {"message": "포킹 완료", "new_routine_id": new_routine.id}


@router.post("/{community_id}/like", response_model=dict)
async def like_routine(community_id: str, db: AsyncSession = Depends(get_db)):
    """좋아요 토글 (단순화: 항상 +1, 실제 구현 시 like 테이블 별도 관리)."""
    result = await db.execute(select(CommunityRoutine).where(CommunityRoutine.id == community_id))
    cr = result.scalar_one_or_none()
    if not cr:
        raise HTTPException(status_code=404, detail="루틴을 찾을 수 없습니다.")
    cr.like_count += 1
    await db.commit()
    return {"like_count": cr.like_count}
