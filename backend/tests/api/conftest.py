import os
from pathlib import Path
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine


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
    # Point the app to this temp DB (set before importing app/deps)
    os.environ["DATABASE_URL"] = sqlite_url

    # Create a dedicated engine for the test
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    # Ensure folder exists and create tables
    db_file.parent.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)

    # Import app and dependency after DATABASE_URL is set, and override the router dependency
    from backend.app.main import app
    from backend.app.api.deps import get_db

    def _override_get_db() -> Generator[Session, None, None]:
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_db] = _override_get_db

    try:
        yield
    finally:
        # Drop all tables and remove override; delete file
        try:
            SQLModel.metadata.drop_all(engine)
        finally:
            # Ensure engine connections are closed before deleting file
            try:
                engine.dispose()
            except Exception:
                pass
            try:
                app.dependency_overrides.pop(get_db, None)
            except Exception:
                pass
            if db_file.exists():
                try:
                    db_file.unlink()
                except Exception:
                    pass


@pytest.fixture
def client() -> TestClient:
    """Provide a TestClient bound to the isolated DB for convenience."""
    from backend.app.main import app
    return TestClient(app)
