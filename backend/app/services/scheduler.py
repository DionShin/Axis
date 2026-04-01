import json
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="Asia/Seoul")


async def _send_push_to_all(title: str, body: str, url: str = "/"):
    from app.core.database import AsyncSessionLocal
    from app.models.models import PushSubscription
    from app.services.push_service import send_push
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(PushSubscription))
        subs = result.scalars().all()

    sent = 0
    for sub in subs:
        info = {"endpoint": sub.endpoint, "keys": json.loads(sub.keys)}
        if send_push(info, title, body, url):
            sent += 1

    logger.info("[%s] 푸시 전송: %d/%d", title, sent, len(subs))


async def _morning_reminder():
    await _send_push_to_all("Axis", "오늘 루틴을 시작해볼까요? 체크하러 가기", "/")


async def _evening_reminder():
    await _send_push_to_all("Axis", "오늘 루틴 체크 완료했나요? 마지막으로 확인해보세요.", "/")


def start_scheduler():
    scheduler.add_job(_morning_reminder, CronTrigger(hour=8, minute=0), id="morning", replace_existing=True)
    scheduler.add_job(_evening_reminder, CronTrigger(hour=22, minute=0), id="evening", replace_existing=True)
    scheduler.start()
    logger.info("스케줄러 시작 — 08:00 / 22:00")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
