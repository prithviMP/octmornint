"""Groq chat-completions client for MCQ generation and coach summaries."""

from __future__ import annotations

import json
import re
from typing import Any

import httpx
from pydantic import BaseModel, Field, ValidationError, field_validator, model_validator

from app.core.config import get_settings

GROQ_BASE_URL = "https://api.groq.com/openai/v1"

TRACK_LABELS = {
    "dsa": "Data Structures & Algorithms",
    "lld": "Low-Level Design",
    "hld": "High-Level Design / System Design",
    "fullstack": "Full Stack Web Development",
}

_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE | re.MULTILINE)


class GeneratedOption(BaseModel):
    id: str
    text: str

    @field_validator("id")
    @classmethod
    def normalize_id(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in {"a", "b", "c", "d"}:
            raise ValueError("option id must be a, b, c, or d")
        return cleaned

    @field_validator("text")
    @classmethod
    def non_empty_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("option text required")
        return cleaned


class GeneratedMcq(BaseModel):
    stem: str
    options: list[GeneratedOption] = Field(min_length=4, max_length=4)
    correct_option_id: str
    explanation: str

    @field_validator("stem", "explanation")
    @classmethod
    def non_empty_str(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("required")
        return cleaned

    @field_validator("correct_option_id")
    @classmethod
    def normalize_correct(cls, value: str) -> str:
        return value.strip().lower()

    @model_validator(mode="after")
    def check_correct_option(self) -> GeneratedMcq:
        ids = [o.id for o in self.options]
        if len(set(ids)) != 4:
            raise ValueError("option ids must be unique a–d")
        if set(ids) != {"a", "b", "c", "d"}:
            raise ValueError("options must use ids a, b, c, d")
        if self.correct_option_id not in ids:
            raise ValueError("correct_option_id must match an option")
        return self


def is_configured() -> bool:
    return bool(get_settings().groq_api_key)


def _strip_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = _FENCE_RE.sub("", cleaned).strip()
    return cleaned


def _extract_json(text: str) -> Any:
    cleaned = _strip_fences(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("[")
        end = cleaned.rfind("]")
        if start != -1 and end != -1 and end > start:
            return json.loads(cleaned[start : end + 1])
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


def _chat(messages: list[dict[str, str]], *, timeout: float, temperature: float = 0.4) -> str:
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")

    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.groq_model,
        "messages": messages,
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }
    with httpx.Client(timeout=timeout) as client:
        response = client.post(
            f"{GROQ_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError("Unexpected Groq response shape") from exc
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("Empty Groq response")
    return content


def _validate_mcqs(raw: Any) -> list[dict]:
    if isinstance(raw, dict):
        raw = raw.get("questions") or raw.get("items") or raw.get("mcqs") or []
    if not isinstance(raw, list):
        raise ValueError("Expected a JSON list of questions")

    validated: list[dict] = []
    for item in raw:
        try:
            mcq = GeneratedMcq.model_validate(item)
        except (ValidationError, ValueError):
            continue
        validated.append(
            {
                "stem": mcq.stem,
                "options": [{"id": o.id, "text": o.text} for o in mcq.options],
                "correct_option_id": mcq.correct_option_id,
                "explanation": mcq.explanation,
            }
        )
    return validated


def generate_mcqs(track: str, difficulty: str, n: int) -> list[dict]:
    """Call Groq chat completions and return validated MCQ dicts."""
    if not is_configured():
        raise RuntimeError("GROQ_API_KEY is not configured")
    if n < 1:
        raise ValueError("n must be >= 1")

    track_label = TRACK_LABELS.get(track, track)
    prompt = (
        f"Generate exactly {n} multiple-choice interview questions for {track_label} "
        f"at {difficulty} difficulty.\n"
        "Return JSON only as: {\"questions\":[...]} where each question has:\n"
        '- "stem": string\n'
        '- "options": exactly 4 objects with "id" in ["a","b","c","d"] and "text"\n'
        '- "correct_option_id": one of a|b|c|d\n'
        '- "explanation": 1-3 sentences teaching why the answer is correct\n'
        "Rules: single correct answer; plausible distractors; no trick wording; "
        "explanations for learners."
    )
    content = _chat(
        [
            {
                "role": "system",
                "content": (
                    "You are an expert technical interview question author. "
                    "Always respond with valid JSON only."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        timeout=45.0,
        temperature=0.5,
    )
    validated = _validate_mcqs(_extract_json(content))
    if len(validated) < n:
        raise RuntimeError(
            f"Groq returned {len(validated)} valid questions; needed {n}"
        )
    return validated[:n]


def coach_summary(
    track: str,
    difficulty: str,
    percent: int,
    wrong_stems: list[str],
) -> str:
    """Optional post-submit coaching blurb with improvement suggestions."""
    if not is_configured():
        raise RuntimeError("GROQ_API_KEY is not configured")

    track_label = TRACK_LABELS.get(track, track)
    misses = wrong_stems[:8] or ["(none — perfect score)"]
    miss_block = "\n".join(f"- {stem}" for stem in misses)
    prompt = (
        f"The learner scored {percent}% on a {difficulty} {track_label} MCQ practice set.\n"
        f"Missed question stems:\n{miss_block}\n\n"
        "Write 2–4 short sentences: acknowledge the score, name weak areas implied by "
        "the misses, and give concrete study suggestions. No markdown, no bullet list, "
        "no greeting. Return JSON: {\"summary\": \"...\"}."
    )
    content = _chat(
        [
            {
                "role": "system",
                "content": (
                    "You are a concise technical interview coach. "
                    "Always respond with valid JSON only."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        timeout=15.0,
        temperature=0.3,
    )
    parsed = _extract_json(content)
    if isinstance(parsed, dict):
        summary = parsed.get("summary") or parsed.get("coach_summary") or parsed.get("text")
        if isinstance(summary, str) and summary.strip():
            return summary.strip()
    if isinstance(parsed, str) and parsed.strip():
        return parsed.strip()
    raise RuntimeError("Groq coach summary missing summary field")
