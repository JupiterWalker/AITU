from fastapi.testclient import TestClient
from sqlmodel import Session

from ..main import app  # noqa: E402
from ..modules.user.models import User  # noqa: E402
from ..db import get_session  # noqa: E402


def test_login_success(client: TestClient):
    # Arrange: create a user
    # Use overridden session from conftest via dependency
    # Acquire a session via the overridden dependency for setup
    override = app.dependency_overrides[get_session]
    with next(override()) as session:
        known_hash = "$2b$12$VNihoqOCXPaTW6LsPyCcpukeXISCVHxrMazjuTOFsmBMyXA3He1PC" # 'secret' 的哈希
        u = User(user_name="alice", password=known_hash)
        session.add(u)
        session.commit()
        session.refresh(u)

    resp = client.post("/users/login/", json={"user_name": "alice", "password": "secret"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "authorization" in resp.headers


def test_login_fail_wrong_password(client: TestClient):
    resp = client.post("/users/login/", json={"user_name": "alice", "password": "wrong"})
    assert resp.status_code == 401
    data = resp.json()
    assert data.get("detail") in ("Incorrect username or password", "用户名或密码错误")

def test_register_success(client: TestClient):
    # Arrange: create a user
    override = app.dependency_overrides[get_session]
    with next(override()) as session:
        known_hash = "$2b$12$VNihoqOCXPaTW6LsPyCcpukeXISCVHxrMazjuTOFsmBMyXA3He1PC" # 'secret' 的哈希
        u = User(user_name="alice", password=known_hash)
        session.add(u)
        session.commit()
        session.refresh(u)

    resp = client.put(f"/users/{u.id}/register/", json={"user_name": "alice", "password": "secret"})
    assert resp.status_code == 200, resp.text
    assert "authorization" in resp.headers