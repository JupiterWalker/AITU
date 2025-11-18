from __future__ import annotations
from sqlmodel import SQLModel, create_engine, Session
from pathlib import Path
import json
from .models.graph import Graph

DB_PATH = Path(__file__).parent / 'data' / 'graphs.db'
DB_URL = f'sqlite:///{DB_PATH}'
engine = create_engine(DB_URL, echo=False)

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)

def get_session():
    return Session(engine)

# helper to encode nodes/edges
def pack_graph(nodes: list, edges: list) -> str:
    return json.dumps({"nodes": nodes, "edges": edges}, ensure_ascii=False)

def unpack_graph(data: str) -> tuple[list, list]:
    try:
        payload = json.loads(data) if data else {}
        return payload.get('nodes', []), payload.get('edges', [])
    except json.JSONDecodeError:
        return [], []
