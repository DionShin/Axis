import uuid
from datetime import datetime, date as _date
from typing import Optional

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


# ─── UserProfile ──────────────────────────────────────────────────
class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    nickname: Mapped[str] = mapped_column(String(50), nullable=False, default="익명")
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    goal_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    main_difficulty: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    reminder_time: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())


# ─── Routine ──────────────────────────────────────────────────────
class Routine(Base):
    __tablename__ = "routines"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String, index=True)
    name: Mapped[str] = mapped_column(String(100))
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    frequency_type: Mapped[str] = mapped_column(String(10), default="daily")
    frequency_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    days_of_week: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    preferred_time: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    status: Mapped[str] = mapped_column(String(10), default="active")
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    restarted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    checks: Mapped[list["RoutineCheck"]] = relationship(back_populates="routine", cascade="all, delete-orphan")


# ─── RoutineCheck ─────────────────────────────────────────────────
class RoutineCheck(Base):
    __tablename__ = "routine_checks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    routine_id: Mapped[str] = mapped_column(ForeignKey("routines.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(String, index=True)
    date: Mapped[_date] = mapped_column(Date, index=True)
    checked: Mapped[bool] = mapped_column(Boolean, default=False)

    routine: Mapped["Routine"] = relationship(back_populates="checks")


# ─── InsightReport ────────────────────────────────────────────────
class InsightReport(Base):
    __tablename__ = "insight_reports"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String, index=True)
    period_type: Mapped[str] = mapped_column(String(10))
    start_date: Mapped[_date] = mapped_column(Date)
    end_date: Mapped[_date] = mapped_column(Date)
    best_routine_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    worst_routine_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    completion_rate: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(default=func.now())


# ─── PushSubscription ─────────────────────────────────────────────
class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String, index=True)
    endpoint: Mapped[str] = mapped_column(Text, unique=True)
    keys: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
