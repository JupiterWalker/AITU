from __future__ import annotations
from sqlmodel import SQLModel, create_engine, Session
from pathlib import Path

DB_PATH = Path(__file__).parent / 'data' / 'graphs.db'
DB_URL = f'sqlite:///{DB_PATH}'
engine = create_engine(
    DB_URL,
    echo=False,
    connect_args={"check_same_thread": False},  # 允许多线程访问同一 SQLite 连接
    pool_size=10,        # 默认 5，适当提升
    max_overflow=20,     # 默认 10，提升缓冲
    pool_pre_ping=True,  # 连接存活检测，防止陈旧连接
)

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)

def get_session():
    """FastAPI 依赖：使用 yield 方式自动关闭 Session，避免连接泄漏导致 Pool 耗尽。

    使用方式:
        def endpoint(session: Session = Depends(get_session)):
            ...
    """
    with Session(engine) as session:
        yield session

# JSON pack/unpack moved to modules.graph.utils
