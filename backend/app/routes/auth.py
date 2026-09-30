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

    # Strictly enforce two user roles: citizen and officer
    requested_role = (user_in.role or "citizen").strip().lower()
    final_role = "officer" if requested_role == "officer" else "citizen"

    user_dict = {
        "username": user_in.username,
        "email": user_in.email,
        "full_name": user_in.full_name,
        "role": final_role,
        "hashed_password": get_password_hash(user_in.password),
        "created_at": datetime.utcnow()
    }

    result = await db.users.insert_one(user_dict)
    user_dict["id"] = str(result.inserted_id)
    return user_dict

@router.post("/login", response_model=Token)
async def login_user(login_data: UserLogin):
    db = get_database()
    username = login_data.username.strip()
    user = await db.users.find_one({"username": username})

    # Standard two-role demo accounts configuration (with legacy aliases mapped to officer)
    demo_defaults = {
        "officer": {"role": "officer", "full_name": "Revenue Officer Sharma", "email": "officer@bhoomishield.gov.in"},
        "citizen": {"role": "citizen", "full_name": "Ramesh Kumar Sharma", "email": "citizen@bhoomishield.gov.in"},
        # Legacy demo accounts mapped to single officer role:
        "patwari": {"role": "officer", "full_name": "Field Officer Patel", "email": "officer.patel@bhoomishield.gov.in"},
        "tehsildar": {"role": "officer", "full_name": "Executive Officer Verma", "email": "officer.verma@bhoomishield.gov.in"},
        "admin": {"role": "officer", "full_name": "System Administrator", "email": "admin@bhoomishield.gov.in"},
    }

    # Auto-seed standard demo accounts on-the-fly if not already created
    if not user and username.lower() in demo_defaults:
        def_info = demo_defaults[username.lower()]
        default_pw = f"{username.lower()}123"
        user_dict = {
            "username": username.lower(),
            "email": def_info["email"],
            "full_name": def_info["full_name"],
            "role": def_info["role"],
            "hashed_password": get_password_hash(default_pw),
            "created_at": datetime.utcnow()
        }
        res = await db.users.insert_one(user_dict)
        user = user_dict
        user["_id"] = res.inserted_id

    # Verify password (via bcrypt or allowed demo passwords)
    is_valid = False
    if user:
        if verify_password(login_data.password, user.get("hashed_password", "")):
            is_valid = True
        elif username.lower() in demo_defaults:
            allowed_passwords = [f"{username.lower()}123", username.lower(), "admin123", "123456", "password"]
            if login_data.password in allowed_passwords:
                is_valid = True

    if not user or not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    # Normalize role to two-role system: citizen or officer
    raw_role = (user.get("role") or "citizen").lower()
    if raw_role in ["officer", "patwari", "tehsildar", "revenue_officer", "field_patwari", "admin"]:
        user_role = "officer"
    else:
        user_role = "citizen"

    access_token = create_access_token(
        data={"sub": user["username"], "role": user_role}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user_role,
        "username": user["username"]
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
    user["id"] = str(user["_id"])
    
    # Normalize role to two-role architecture
    raw_role = (user.get("role") or "citizen").lower()
    user["role"] = "officer" if raw_role in ["officer", "patwari", "tehsildar", "revenue_officer", "field_patwari", "admin"] else "citizen"
    return user
