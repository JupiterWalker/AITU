from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status, Response
from datetime import datetime, timedelta
from sqlmodel import Session, select

from backend.core.security import create_access_token
from backend.modules.user.crud import authenticate_user, register_user
from .models import User, UserPublic as UserPublicModel
from .schemas import UserPublic, UserTokenLookup, UserCredentialUpdate, UserCreate, UserLogin
try:
    from ...db import init_db, get_session  # package context (backend.modules.user)
except ImportError as e:  # only fallback if it's a missing parent package situation
    msg = repr(e)
    if ("attempted relative import" in msg) or ("parent package" in msg):
        from db import init_db, get_session  # type: ignore
    else:
        raise

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

@router.put("/{user_id}/register/", response_model=UserPublic)
def update_credentials(user_id: int, body: UserCredentialUpdate, response: Response, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    register_user(user, body.user_name, body.password, session)
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.user_name}, expires_delta=access_token_expires
    )
    # 将 token 放入响应 Header，可同时保留 body 中字段
    response.headers["Authorization"] = f"Bearer {access_token}"
    response.headers["X-Access-Token"] = access_token  # 可选自定义 header
    return UserPublicModel(id=user.id or 0, user_name=user.user_name, ad_user=user.ad_user,
                           ad_api_key=user.ad_api_key, ad_model=user.ad_model)

@router.post("/login/", response_model=UserPublic)
def login(body: UserLogin, response: Response, session: Session = Depends(get_session)):
    user = authenticate_user(body.user_name, body.password, session)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.user_name}, expires_delta=access_token_expires
    )
    # 设置 Header
    response.headers["Authorization"] = f"Bearer {access_token}"
    response.headers["X-Access-Token"] = access_token
    return UserPublicModel(id=user.id or 0, user_name=user.user_name, ad_user=user.ad_user,
                           ad_api_key=user.ad_api_key, ad_model=user.ad_model)
