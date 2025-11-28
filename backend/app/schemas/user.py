from __future__ import annotations
from sqlmodel import SQLModel, Field
from ..models.user import (
    UserPublic as UserPublicModel,
    UserCreate as UserCreateModel,
    UserCredentialUpdate as UserCredentialUpdateModel,
)

class UserPublic(UserPublicModel):
    pass

class UserTokenLookup(SQLModel):
    id: int

class UserCredentialUpdate(UserCredentialUpdateModel):
    user_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=200)

class UserCreate(UserCreateModel):
    password: str = Field(..., min_length=1, max_length=200)

class UserLogin(SQLModel):
    user_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=200)
