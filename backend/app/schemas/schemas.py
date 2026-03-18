"""
Pydantic 스키마 = API 요청/응답의 데이터 검증 및 직렬화.

파이썬 관점: dataclass와 비슷하지만 타입 검증이 자동으로 이루어짐.
- *Create: POST 요청 바디 (클라이언트 → 서버)
- *Response: GET/POST 응답 (서버 → 클라이언트)
"""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


# ─── Stat ─────────────────────────────────────────────────────────
class StatResponse(BaseModel):
    id: str
    user_id: str
    name: str
    icon: str
    color: str
    score: float = 0.0   # 계산된 값 (DB에는 없음, 서버에서 계산)

    model_config = ConfigDict(from_attributes=True)


# ─── Category ─────────────────────────────────────────────────────
class CategoryCreate(BaseModel):
    stat_id: str
    name: str
    icon: str
    description: Optional[str] = None

class CategoryResponse(BaseModel):
    id: str
    stat_id: str
    user_id: str
    name: str
    icon: str
    description: Optional[str] = None
    order_index: int
    routine_count: int = 0      # 계산된 값
    weekly_rate: float = 0.0    # 계산된 값

    model_config = ConfigDict(from_attributes=True)


# ─── Routine ──────────────────────────────────────────────────────
class RoutineCreate(BaseModel):
    category_id: str
    name: str
    description: Optional[str] = None
    frequency: str = "daily"          # daily / alternate / weekdays
    days_of_week: Optional[list[int]] = None
    notification_time: Optional[str] = None
    is_forked: bool = False
    original_routine_id: Optional[str] = None
    original_author: Optional[str] = None

class RoutineUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None
    days_of_week: Optional[list[int]] = None
    notification_time: Optional[str] = None
    is_active: Optional[bool] = None

class RoutineResponse(BaseModel):
    id: str
    category_id: str
    user_id: str
    name: str
    description: Optional[str] = None
    frequency: str
    days_of_week: Optional[list[int]] = None
    notification_time: Optional[str] = None
    is_active: bool
    is_forked: bool
    original_author: Optional[str] = None
    weekly_rate: float = 0.0   # 계산된 값 (최근 7일 달성률)
    streak: int = 0             # 계산된 값 (현재 연속 달성일)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── RoutineLog ───────────────────────────────────────────────────
class LogToggleRequest(BaseModel):
    routine_id: str
    date: date
    completed: bool
    note: Optional[str] = None

class LogResponse(BaseModel):
    id: str
    routine_id: str
    date: date
    completed: bool
    note: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ─── GrowthHistory ────────────────────────────────────────────────
class HistoryResponse(BaseModel):
    id: str
    user_id: str
    routine_id: Optional[str] = None
    routine_name: Optional[str] = None   # 조인으로 채워지는 필드
    stat_id: Optional[str] = None        # 조인으로 채워지는 필드
    event_type: str
    content: str
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── CommunityRoutine ─────────────────────────────────────────────
class CommunityRoutineCreate(BaseModel):
    stat_id: str
    category_name: str
    routine_name: str
    description: str
    frequency: str
    days_of_week: Optional[list[int]] = None
    notification_time: Optional[str] = None
    tags: list[str] = []
    author_name: str = "익명"
    author_level: int = 1

class CommunityRoutineResponse(BaseModel):
    id: str
    author_user_id: str
    author_name: str
    author_level: int
    stat_id: str
    category_name: str
    routine_name: str
    description: str
    frequency: str
    days_of_week: Optional[list[int]] = None
    notification_time: Optional[str] = None
    tags: list[str]
    fork_count: int
    like_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── 대시보드 요약 (여러 테이블 조합) ────────────────────────────
class DashboardResponse(BaseModel):
    level: int
    xp_current: int
    stats: list[StatResponse]
    today_routines: list[RoutineResponse]
    upcoming_notification: Optional[RoutineResponse] = None


# ─── 온보딩 ───────────────────────────────────────────────────────
class OnboardingProfileRequest(BaseModel):
    nickname: str

class OnboardingKeywordsRequest(BaseModel):
    keywords: list[str]

class OnboardingSNSRequest(BaseModel):
    instagram_id: Optional[str] = None
    kakao_id: Optional[str] = None
    phone: Optional[str] = None

class OnboardingStatusResponse(BaseModel):
    completed: bool
    nickname: str
