from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import Session, select

from backend.db import get_session
from .models import User
from .schemas import UserPublic
from passlib.context import CryptContext
from passlib.exc import UnknownHashError

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user_by_username(username: str, session: Session):
    """从模拟数据库中根据用户名获取用户信息"""
    user_data = session.exec(select(User).where(User.user_name == username)).first()
    if not user_data:
        return None
    return user_data

def hash_password(password: str) -> str:
    """哈希用户密码以便存储"""
    return pwd_context.hash(password)
    
def verify_password(plain_password, hashed_password):
    """验证明文密码与哈希密码是否匹配; 若哈希不可识别则返回 False 而不是抛异常"""
    if not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except UnknownHashError:
        return False


def authenticate_user(username: str, password: str, session: Session):
    """验证用户凭据"""
    user = get_user_by_username(username, session)
    if not user:
        return False
    if not verify_password(password, user.password):
        return False
    return user

def register_user(user: User, user_name: str, password: str, session: Session):
    """注册新用户"""
    user.user_name = user_name
    user.password = hash_password(password)
    # token 置空
    user.ad_token = None
    # 已持久化对象修改后直接 commit 即可；无需 session.add(user)
    session.commit()
    session.refresh(user)  # 如果后续无数据库层自动生成字段，可去掉这行