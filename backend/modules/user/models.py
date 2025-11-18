from __future__ import annotations
from sqlmodel import SQLModel, Field

class UserBase(SQLModel):
    user_name: str = Field(index=True, max_length=100)
    ad_user: str | None = Field(default=None, max_length=200)
    ad_api_key: str | None = Field(default=None, max_length=200)
    ad_model: str | None = Field(default=None, max_length=200)

class User(UserBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    password: str = Field(max_length=200)
    ad_token: str | None = Field(default=None, index=True, max_length=200)

class UserPublic(UserBase):
    id: int
    ad_token: str | None = None

class UserCreate(UserBase):
    password: str
    ad_token: str | None = None

class UserCredentialUpdate(SQLModel):
    user_name: str
    password: str
