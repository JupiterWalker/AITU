from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Any, List

class GraphCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    nodes: List[Any] = Field(default_factory=list)
    edges: List[Any] = Field(default_factory=list)

class GraphUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
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
