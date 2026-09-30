from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.config import settings
from app.database import get_database

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)):
    if not token:
        # For ease of testing and college demo integration, if no token provided, return demo default user context or raise 401
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate token credentials")

    db = get_database()
    user = await db.users.find_one({"username": username})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return {
        "id": str(user.get("_id")),
        "username": user["username"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"]
    }

async def get_optional_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[dict]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            return None
        db = get_database()
        user = await db.users.find_one({"username": username})
        if user:
            raw_role = (user.get("role") or "citizen").lower()
            norm_role = "officer" if raw_role in ["officer", "patwari", "tehsildar", "revenue_officer", "field_patwari", "admin", "system_admin"] else "citizen"
            return {
                "id": str(user.get("_id")),
                "username": user["username"],
                "email": user["email"],
                "full_name": user.get("full_name", user["username"]),
                "role": norm_role
            }
    except Exception:
        pass
    return None

def require_roles(roles: list[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = (current_user.get("role") or "citizen").lower()
        allowed = [r.lower() for r in roles]
        officer_aliases = {"officer", "patwari", "tehsildar", "revenue_officer", "field_patwari", "admin", "system_admin"}
        is_officer_allowed = any(r in officer_aliases for r in allowed)
        is_citizen_allowed = "citizen" in allowed

        if (user_role == "officer" and is_officer_allowed) or (user_role == "citizen" and is_citizen_allowed) or user_role in allowed:
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Operation not permitted. Required roles: {roles}"
        )
    return role_checker
