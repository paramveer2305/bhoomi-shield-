from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.user import UserCreate, UserResponse, UserLogin, Token
from app.database import get_database
from app.utils.auth import get_password_hash, verify_password, create_access_token, get_current_user
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserCreate):
    db = get_database()
    
    # Check if username or email exists
    existing_user = await db.users.find_one({
        "$or": [{"username": user_in.username}, {"email": user_in.email}]
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or Email is already registered")

    user_dict = {
        "username": user_in.username,
        "email": user_in.email,
        "full_name": user_in.full_name,
        "role": user_in.role if user_in.role in ["citizen", "officer", "admin"] else "citizen",
        "hashed_password": get_password_hash(user_in.password),
        "created_at": datetime.utcnow()
    }

    result = await db.users.insert_one(user_dict)
    user_dict["id"] = str(result.inserted_id)
    return user_dict

@router.post("/login", response_model=Token)
async def login_user(login_data: UserLogin):
    db = get_database()
    user = await db.users.find_one({"username": login_data.username})
    if not user or not verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "username": user["username"]
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
    user["id"] = str(user["_id"])
    return user
