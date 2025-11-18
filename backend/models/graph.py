from __future__ import annotations
from sqlmodel import SQLModel, Field
import datetime

class Graph(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(index=True, max_length=200)
    data: str = Field()
    exported_at: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat())
