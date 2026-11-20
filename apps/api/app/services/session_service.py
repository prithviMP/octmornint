from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import InterviewSession, SessionAnswer
from app.schemas import AnswerItem, QuestionPublic
from app.services import bank, grading


def _public_questions(questions) -> list[QuestionPublic]:
    return [
        QuestionPublic(id=q.id, stem=q.stem, options=q.options)
        for q in questions
    ]


def create_session(db: Session, track: str, difficulty: str, question_count: int) -> InterviewSession:
    questions = bank.sample_questions(db, track, difficulty, question_count)
    session = InterviewSession(
        track=track,
        difficulty=difficulty,
        question_count=question_count,
        status="in_progress",
        question_ids=[q.id for q in questions],
    )
    db.add(session)
    db.flush()
    for q in questions:
        db.add(SessionAnswer(session_id=session.id, question_id=q.id))
    db.commit()
    db.refresh(session)
    return session


def get_session_or_404(db: Session, session_id: str) -> InterviewSession:
    session = db.get(InterviewSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def session_with_questions(db: Session, session: InterviewSession) -> dict:
    questions = bank.get_questions_by_ids(db, session.question_ids)
    return {
        "id": session.id,
        "track": session.track,
        "difficulty": session.difficulty,
        "status": session.status,
        "question_count": session.question_count,
        "questions": _public_questions(questions),
    }


def save_answers(db: Session, session: InterviewSession, answers: list[AnswerItem]) -> None:
    if session.status != "in_progress":
        raise HTTPException(status_code=400, detail="Session already submitted")

    allowed = set(session.question_ids)
    answer_rows = {
        row.question_id: row
        for row in db.scalars(
            select(SessionAnswer).where(SessionAnswer.session_id == session.id)
        ).all()
    }

    for item in answers:
        if item.question_id not in allowed:
            raise HTTPException(status_code=400, detail=f"Unknown question_id {item.question_id}")
        question = bank.get_questions_by_ids(db, [item.question_id])[0]
        option_ids = {o["id"] for o in question.options}
        if item.selected_option_id not in option_ids:
            raise HTTPException(status_code=400, detail="Invalid selected_option_id")
        answer_rows[item.question_id].selected_option_id = item.selected_option_id

    db.commit()


def submit_session(db: Session, session: InterviewSession, answers: list[AnswerItem]) -> dict:
    if session.status == "submitted":
        return build_results(db, session)

    save_answers(db, session, answers)
    db.refresh(session)

    questions = bank.get_questions_by_ids(db, session.question_ids)
    answer_rows = {
        row.question_id: row
        for row in db.scalars(
            select(SessionAnswer).where(SessionAnswer.session_id == session.id)
        ).all()
    }
    answers_by_qid = {qid: answer_rows[qid].selected_option_id for qid in session.question_ids}
    correct, total, percent, items = grading.score_answers(questions, answers_by_qid)

    for q in questions:
        answer_rows[q.id].is_correct = answers_by_qid[q.id] == q.correct_option_id

    session.status = "submitted"
    session.score_correct = correct
    session.score_total = total
    session.percent = percent
    session.submitted_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "session_id": session.id,
        "track": session.track,
        "difficulty": session.difficulty,
        "status": session.status,
        "total": total,
        "correct": correct,
        "percent": percent,
        "items": items,
    }


def build_results(db: Session, session: InterviewSession) -> dict:
    if session.status != "submitted":
        raise HTTPException(status_code=404, detail="Results not ready")

    questions = bank.get_questions_by_ids(db, session.question_ids)
    answer_rows = {
        row.question_id: row
        for row in db.scalars(
            select(SessionAnswer).where(SessionAnswer.session_id == session.id)
        ).all()
    }
    answers_by_qid = {qid: answer_rows[qid].selected_option_id for qid in session.question_ids}
    correct, total, percent, items = grading.score_answers(questions, answers_by_qid)

    return {
        "session_id": session.id,
        "track": session.track,
        "difficulty": session.difficulty,
        "status": session.status,
        "total": session.score_total if session.score_total is not None else total,
        "correct": session.score_correct if session.score_correct is not None else correct,
        "percent": session.percent if session.percent is not None else percent,
        "items": items,
    }
