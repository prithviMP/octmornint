import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import InterviewSession, Question, SessionAnswer
from app.schemas import AnswerItem, QuestionPublic
from app.services import bank, grading, groq


def _public_questions(questions) -> list[QuestionPublic]:
    return [
        QuestionPublic(id=q.id, stem=q.stem, options=q.options)
        for q in questions
    ]


def _insert_generated_questions(
    db: Session,
    track: str,
    difficulty: str,
    payloads: list[dict],
) -> list[Question]:
    rows: list[Question] = []
    for item in payloads:
        row = Question(
            track=track,
            difficulty=difficulty,
            stem=item["stem"],
            options=item["options"],
            correct_option_id=item["correct_option_id"],
            explanation=item["explanation"],
            source="groq",
            is_active=True,
        )
        db.add(row)
        rows.append(row)
    db.flush()
    return rows


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _ready_label(percent: int) -> str:
    if percent >= 80:
        return "Ready"
    if percent >= 60:
        return "Almost there"
    if percent > 0:
        return "Keep practicing"
    return "Start practicing"


def session_summary(session: InterviewSession) -> dict:
    return {
        "id": session.id,
        "track": session.track,
        "difficulty": session.difficulty,
        "question_count": session.question_count,
        "score_correct": session.score_correct,
        "score_total": session.score_total,
        "percent": session.percent,
        "status": session.status,
        "submitted_at": _iso(session.submitted_at),
        "created_at": _iso(session.created_at) or "",
    }


def create_session(
    db: Session,
    track: str,
    difficulty: str,
    question_count: int,
    client_token: str | None = None,
    mode: str = "bank",
) -> tuple[InterviewSession, bool]:
    token = (client_token or "").strip() or str(uuid.uuid4())
    source = "bank"
    generation_fallback = False
    questions: list[Question]

    if mode == "groq":
        try:
            if not groq.is_configured():
                raise RuntimeError("GROQ_API_KEY is not configured")
            payloads = groq.generate_mcqs(track, difficulty, question_count)
            questions = _insert_generated_questions(db, track, difficulty, payloads)
            source = "groq"
        except Exception:
            generation_fallback = True
            questions = bank.sample_questions(db, track, difficulty, question_count)
            source = "bank"
    else:
        questions = bank.sample_questions(db, track, difficulty, question_count)

    session = InterviewSession(
        client_token=token,
        track=track,
        difficulty=difficulty,
        question_count=question_count,
        status="in_progress",
        source=source,
        question_ids=[q.id for q in questions],
    )
    db.add(session)
    db.flush()
    for q in questions:
        db.add(SessionAnswer(session_id=session.id, question_id=q.id))
    db.commit()
    db.refresh(session)
    return session, generation_fallback


def get_session_or_404(db: Session, session_id: str) -> InterviewSession:
    session = db.get(InterviewSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def session_with_questions(
    db: Session,
    session: InterviewSession,
    *,
    generation_fallback: bool = False,
) -> dict:
    questions = bank.get_questions_by_ids(db, session.question_ids)
    return {
        "id": session.id,
        "client_token": session.client_token,
        "track": session.track,
        "difficulty": session.difficulty,
        "status": session.status,
        "question_count": session.question_count,
        "source": getattr(session, "source", None) or "bank",
        "generation_fallback": generation_fallback,
        "questions": _public_questions(questions),
    }


def list_summaries(
    db: Session,
    client_token: str,
    *,
    status: str | None = "submitted",
    limit: int = 20,
    offset: int = 0,
    since: datetime | None = None,
) -> tuple[list[dict], int]:
    filters = [InterviewSession.client_token == client_token]
    if status:
        filters.append(InterviewSession.status == status)
    if since is not None:
        filters.append(InterviewSession.submitted_at >= since)

    total = db.scalar(
        select(func.count()).select_from(InterviewSession).where(*filters)
    ) or 0

    rows = db.scalars(
        select(InterviewSession)
        .where(*filters)
        .order_by(
            InterviewSession.submitted_at.desc(),
            InterviewSession.created_at.desc(),
        )
        .limit(limit)
        .offset(offset)
    ).all()
    return [session_summary(s) for s in rows], int(total)


def dashboard_for_client(db: Session, client_token: str) -> dict:
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

    recent, _ = list_summaries(db, client_token, status="submitted", limit=8, offset=0)

    week_count = (
        db.scalar(
            select(func.count())
            .select_from(InterviewSession)
            .where(
                InterviewSession.client_token == client_token,
                InterviewSession.status == "submitted",
                InterviewSession.submitted_at >= week_start,
            )
        )
        or 0
    )

    totals = db.execute(
        select(
            func.coalesce(func.sum(InterviewSession.score_correct), 0),
            func.coalesce(func.sum(InterviewSession.score_total), 0),
        ).where(
            InterviewSession.client_token == client_token,
            InterviewSession.status == "submitted",
        )
    ).one()
    total_correct = int(totals[0] or 0)
    total_questions = int(totals[1] or 0)
    overall_percent = round(100 * total_correct / total_questions) if total_questions else 0

    return {
        "recent": recent,
        "sessions_this_week": int(week_count),
        "overall_percent": overall_percent,
        "total_correct": total_correct,
        "total_questions": total_questions,
        "ready_label": _ready_label(overall_percent),
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

    _maybe_attach_coach(db, session, questions, answers_by_qid, percent)

    return build_results(db, session)


def _maybe_attach_coach(
    db: Session,
    session: InterviewSession,
    questions: list[Question],
    answers_by_qid: dict[str, str | None],
    percent: int,
) -> None:
    if session.coach_summary or not groq.is_configured():
        return
    wrong_stems = [
        q.stem
        for q in questions
        if answers_by_qid.get(q.id) != q.correct_option_id
    ]
    try:
        summary = groq.coach_summary(
            session.track,
            session.difficulty,
            percent,
            wrong_stems,
        )
    except Exception:
        return
    if not summary:
        return
    session.coach_summary = summary
    db.commit()
    db.refresh(session)


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
        "source": getattr(session, "source", None) or "bank",
        "coach_summary": session.coach_summary,
        "items": items,
    }
