from typing import Literal

from pydantic import BaseModel, Field

Track = Literal["dsa", "lld", "hld", "fullstack"]
Difficulty = Literal["easy", "medium", "hard"]


class OptionPublic(BaseModel):
    id: str
    text: str


class QuestionPublic(BaseModel):
    id: str
    stem: str
    options: list[OptionPublic]


class CatalogTrack(BaseModel):
    id: str
    label: str
    difficulties: dict[str, int]


class CatalogResponse(BaseModel):
    tracks: list[CatalogTrack]


class CreateSessionRequest(BaseModel):
    track: Track
    difficulty: Difficulty
    question_count: int = Field(ge=1, le=20)


class SessionResponse(BaseModel):
    id: str
    client_token: str
    track: str
    difficulty: str
    status: str
    question_count: int
    questions: list[QuestionPublic]


class SessionSummary(BaseModel):
    id: str
    track: str
    difficulty: str
    question_count: int
    score_correct: int | None
    score_total: int | None
    percent: int | None
    status: str
    submitted_at: str | None
    created_at: str


class DashboardResponse(BaseModel):
    recent: list[SessionSummary]
    sessions_this_week: int
    overall_percent: int
    total_correct: int
    total_questions: int
    ready_label: str


class HistoryResponse(BaseModel):
    items: list[SessionSummary]
    total: int
    limit: int
    offset: int


class AnswerItem(BaseModel):
    question_id: str
    selected_option_id: str


class SaveAnswersRequest(BaseModel):
    answers: list[AnswerItem]


class SubmitRequest(BaseModel):
    answers: list[AnswerItem]


class ResultItem(BaseModel):
    question_id: str
    stem: str
    options: list[OptionPublic]
    selected_option_id: str | None
    correct_option_id: str
    is_correct: bool
    explanation: str


class ResultsResponse(BaseModel):
    session_id: str
    track: str
    difficulty: str
    status: str
    total: int
    correct: int
    percent: int
    items: list[ResultItem]


class HealthResponse(BaseModel):
    status: str
    app: str
