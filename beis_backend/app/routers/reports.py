"""Report endpoints."""

from fastapi import APIRouter, Depends
from app.data.models import User
from app.dependencies import get_current_user
from app.services.report_service import get_weekly_report

router = APIRouter(prefix="/report", tags=["reports"])


@router.get("/weekly")
async def weekly_report(user: User = Depends(get_current_user)):
    return await get_weekly_report(str(user.id))
