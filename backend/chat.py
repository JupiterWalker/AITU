from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .llm.model import SiliconFlowChatModel

chat_router = APIRouter()

# 请求体模型
class AskRequest(BaseModel):
    question: str
    model: str

class QNA(BaseModel):
    question: str
    answer: str

# 响应体模型
class AskResponse(BaseModel):
    theme_id: str
    root_node_id: str
    context: list[QNA]
    answer: str

# 内存模拟存储（后续替换为 SQLite）
themes = {}
nodes = {}

@chat_router.post("/ask", response_model=AskResponse)
def ask_question(req: AskRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="问题不能为空")

    theme_id = str(uuid4())
    root_node_id = str(uuid4())
    now = datetime.utcnow().isoformat()

    themes[theme_id] = {
        "id": theme_id,
        "title": req.question,
        "created_at": now,
    }


    print(f"主题ID: {theme_id}, 根节点ID: {root_node_id}, 问题: {req.question}")
    model = SiliconFlowChatModel(model=req.model)
    response = model.invoke([{"role": "user", "content": req.question}])
    answer = response.content
    old_context = nodes.get(root_node_id, {}).get("context", [])
    context = [*old_context, {"question": req.question, "answer": answer}]
    nodes[root_node_id] = {
        "id": root_node_id,
        "theme_id": theme_id,
        "parent_id": None,
        "context": context,
        "created_at": now,
    }



    return AskResponse(
        theme_id=theme_id,
        root_node_id=root_node_id,
        context=context,
        answer=answer
    )

