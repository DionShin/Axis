"""
SQLAlchemy ORM 모델 = DB 테이블 정의.

파이썬 관점: 각 클래스 = 테이블, 클래스 인스턴스 = 행(row).
Mapped[type]은 Python 타입 힌트를 그대로 컬럼 타입으로 쓰는 SQLAlchemy 2.0 문법.
"""
import uuid
from datetime import datetime, date as _date
from typing import Optional

from sqlalchemy import JSON, Boolean, Date, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


# ─── UserProfile (온보딩) ──────────────────────────────────────────
class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    nickname: Mapped[str] = mapped_column(String(50), nullable=False, default="익명")
    instagram_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    kakao_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=func.now())


# ─── Stats (L1) ───────────────────────────────────────────────────
class Stat(Base):
    __tablename__ = "stats"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String, index=True)
    name: Mapped[str] = mapped_column(String(20))    # 외모/매너/체력/지성/자산
    icon: Mapped[str] = mapped_column(String(10))
    color: Mapped[str] = mapped_column(String(20))

    categories: Mapped[list["Category"]] = relationship(back_populates="stat", cascade="all, delete-orphan")


# ─── Categories (L2) ──────────────────────────────────────────────
class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    stat_id: Mapped[str] = mapped_column(ForeignKey("stats.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(String, index=True)
    name: Mapped[str] = mapped_column(String(50))
    icon: Mapped[str] = mapped_column(String(10))
    description: Mapped[Optional[str]] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(default=0)

    stat: Mapped["Stat"] = relationship(back_populates="categories")
    routines: Mapped[list["Routine"]] = relationship(back_populates="category", cascade="all, delete-orphan")


# ─── Routines (L3) ────────────────────────────────────────────────
class Routine(Base):
    __tablename__ = "routines"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    category_id: Mapped[str] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(String, index=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text)

    # daily / alternate / weekdays
    frequency: Mapped[str] = mapped_column(String(20), default="daily")
    # [0,1,2,3,4,5,6] (일=0 ~ 토=6), JSON으로 저장
    days_of_week: Mapped[Optional[list]] = mapped_column(JSON)
    notification_time: Mapped[Optional[str]] = mapped_column(String(5))  # "22:30"

    is_active: Mapped[bool] = mapped_column(default=True)
    is_forked: Mapped[bool] = mapped_column(default=False)
    original_routine_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    original_author: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=func.now())

    category: Mapped["Category"] = relationship(back_populates="routines")
    logs: Mapped[list["RoutineLog"]] = relationship(back_populates="routine", cascade="all, delete-orphan")
    history: Mapped[list["GrowthHistory"]] = relationship(back_populates="routine")


# ─── RoutineLogs (날짜별 O/X) ─────────────────────────────────────
class RoutineLog(Base):
    __tablename__ = "routine_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    routine_id: Mapped[str] = mapped_column(ForeignKey("routines.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(String, index=True)
    log_date: Mapped[_date] = mapped_column(Date, index=True)
    completed: Mapped[bool] = mapped_column(default=False)
    note: Mapped[Optional[str]] = mapped_column(Text)

    routine: Mapped["Routine"] = relationship(back_populates="logs")


# ─── GrowthHistory (성장 타임라인) ────────────────────────────────
class GrowthHistory(Base):
    __tablename__ = "growth_history"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String, index=True)
    routine_id: Mapped[Optional[str]] = mapped_column(ForeignKey("routines.id", ondelete="SET NULL"), nullable=True)
    # routine_added / routine_deleted / habit_formed / forked / quit / streak_broken
    event_type: Mapped[str] = mapped_column(String(30))
    content: Mapped[str] = mapped_column(Text)
    note: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    routine: Mapped[Optional["Routine"]] = relationship(back_populates="history")


# ─── PushSubscriptions (Web Push 구독) ──────────────────────────
class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String, index=True)
    endpoint: Mapped[str] = mapped_column(Text, unique=True)
    keys: Mapped[str] = mapped_column(Text)  # JSON: {"p256dh": "...", "auth": "..."}
    created_at: Mapped[datetime] = mapped_column(default=func.now())


# ─── CommunityRoutines (공유 루틴) ───────────────────────────────
class CommunityRoutine(Base):
    __tablename__ = "community_routines"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    author_user_id: Mapped[str] = mapped_column(String, index=True)
    author_name: Mapped[str] = mapped_column(String(50))
    author_level: Mapped[int] = mapped_column(default=1)
    stat_id: Mapped[str] = mapped_column(String(30))      # 외모/체력 등 id
    category_name: Mapped[str] = mapped_column(String(50))
    routine_name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    frequency: Mapped[str] = mapped_column(String(20))
    days_of_week: Mapped[Optional[list]] = mapped_column(JSON)
    notification_time: Mapped[Optional[str]] = mapped_column(String(5))
    tags: Mapped[list] = mapped_column(JSON, default=list)
    fork_count: Mapped[int] = mapped_column(default=0)
    like_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
