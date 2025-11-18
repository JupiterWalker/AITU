from __future__ import annotations
from sqlmodel import SQLModel, create_engine, Session
from pathlib import Path

DB_PATH = Path(__file__).parent / 'data' / 'graphs.db'
DB_URL = f'sqlite:///{DB_PATH}'
engine = create_engine(DB_URL, echo=False)

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)

def get_session():
    return Session(engine)

# JSON pack/unpack moved to modules.graph.utils
