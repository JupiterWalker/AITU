import os
import tempfile
from pathlib import Path
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

# Import app and get_session after setting DATABASE_URL in each test to avoid global engine reuse
from ..main import app
from ..db import get_session


@pytest.fixture(autouse=True)
def isolated_sqlite_db(tmp_path: Path) -> Generator[None, None, None]:
    """Create an isolated SQLite database file per test and override get_session.

    - Sets DATABASE_URL to a temporary sqlite file
    - Initializes tables
    - Overrides FastAPI dependency to use the temp engine
    - Cleans up after the test
    """
    db_file = tmp_path / "test.db"
    sqlite_url = f"sqlite:///{db_file}"
    # Point the app to this temp DB
    os.environ["DATABASE_URL"] = sqlite_url

    # Create a dedicated engine for the test
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    # Ensure folder exists and create tables
    db_file.parent.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)

    def _override_session() -> Generator[Session, None, None]:
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_session] = _override_session

    try:
        yield
    finally:
        # Drop all tables and remove override; delete file
        try:
            SQLModel.metadata.drop_all(engine)
        finally:
            app.dependency_overrides.pop(get_session, None)
            if db_file.exists():
                try:
                    db_file.unlink()
                except Exception:
                    pass


@pytest.fixture
def client() -> TestClient:
    """Provide a TestClient bound to the isolated DB for convenience."""
    return TestClient(app)
