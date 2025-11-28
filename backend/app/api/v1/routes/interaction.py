from __future__ import annotations
from fastapi import APIRouter, HTTPException
from fastapi.params import Depends
from pydantic import BaseModel
from langchain.agents import create_agent
from langgraph.checkpoint.memory import InMemorySaver

from backend.app.core.security import get_current_user
from backend.app.models.user import User



try:
    from backend.app.llm.model import SiliconFlowChatModel
except ImportError as e:
    msg = repr(e)
    if ("attempted relative import" in msg) or ("parent package" in msg):
        from llm.model import SiliconFlowChatModel  # type: ignore
    else:
        raise

checkpointer = InMemorySaver()
router = APIRouter(prefix="interaction", tags=["interaction"])

class AskRequest(BaseModel):
    question: str
    model: str
    thread_id: str
    context_thread_id: str | None = None
    context_msg_index: int | None = 0

class AskResponse(BaseModel):
    answer: str

@router.post("/ask", response_model=AskResponse)
def ask_question(req: AskRequest, current_user: User = Depends(get_current_user)):
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
    

    model = SiliconFlowChatModel(model=current_user.ad_model, api_key=current_user.ad_api_key)
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
