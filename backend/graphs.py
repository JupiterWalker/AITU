"""探索图 (Exploration Graph) 持久化与 API 路由 (SQLModel 版本)

接口:
1. GET /graphs -> 列出所有图基础信息
2. GET /graphs/{graph_id} -> 单图详情
3. POST /graphs -> 创建图
4. PUT /graphs/{graph_id} -> 更新图
5. DELETE /graphs/{graph_id} -> 删除图

存储: SQLite (backend/data/graphs.db) 通过 SQLModel ORM 封装。
旧的原生 sqlite3 已移除。
"""

from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Any, List
import json, datetime
from sqlmodel import select
from .db import init_db, get_session, pack_graph, unpack_graph
from .models.graph import Graph
from sqlmodel import Session

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
def list_graphs(session: Session = Depends(get_session)):
    items = list(session.exec(select(Graph)))
    items.sort(key=lambda g: (g.id or 0), reverse=True)
    return [GraphBasic(id=(g.id or 0), title=g.title) for g in items]

@graphs_router.get("/{graph_id}", response_model=GraphDetail)
def get_graph(graph_id: int, session: Session = Depends(get_session)):
    g = session.get(Graph, graph_id)
    if not g:
        raise HTTPException(status_code=404, detail="Graph not found")
    nodes, edges = unpack_graph(g.data)
    return GraphDetail(id=(g.id or 0), title=g.title, nodes=nodes, edges=edges, exportedAt=g.exported_at)

@graphs_router.post("/", response_model=GraphDetail, status_code=201)
def create_graph(body: GraphCreate, session: Session = Depends(get_session)):
    exported_at = datetime.datetime.utcnow().isoformat()
    g = Graph(title=body.title, data=pack_graph(body.nodes, body.edges), exported_at=exported_at)
    session.add(g)
    session.commit()
    session.refresh(g)
    return GraphDetail(id=(g.id or 0), title=g.title, nodes=body.nodes, edges=body.edges, exportedAt=exported_at)

@graphs_router.put("/{graph_id}", response_model=GraphDetail)
def update_graph(graph_id: int, body: GraphUpdate, session: Session = Depends(get_session)):
    g = session.get(Graph, graph_id)
    if not g:
        raise HTTPException(status_code=404, detail="Graph not found")
    exported_at = datetime.datetime.utcnow().isoformat()
    g.title = body.title
    g.data = pack_graph(body.nodes, body.edges)
    g.exported_at = exported_at
    session.add(g)
    session.commit()
    session.refresh(g)
    return GraphDetail(id=(g.id or 0), title=g.title, nodes=body.nodes, edges=body.edges, exportedAt=exported_at)

@graphs_router.delete("/{graph_id}")
def delete_graph(graph_id: int, session: Session = Depends(get_session)):
    g = session.get(Graph, graph_id)
    if not g:
        raise HTTPException(status_code=404, detail="Graph not found")
    session.delete(g)
    session.commit()
    return {"id": graph_id, "deleted": True}
