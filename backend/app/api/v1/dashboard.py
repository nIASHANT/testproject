from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rbac import require_reader
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardStatsResponse
from app.services.dashboard_service import get_dashboard_stats


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get(
    "/stats",
    response_model=DashboardStatsResponse,
)
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    return get_dashboard_stats(db)
