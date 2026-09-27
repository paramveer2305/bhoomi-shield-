from fastapi import APIRouter
from app.database import get_database

router = APIRouter(prefix="/stats", tags=["Statistics"])

@router.get("/dashboard")
async def get_dashboard_stats():
    """Get dashboard statistics for the home page"""
    db = get_database()

    # Count parcels
    total_parcels = await db.parcels.count_documents({})

    # Count active alerts
    active_alerts = await db.alerts.count_documents({"status": {"$in": ["ACTIVE", "ACKNOWLEDGED"]}})

    # Count risk analyses
    risk_analyses = await db.risk_analysis.count_documents({})

    # Count verifications
    verifications = await db.verification_records.count_documents({})

    return {
        "total_parcels": total_parcels,
        "active_alerts": active_alerts,
        "risk_analyses": risk_analyses,
        "verifications": verifications
    }
