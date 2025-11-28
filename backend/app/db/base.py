from __future__ import annotations
from sqlmodel import SQLModel, create_engine
from pathlib import Path
import os

DB_PATH = Path(__file__).parent.parent.parent / 'app' / 'data' / 'graphs.db'
_default_sqlite_url = f'sqlite:///{DB_PATH}'

DATABASE_URL = os.getenv("DATABASE_URL", _default_sqlite_url)
_is_sqlite = DATABASE_URL.startswith("sqlite")

_env = os.getenv
ECHO = _env("DB_ECHO", "false").lower() == "true"
POOL_SIZE = int(_env("DB_POOL_SIZE", "10" if _is_sqlite else "5"))
MAX_OVERFLOW = int(_env("DB_MAX_OVERFLOW", "20" if _is_sqlite else "10"))
POOL_RECYCLE = int(_env("DB_POOL_RECYCLE", "1800"))
USE_NULL_POOL = _env("DB_USE_NULL_POOL", "false").lower() == "true"
STATEMENT_TIMEOUT_MS = int(_env("DB_STATEMENT_TIMEOUT", "30"))

_connect_args: dict = {'check_same_thread': False} if _is_sqlite else {}
if not _is_sqlite and STATEMENT_TIMEOUT_MS > 0:
    _connect_args['options'] = f'-c statement_timeout={STATEMENT_TIMEOUT_MS}'

if USE_NULL_POOL:
    from sqlalchemy.pool import NullPool
    _poolclass = NullPool
else:
    _poolclass = None

engine = create_engine(
    DATABASE_URL,
    echo=ECHO,
    connect_args=_connect_args,
    pool_size=POOL_SIZE if _poolclass is None else None,
    max_overflow=MAX_OVERFLOW if _poolclass is None else None,
    pool_pre_ping=True,
    pool_recycle=POOL_RECYCLE if _poolclass is None else None,
    poolclass=_poolclass,
)

def init_db():
    if _is_sqlite:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)
