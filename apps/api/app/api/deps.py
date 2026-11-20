import re

from fastapi import Header, HTTPException

_TOKEN_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)


def require_client_token(
    x_client_token: str | None = Header(default=None, alias="X-Client-Token"),
) -> str:
    token = (x_client_token or "").strip()
    if not token or not _TOKEN_RE.match(token):
        raise HTTPException(status_code=400, detail="Valid X-Client-Token header required")
    return token


def optional_client_token(
    x_client_token: str | None = Header(default=None, alias="X-Client-Token"),
) -> str | None:
    token = (x_client_token or "").strip()
    if not token:
        return None
    if not _TOKEN_RE.match(token):
        raise HTTPException(status_code=400, detail="Invalid X-Client-Token header")
    return token
