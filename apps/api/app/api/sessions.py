from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import (
    CreateSessionRequest,
    ResultsResponse,
    SaveAnswersRequest,
    SessionResponse,
    SubmitRequest,
)
from app.services import session_service

router = APIRouter(tags=["sessions"])


@router.post("/sessions", response_model=SessionResponse)
def create_session(body: CreateSessionRequest, db: Session = Depends(get_db)) -> SessionResponse:
    session = session_service.create_session(
        db, body.track, body.difficulty, body.question_count
    )
    return SessionResponse(**session_service.session_with_questions(db, session))


@router.get("/sessions/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, db: Session = Depends(get_db)) -> SessionResponse:
    session = session_service.get_session_or_404(db, session_id)
    return SessionResponse(**session_service.session_with_questions(db, session))


@router.put("/sessions/{session_id}/answers")
def put_answers(
    session_id: str, body: SaveAnswersRequest, db: Session = Depends(get_db)
) -> dict:
    session = session_service.get_session_or_404(db, session_id)
    session_service.save_answers(db, session, body.answers)
    return {"ok": True}


@router.post("/sessions/{session_id}/submit", response_model=ResultsResponse)
def submit_session(
    session_id: str, body: SubmitRequest, db: Session = Depends(get_db)
) -> ResultsResponse:
    session = session_service.get_session_or_404(db, session_id)
    result = session_service.submit_session(db, session, body.answers)
    return ResultsResponse(**result)


@router.get("/sessions/{session_id}/results", response_model=ResultsResponse)
def get_results(session_id: str, db: Session = Depends(get_db)) -> ResultsResponse:
    session = session_service.get_session_or_404(db, session_id)
    return ResultsResponse(**session_service.build_results(db, session))
