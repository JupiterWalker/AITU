from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
import datetime
from .models import Graph
from .schemas import GraphCreate, GraphUpdate, GraphBasic, GraphDetail
try:
    from ...db import init_db, get_session  # package context (backend.modules.graph)
except ImportError:  # script context when cwd == backend
    from db import init_db, get_session  # type: ignore
from .utils import pack_graph, unpack_graph

router = APIRouter(prefix="/graphs", tags=["graphs"])

@router.on_event("startup")
def _startup():
    init_db()

@router.get("/", response_model=list[GraphBasic])
def list_graphs(session: Session = Depends(get_session)):
    items = list(session.exec(select(Graph)))
    items.sort(key=lambda g: (g.id or 0), reverse=True)
    return [GraphBasic(id=(g.id or 0), title=g.title) for g in items]

@router.get("/{graph_id}", response_model=GraphDetail)
def get_graph(graph_id: int, session: Session = Depends(get_session)):
    g = session.get(Graph, graph_id)
    if not g:
        raise HTTPException(status_code=404, detail="Graph not found")
    nodes, edges = unpack_graph(g.data)
    return GraphDetail(id=(g.id or 0), title=g.title, nodes=nodes, edges=edges, exportedAt=g.exported_at)

@router.post("/", response_model=GraphDetail, status_code=201)
def create_graph(body: GraphCreate, session: Session = Depends(get_session)):
    exported_at = datetime.datetime.utcnow().isoformat()
    g = Graph(title=body.title, data=pack_graph(body.nodes, body.edges), exported_at=exported_at)
    session.add(g)
    session.commit()
    session.refresh(g)
    return GraphDetail(id=(g.id or 0), title=g.title, nodes=body.nodes, edges=body.edges, exportedAt=exported_at)

@router.put("/{graph_id}", response_model=GraphDetail)
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

@router.delete("/{graph_id}")
def delete_graph(graph_id: int, session: Session = Depends(get_session)):
    g = session.get(Graph, graph_id)
    if not g:
        raise HTTPException(status_code=404, detail="Graph not found")
    session.delete(g)
    session.commit()
    return {"id": graph_id, "deleted": True}
