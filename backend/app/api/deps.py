from typing import Generator
from sqlmodel import Session

from backend.app.db.session import get_session as app_get_session


def get_db() -> Generator[Session, None, None]:
    yield from app_get_session()
