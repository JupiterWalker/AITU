from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from langchain.agents import create_agent
from langgraph.checkpoint.memory import InMemorySaver

try:
    from ...llm.model import SiliconFlowChatModel
except ImportError:
    from llm.model import SiliconFlowChatModel  # type: ignore

checkpointer = InMemorySaver()
router = APIRouter(prefix="", tags=["interaction"])

class AskRequest(BaseModel):
    question: str
    model: str
    thread_id: str
    context_thread_id: str | None = None
    context_msg_index: int | None = 0

class AskResponse(BaseModel):
    answer: str

@router.post("/ask", response_model=AskResponse)
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
