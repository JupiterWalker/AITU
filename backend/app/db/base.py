from __future__ import annotations
from sqlmodel import SQLModel, create_engine, Session
from pathlib import Path
import os

DB_PATH = Path(__file__).parent / 'data' / 'graphs.db'
_default_sqlite_url = f'sqlite:///{DB_PATH}'
# _default_postgresql_url = "postgresql+psycopg://aitu:aitu123@localhost:5432/aitu_dev"

# 优先使用环境变量 DATABASE_URL；若不存在则回退本地 sqlite
DATABASE_URL = os.getenv("DATABASE_URL", _default_sqlite_url)

_is_sqlite = DATABASE_URL.startswith("sqlite")

# 环境化配置，便于线上 PostgreSQL 调优
_env = os.getenv
ECHO = _env("DB_ECHO", "false").lower() == "true"
POOL_SIZE = int(_env("DB_POOL_SIZE", "10" if _is_sqlite else "5"))
MAX_OVERFLOW = int(_env("DB_MAX_OVERFLOW", "20" if _is_sqlite else "10"))
POOL_RECYCLE = int(_env("DB_POOL_RECYCLE", "1800"))  # 30min recycle 防止僵尸连接
USE_NULL_POOL = _env("DB_USE_NULL_POOL", "false").lower() == "true"  # 短生命周期任务可用
STATEMENT_TIMEOUT_MS = int(_env("DB_STATEMENT_TIMEOUT", "30"))  # PostgreSQL 可设置; 0 表示不强制

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
