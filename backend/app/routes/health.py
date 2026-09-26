from fastapi import APIRouter
from app.database import get_database

router = APIRouter(tags=["Health"])

@router.get("/health", summary="Backend Health Check")
async def health_check():
    db = get_database()
    db_status = "connected" if db is not None else "disconnected"
    return {
        "status": "healthy",
        "system": "BHOOMI-SHIELD Risk Intelligence API",
        "database": db_status
    }
