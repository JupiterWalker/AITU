from __future__ import annotations
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlmodel import Session, select

from backend.app.core.security import create_access_token
from backend.app.api.deps import get_db

# Use new app models/schemas; crud still bridged to backend for now
from backend.app.models.user import User
from backend.app.schemas.user import UserPublic, UserTokenLookup, UserCredentialUpdate, UserLogin
from backend.app.crud.user import authenticate_user, register_user

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/token/{token}", response_model=UserTokenLookup)
def get_user_id_by_token(token: str, session: Session = Depends(get_db)):
    cleaned_token = token.strip()
    user = session.exec(select(User).where(User.ad_token == cleaned_token)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserTokenLookup(id=user.id or 0)

@router.put("/{user_id}/register/", response_model=UserPublic)
def update_credentials(user_id: int, body: UserCredentialUpdate, response: Response, session: Session = Depends(get_db)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    register_user(user, body.user_name, body.password, session)
    access_token = create_access_token(data={"sub": user.user_name}, expires_delta=timedelta(minutes=30))
    response.headers["Authorization"] = f"Bearer {access_token}"
    response.headers["X-Access-Token"] = access_token
    return UserPublic(id=user.id or 0, user_name=user.user_name, ad_user=user.ad_user,
                      ad_api_key=user.ad_api_key, ad_model=user.ad_model)

@router.post("/login/", response_model=UserPublic)
def login(body: UserLogin, response: Response, session: Session = Depends(get_db)):
    user = authenticate_user(body.user_name, body.password, session)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.user_name}, expires_delta=timedelta(minutes=30))
    response.headers["Authorization"] = f"Bearer {access_token}"
    response.headers["X-Access-Token"] = access_token
    return UserPublic(id=user.id or 0, user_name=user.user_name, ad_user=user.ad_user,
                      ad_api_key=user.ad_api_key, ad_model=user.ad_model)
