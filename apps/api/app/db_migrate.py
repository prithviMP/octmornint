"""Lightweight SQLite column adds for create_all deployments without Alembic."""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_schema(engine: Engine) -> None:
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "interview_sessions" not in tables:
        return

    columns = {col["name"] for col in inspector.get_columns("interview_sessions")}
    with engine.begin() as conn:
        if "client_token" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE interview_sessions "
                    "ADD COLUMN client_token VARCHAR(36) NOT NULL DEFAULT ''"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_interview_sessions_client_token "
                    "ON interview_sessions (client_token)"
                )
            )
        if "source" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE interview_sessions "
                    "ADD COLUMN source VARCHAR(16) NOT NULL DEFAULT 'bank'"
                )
            )
        if "coach_summary" not in columns:
            conn.execute(
                text("ALTER TABLE interview_sessions ADD COLUMN coach_summary TEXT")
            )
