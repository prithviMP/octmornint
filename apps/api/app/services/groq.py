"""Thin Groq client stub. Not used on the /submit grading path for MVP."""

from app.core.config import get_settings

GROQ_BASE_URL = "https://api.groq.com/openai/v1"


def is_configured() -> bool:
    return bool(get_settings().groq_api_key)


def generate_mcqs(track: str, difficulty: str, n: int) -> list[dict]:
    """Phase 2: call Groq chat completions and return validated MCQ dicts."""
    if not is_configured():
        raise RuntimeError("GROQ_API_KEY is not configured")
    raise NotImplementedError(
        f"Groq MCQ generation not implemented yet ({track}/{difficulty}/{n})."
    )


def coach_summary(track: str, percent: int, wrong_stems: list[str]) -> str:
    """Phase 1.5: optional post-submit coaching blurb."""
    if not is_configured():
        raise RuntimeError("GROQ_API_KEY is not configured")
    raise NotImplementedError("Groq coach summary not implemented yet")
