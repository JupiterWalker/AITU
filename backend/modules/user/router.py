from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from .models import User, UserPublic as UserPublicModel
from .schemas import UserPublic, UserTokenLookup, UserCredentialUpdate, UserCreate, UserLogin
try:
    from ...db import init_db, get_session  # package context (backend.modules.user)
except ImportError:  # script context when imported as modules.user.router
    from db import init_db, get_session  # type: ignore

router = APIRouter(prefix="/users", tags=["users"])

@router.on_event("startup")
def _startup():
    init_db()

@router.get("/token/{token}", response_model=UserTokenLookup)
def get_user_id_by_token(token: str, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.ad_token == token)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserTokenLookup(id=user.id or 0)

@router.put("/{user_id}/credentials", response_model=UserPublic)
def update_credentials(user_id: int, body: UserCredentialUpdate, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.user_name = body.user_name
    user.password = body.password
    # token 置空
    user.ad_token = None
    # 已持久化对象修改后直接 commit 即可；无需 session.add(user)
    session.commit()
    session.refresh(user)  # 如果后续无数据库层自动生成字段，可去掉这行
    return UserPublicModel(id=user.id or 0, user_name=user.user_name, ad_user=user.ad_user,
                           ad_api_key=user.ad_api_key, ad_model=user.ad_model, ad_token=user.ad_token)

@router.post("/", response_model=UserPublic)
def create_user(body: UserCreate, session: Session = Depends(get_session)):
    u = User(**body.model_dump())
    session.add(u)
    session.commit()
    session.refresh(u)
    return UserPublicModel(id=u.id or 0, user_name=u.user_name, ad_user=u.ad_user,
                           ad_api_key=u.ad_api_key, ad_model=u.ad_model, ad_token=u.ad_token)

@router.post("/login", response_model=UserPublic)
def login(body: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.user_name == body.user_name)).first()
    if not user or user.password != body.password:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    # 返回用户公开信息（不生成新 token，此处可扩展）
    return UserPublicModel(id=user.id or 0, user_name=user.user_name, ad_user=user.ad_user,
                           ad_api_key=user.ad_api_key, ad_model=user.ad_model, ad_token=user.ad_token)
