from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_client_token
from app.db import get_db
from app.schemas import DashboardResponse, HistoryResponse
from app.services import session_service

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    client_token: str = Depends(require_client_token),
) -> DashboardResponse:
    return DashboardResponse(**session_service.dashboard_for_client(db, client_token))


@router.get("/history", response_model=HistoryResponse)
def get_history(
    db: Session = Depends(get_db),
    client_token: str = Depends(require_client_token),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> HistoryResponse:
    items, total = session_service.list_summaries(
        db, client_token, status="submitted", limit=limit, offset=offset
    )
    return HistoryResponse(items=items, total=total, limit=limit, offset=offset)
