from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from langchain.agents import create_agent
from langgraph.checkpoint.memory import InMemorySaver

try:
    from .llm.model import SiliconFlowChatModel
except ImportError: # fallback 当没有包上下文时
    from llm.model import SiliconFlowChatModel

checkpointer = InMemorySaver()

chat_router = APIRouter()

# 请求体模型
class AskRequest(BaseModel):
    question: str
    model: str
    thread_id: str
    context_thread_id: str | None = None
    context_msg_index: int | None = 0

class QNA(BaseModel):
    question: str
    answer: str

# 响应体模型
class AskResponse(BaseModel):
    # theme_id: str
    # root_node_id: str
    # context: list[QNA]
    answer: str

# 内存模拟存储（后续替换为 SQLite）
themes = {}
nodes = {}

@chat_router.post("/ask", response_model=AskResponse)
def ask_question(req: AskRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="问题不能为空")
    
    if not req.thread_id:
        raise HTTPException(status_code=400, detail="缺少 thread_id")

    context_msgs = []
    if req.context_thread_id:
        context_config = {"configurable": {"thread_id": req.context_thread_id}}
        saved = checkpointer.get(context_config)
        msgs = saved.get("channel_values").get("messages")
        context_msgs = msgs[req.context_msg_index*2: req.context_msg_index*2+2]


    model = SiliconFlowChatModel(model=req.model)
    
    
    
    agent = create_agent(
        model=model,
        tools=[],
        system_prompt="You are a helpful assistant",
        checkpointer=checkpointer
    )
    config = {"configurable": {"thread_id": req.thread_id}}
    agent_response = agent.invoke({"messages": [*context_msgs, {"role": "user", "content": req.question}]}, config=config)
    answer = agent_response["messages"][-1].content

    return AskResponse(answer=answer)

