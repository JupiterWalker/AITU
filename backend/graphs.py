"""探索图 (Exploration Graph) SQLite 持久化与 API 路由

提供三个接口:
1. GET /graphs -> 列出所有图的基础信息 (id, title)
2. GET /graphs/{graph_id} -> 单个图详细信息 (id, title, nodes, edges, exportedAt)
3. POST /graphs -> 创建新图 (传入 title, nodes, edges)

存储: SQLite (backend/data/graphs.db)
表结构: graphs(id INTEGER PK, title TEXT, data TEXT(JSON), exported_at TEXT)
"""

from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Any, List
import sqlite3, json, datetime, os
from pathlib import Path

DB_DIR = Path(__file__).parent / 'data'
DB_PATH = DB_DIR / 'graphs.db'
TABLE_SQL = """
CREATE TABLE IF NOT EXISTS graphs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    data TEXT NOT NULL,
    exported_at TEXT NOT NULL
);
"""

def init_db():
    DB_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(TABLE_SQL)
        conn.commit()

def get_conn():
    # 每次请求返回新的连接，避免并发锁问题；使用 row_factory 方便读取
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

class GraphCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="图标题")
    nodes: List[Any] = Field(default_factory=list)
    edges: List[Any] = Field(default_factory=list)

class GraphBasic(BaseModel):
    id: int
    title: str

class GraphDetail(BaseModel):
    id: int
    title: str
    nodes: List[Any]
    edges: List[Any]
    exportedAt: str

class GraphUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    nodes: List[Any] = Field(default_factory=list)
    edges: List[Any] = Field(default_factory=list)

graphs_router = APIRouter(prefix="/graphs", tags=["graphs"])

@graphs_router.on_event("startup")
def _startup():
    init_db()

@graphs_router.get("/", response_model=List[GraphBasic])
def list_graphs():
    init_db()  # 保险：确保表存在
    with get_conn() as conn:
        rows = conn.execute("SELECT id, title FROM graphs ORDER BY id DESC").fetchall()
        return [GraphBasic(id=row["id"], title=row["title"]) for row in rows]

@graphs_router.get("/{graph_id}", response_model=GraphDetail)
def get_graph(graph_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT id, title, data, exported_at FROM graphs WHERE id=?", (graph_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Graph not found")
        try:
            payload = json.loads(row["data"]) if row["data"] else {}
        except json.JSONDecodeError:
            payload = {"nodes": [], "edges": []}
        return GraphDetail(
            id=row["id"],
            title=row["title"],
            nodes=payload.get("nodes", []),
            edges=payload.get("edges", []),
            exportedAt=row["exported_at"],
        )

@graphs_router.post("/", response_model=GraphDetail, status_code=201)
def create_graph(body: GraphCreate):
    exported_at = datetime.datetime.utcnow().isoformat()
    data_json = json.dumps({"nodes": body.nodes, "edges": body.edges}, ensure_ascii=False)
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO graphs(title, data, exported_at) VALUES(?,?,?)",
            (body.title, data_json, exported_at)
        )
        conn.commit()
    new_id = cur.lastrowid
    if new_id is None:
        raise HTTPException(status_code=500, detail="Failed to create graph")
    return GraphDetail(id=int(new_id), title=body.title, nodes=body.nodes, edges=body.edges, exportedAt=exported_at)

@graphs_router.put("/{graph_id}", response_model=GraphDetail)
def update_graph(graph_id: int, body: GraphUpdate):
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM graphs WHERE id=?", (graph_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Graph not found")
        exported_at = datetime.datetime.utcnow().isoformat()
        data_json = json.dumps({"nodes": body.nodes, "edges": body.edges}, ensure_ascii=False)
        conn.execute("UPDATE graphs SET title=?, data=?, exported_at=? WHERE id=?", (body.title, data_json, exported_at, graph_id))
        conn.commit()
    return GraphDetail(id=graph_id, title=body.title, nodes=body.nodes, edges=body.edges, exportedAt=exported_at)

@graphs_router.delete("/{graph_id}")
def delete_graph(graph_id: int):
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM graphs WHERE id=?", (graph_id,))
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Graph not found")
    return {"id": graph_id, "deleted": True}
