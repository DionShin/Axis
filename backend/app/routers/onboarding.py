"""
온보딩 라우터.

신규 가입자의 4단계 온보딩 흐름을 처리:
  1. 프로필(닉네임) 저장
  2. 관심 키워드 → 카테고리 + 루틴 자동 생성
  3. SNS 연동 정보 저장 (선택)
  4. 온보딩 완료 처리
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.models import Category, Routine, Stat, UserProfile
from app.schemas.schemas import (
    OnboardingKeywordsRequest,
    OnboardingProfileRequest,
    OnboardingSNSRequest,
    OnboardingStatusResponse,
)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

# ─── 키워드 → 스탯/카테고리/루틴 매핑 ───────────────────────────
KEYWORD_MAPPING = {
    # 외모
    "꿀피부": {
        "stat": "외모", "category": "피부 관리",
        "routines": ["약산성 세안", "비타민C 세럼 바르기", "선크림 도포"]
    },
    "어깨깡패": {
        "stat": "외모", "category": "상체 운동",
        "routines": ["어깨 프레스 3세트", "사이드 레터럴 레이즈", "밴드 풀 어파트"]
    },
    "깔끔한인상": {
        "stat": "외모", "category": "그루밍",
        "routines": ["주 1회 이발", "눈썹 정리", "향수 & 바디워시 루틴"]
    },
    "패션센스": {
        "stat": "외모", "category": "스타일링",
        "routines": ["코디 사진 기록", "옷장 정리", "트렌드 피드 체크"]
    },
    "다이어트": {
        "stat": "외모", "category": "체중 관리",
        "routines": ["칼로리 기록", "유산소 30분", "야식 끊기"]
    },
    # 매너
    "말잘하는법": {
        "stat": "매너", "category": "스피치",
        "routines": ["발성 연습 5분", "대화 일기 쓰기", "뉴스 소리내어 읽기"]
    },
    "비호감탈출": {
        "stat": "매너", "category": "인상 관리",
        "routines": ["미소 연습", "경청 훈련", "공감 표현 연습"]
    },
    "비즈니스매너": {
        "stat": "매너", "category": "직장 예절",
        "routines": ["이메일 작성 연습", "보고서 구조 정리", "회의 태도 점검"]
    },
    "데이트고수": {
        "stat": "매너", "category": "연애 스킬",
        "routines": ["대화 주제 3개 준비", "리드 연습", "감사 표현하기"]
    },
    "인싸력상승": {
        "stat": "매너", "category": "소셜 스킬",
        "routines": ["모임 1회 참여", "지인 연락 유지", "칭찬 습관 기르기"]
    },
    # 체력
    "헬스": {
        "stat": "체력", "category": "근력 운동",
        "routines": ["3분할 루틴 실행", "단백질 체중×2g 섭취", "수면 7-8시간"]
    },
    "러닝": {
        "stat": "체력", "category": "유산소",
        "routines": ["5km 러닝", "달리기 전 동적 스트레칭", "심박수 기록"]
    },
    "수면최적화": {
        "stat": "체력", "category": "수면 관리",
        "routines": ["취침 전 스마트폰 금지 30분", "기상 시간 고정", "블루라이트 차단 안경"]
    },
    "면역력강화": {
        "stat": "체력", "category": "건강 관리",
        "routines": ["비타민D 복용", "물 2L 마시기", "냉온수 교차 샤워"]
    },
    "유연성": {
        "stat": "체력", "category": "스트레칭",
        "routines": ["아침 스트레칭 10분", "폼롤러 마사지", "취침 전 요가"]
    },
    # 지성
    "경제공부": {
        "stat": "지성", "category": "재테크 지식",
        "routines": ["경제 뉴스 15분 읽기", "유튜브 경제 채널 1편", "용어 노트 정리"]
    },
    "독서왕": {
        "stat": "지성", "category": "독서",
        "routines": ["매일 30분 독서", "독서 노트 작성", "월 2권 목표"]
    },
    "영어공부": {
        "stat": "지성", "category": "영어",
        "routines": ["영어 뉴스 듣기 10분", "단어 20개 암기", "영어 일기 3줄"]
    },
    "자격증": {
        "stat": "지성", "category": "자기계발",
        "routines": ["자격증 공부 1시간", "모의고사 풀기", "오답 노트 정리"]
    },
    "코딩": {
        "stat": "지성", "category": "IT 스킬",
        "routines": ["코딩 1시간", "강의 1강 수강", "사이드 프로젝트 진행"]
    },
    # 자산
    "주식투자": {
        "stat": "자산", "category": "주식",
        "routines": ["종목 분석 10분", "포트폴리오 점검", "경제 기사 스크랩"]
    },
    "절약고수": {
        "stat": "자산", "category": "절약",
        "routines": ["가계부 작성", "충동구매 체크리스트", "월 예산 설정"]
    },
    "부업수익": {
        "stat": "자산", "category": "부업",
        "routines": ["부업 작업 1시간", "수익 기록", "시장 조사 15분"]
    },
    "부동산공부": {
        "stat": "자산", "category": "부동산",
        "routines": ["청약 정보 확인", "임장 기록 작성", "부동산 뉴스 스크랩"]
    },
    "재테크루틴": {
        "stat": "자산", "category": "재무 관리",
        "routines": ["자산 현황 파악", "지출 분석", "목표 저축액 확인"]
    },
}


# ─── GET /onboarding/status ──────────────────────────────────────
@router.get("/status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """온보딩 완료 여부 및 닉네임 반환."""
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        return OnboardingStatusResponse(completed=False, nickname="")
    return OnboardingStatusResponse(
        completed=profile.onboarding_completed,
        nickname=profile.nickname,
    )


# ─── POST /onboarding/profile ─────────────────────────────────────
@router.post("/profile", response_model=dict, status_code=201)
async def save_profile(
    body: OnboardingProfileRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """닉네임 저장 및 user_profile 행 생성(없으면) 또는 업데이트."""
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()

    if profile:
        profile.nickname = body.nickname
    else:
        profile = UserProfile(user_id=user_id, nickname=body.nickname)
        db.add(profile)

    await db.commit()
    return {"message": "프로필이 저장되었습니다.", "nickname": body.nickname}


# ─── POST /onboarding/keywords ────────────────────────────────────
@router.post("/keywords", response_model=dict)
async def save_keywords(
    body: OnboardingKeywordsRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    키워드 목록을 받아 카테고리와 루틴을 자동 생성.

    처리 순서:
    1. 각 키워드를 KEYWORD_MAPPING에서 조회
    2. 해당 스탯(외모/매너/체력/지성/자산)을 user_id로 조회
    3. 카테고리 생성 (같은 이름이 이미 있으면 스킵)
    4. 루틴 3개 생성
    """
    created_categories = []
    created_routines = []

    for keyword in body.keywords:
        mapping = KEYWORD_MAPPING.get(keyword)
        if not mapping:
            continue  # 알 수 없는 키워드는 무시

        stat_name = mapping["stat"]
        category_name = mapping["category"]
        routine_names = mapping["routines"]

        # 해당 스탯 조회 (user_id 기준)
        stat_result = await db.execute(
            select(Stat).where(Stat.user_id == user_id, Stat.name == stat_name)
        )
        stat = stat_result.scalar_one_or_none()
        if not stat:
            # 스탯이 없으면 카테고리/루틴 생성 불가 — 스킵
            continue

        # 동일한 카테고리가 이미 있는지 확인
        cat_result = await db.execute(
            select(Category).where(
                Category.user_id == user_id,
                Category.stat_id == stat.id,
                Category.name == category_name,
            )
        )
        category = cat_result.scalar_one_or_none()

        if not category:
            category = Category(
                stat_id=stat.id,
                user_id=user_id,
                name=category_name,
                icon="✅",
            )
            db.add(category)
            await db.flush()  # id 발급을 위해 flush
            created_categories.append(category_name)

        # 루틴 생성 (이미 같은 이름 있으면 스킵)
        for routine_name in routine_names:
            existing_result = await db.execute(
                select(Routine).where(
                    Routine.user_id == user_id,
                    Routine.category_id == category.id,
                    Routine.name == routine_name,
                )
            )
            existing = existing_result.scalar_one_or_none()
            if not existing:
                routine = Routine(
                    category_id=category.id,
                    user_id=user_id,
                    name=routine_name,
                    frequency="daily",
                )
                db.add(routine)
                created_routines.append(routine_name)

    await db.commit()
    return {
        "message": "키워드 처리가 완료되었습니다.",
        "created_categories": created_categories,
        "created_routines": created_routines,
    }


# ─── POST /onboarding/sns ─────────────────────────────────────────
@router.post("/sns", response_model=dict)
async def save_sns(
    body: OnboardingSNSRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """SNS 연동 정보 저장 (모두 선택사항)."""
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="프로필을 먼저 생성해주세요.")

    if body.instagram_id is not None:
        profile.instagram_id = body.instagram_id
    if body.kakao_id is not None:
        profile.kakao_id = body.kakao_id
    if body.phone is not None:
        profile.phone = body.phone

    await db.commit()
    return {"message": "SNS 정보가 저장되었습니다."}


# ─── POST /onboarding/complete ────────────────────────────────────
@router.post("/complete", response_model=dict)
async def complete_onboarding(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """온보딩 완료 처리 — onboarding_completed = True."""
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="프로필을 먼저 생성해주세요.")

    profile.onboarding_completed = True
    await db.commit()
    return {"message": "온보딩이 완료되었습니다."}
