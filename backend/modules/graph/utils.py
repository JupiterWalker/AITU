from __future__ import annotations
import json
from typing import Tuple, List, Any

def pack_graph(nodes: List[Any], edges: List[Any]) -> str:
    return json.dumps({"nodes": nodes, "edges": edges}, ensure_ascii=False)

def unpack_graph(data: str) -> Tuple[List[Any], List[Any]]:
    try:
        payload = json.loads(data) if data else {}
        return payload.get('nodes', []), payload.get('edges', [])
    except json.JSONDecodeError:
        return [], []
