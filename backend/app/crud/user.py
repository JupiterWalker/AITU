from sqlmodel import Session, select
from passlib.context import CryptContext
from passlib.exc import UnknownHashError

from backend.app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_user_by_username(username: str, session: Session):
    return session.exec(select(User).where(User.user_name == username)).first()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    if not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except UnknownHashError:
        return False


def authenticate_user(username: str, password: str, session: Session):
    user = get_user_by_username(username, session)
    if not user:
        return False
    if not verify_password(password, user.password):
        return False
    return user


def register_user(user: User, user_name: str, password: str, session: Session):
    user.user_name = user_name
    user.password = hash_password(password)
    user.ad_token = None
    session.commit()
    session.refresh(user)
