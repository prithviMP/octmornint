import json
import random
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Question

TRACK_LABELS = {
    "dsa": "DSA",
    "lld": "LLD",
    "hld": "HLD",
    "fullstack": "Full Stack",
}

SEED_PATH = Path(__file__).resolve().parent.parent / "data" / "questions_seed.json"


def seed_questions_if_empty(db: Session) -> int:
    count = db.scalar(select(func.count()).select_from(Question)) or 0
    if count > 0:
        return 0
    if not SEED_PATH.exists():
        raise RuntimeError(f"Seed file missing: {SEED_PATH}")

    payload = json.loads(SEED_PATH.read_text())
    for item in payload:
        db.add(
            Question(
                track=item["track"],
                difficulty=item["difficulty"],
                stem=item["stem"],
                options=item["options"],
                correct_option_id=item["correct_option_id"],
                explanation=item["explanation"],
                source=item.get("source", "bank"),
                is_active=True,
            )
        )
    db.commit()
    return len(payload)


def catalog(db: Session) -> list[dict]:
    rows = db.execute(
        select(Question.track, Question.difficulty, func.count())
        .where(Question.is_active.is_(True))
        .group_by(Question.track, Question.difficulty)
    ).all()

    by_track: dict[str, dict[str, int]] = {t: {"easy": 0, "medium": 0, "hard": 0} for t in TRACK_LABELS}
    for track, difficulty, n in rows:
        if track in by_track and difficulty in by_track[track]:
            by_track[track][difficulty] = n

    return [
        {"id": track, "label": label, "difficulties": by_track[track]}
        for track, label in TRACK_LABELS.items()
    ]


def sample_questions(db: Session, track: str, difficulty: str, n: int) -> list[Question]:
    available = list(
        db.scalars(
            select(Question).where(
                Question.is_active.is_(True),
                Question.track == track,
                Question.difficulty == difficulty,
            )
        ).all()
    )
    if len(available) < n:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Only {len(available)} {difficulty} {track} questions available; "
                f"requested {n}."
            ),
        )
    return random.sample(available, n)


def get_questions_by_ids(db: Session, ids: list[str]) -> list[Question]:
    if not ids:
        return []
    rows = list(db.scalars(select(Question).where(Question.id.in_(ids))).all())
    by_id = {q.id: q for q in rows}
    missing = [qid for qid in ids if qid not in by_id]
    if missing:
        raise HTTPException(status_code=500, detail="Session references missing questions")
    return [by_id[qid] for qid in ids]
