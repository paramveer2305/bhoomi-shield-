from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

from app.database import get_database
from app.utils.auth import get_current_user
from app.middleware.rbac import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


# Schemas
class RiskWeightConfig(BaseModel):
    """Risk weight configuration"""
    owner_mismatch: int = Field(default=25, ge=0, le=100, description="Weight for owner name mismatch")
    area_discrepancy: int = Field(default=15, ge=0, le=100, description="Weight for area discrepancy")
    survey_mismatch: int = Field(default=20, ge=0, le=100, description="Weight for survey number mismatch")
    title_chain_break: int = Field(default=30, ge=0, le=100, description="Weight for title chain discontinuity")
    multiple_unverified: int = Field(default=15, ge=0, le=100, description="Weight for multiple unverified docs")
    high_event_frequency: int = Field(default=15, ge=0, le=100, description="Weight for high event frequency")

    # Thresholds
    owner_similarity_threshold: float = Field(default=0.85, ge=0.0, le=1.0, description="Owner name similarity threshold")
    area_variance_threshold: float = Field(default=5.0, ge=0.0, le=100.0, description="Area variance threshold %")

    # Risk level thresholds
    critical_threshold: int = Field(default=85, ge=0, le=100)
    high_threshold: int = Field(default=60, ge=0, le=100)
    medium_threshold: int = Field(default=30, ge=0, le=100)


class RiskConfigResponse(RiskWeightConfig):
    updated_at: datetime
    updated_by: str


class UserAssignment(BaseModel):
    """Officer/jurisdiction assignment"""
    user_id: str
    username: str
    full_name: str
    role: str  # patwari, tehsildar, officer
    jurisdiction: Dict[str, Any] = Field(default_factory=dict, description="Jurisdiction: district, tehsil, village")
    assigned_parcels: List[str] = Field(default_factory=list)


class AuditLogEntry(BaseModel):
    """System audit log entry"""
    log_id: str
    timestamp: datetime
    actor_id: str
    actor_name: str
    actor_role: str
    action: str
    resource_type: str  # parcel, document, case, alert, user
    resource_id: str
    details: Dict[str, Any] = Field(default_factory=dict)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class SystemSettings(BaseModel):
    """General system settings"""
    maintenance_mode: bool = False
    demo_mode: bool = True
    ai_engine_enabled: bool = True
    notification_enabled: bool = True
    max_file_upload_mb: int = 10
    session_timeout_minutes: int = 1440


# GET /admin/config/risk - Get current risk weights
@router.get("/config/risk", response_model=RiskConfigResponse)
async def get_risk_config(current_user: dict = Depends(require_admin)):
    """Get current risk engine weight configuration"""
    db = get_database()
    config = await db.system_config.find_one({"config_type": "risk_weights"})

    if not config:
        # Return defaults
        return RiskConfigResponse(
            owner_mismatch=25,
            area_discrepancy=15,
            survey_mismatch=20,
            title_chain_break=30,
            multiple_unverified=15,
            high_event_frequency=15,
            owner_similarity_threshold=0.85,
            area_variance_threshold=5.0,
            critical_threshold=85,
            high_threshold=60,
            medium_threshold=30,
            updated_at=datetime.utcnow(),
            updated_by="system"
        )

    return RiskConfigResponse(**config)


# PUT /admin/config/risk - Update risk weights
@router.put("/config/risk", response_model=RiskConfigResponse)
async def update_risk_config(
    config_in: RiskWeightConfig,
    current_user: dict = Depends(require_admin)
):
    """Update risk engine weight configuration"""
    db = get_database()

    config_dict = config_in.model_dump()
    config_dict["config_type"] = "risk_weights"
    config_dict["updated_at"] = datetime.utcnow()
    config_dict["updated_by"] = current_user.get("username", "admin")

    await db.system_config.update_one(
        {"config_type": "risk_weights"},
        {"$set": config_dict},
        upsert=True
    )

    # Also update risk engine service defaults
    from app.services.risk_engine import RiskEngineService
    RiskEngineService.update_weights(config_dict)

    return RiskConfigResponse(**config_dict)


# GET /admin/config/system - Get system settings
@router.get("/config/system", response_model=SystemSettings)
async def get_system_config(current_user: dict = Depends(require_admin)):
    """Get general system settings"""
    db = get_database()
    config = await db.system_config.find_one({"config_type": "system_settings"})

    if not config:
        return SystemSettings()

    return SystemSettings(**config)


# PUT /admin/config/system - Update system settings
@router.put("/config/system", response_model=SystemSettings)
async def update_system_config(
    config_in: SystemSettings,
    current_user: dict = Depends(require_admin)
):
    """Update general system settings"""
    db = get_database()

    config_dict = config_in.model_dump()
    config_dict["config_type"] = "system_settings"
    config_dict["updated_at"] = datetime.utcnow()
    config_dict["updated_by"] = current_user.get("username", "admin")

    await db.system_config.update_one(
        {"config_type": "system_settings"},
        {"$set": config_dict},
        upsert=True
    )

    return SystemSettings(**config_dict)


# GET /admin/personnel - Get all personnel with assignments
@router.get("/personnel", response_model=List[UserAssignment])
async def get_personnel(current_user: dict = Depends(require_admin)):
    """Get all officers/patwaris with their jurisdiction assignments"""
    db = get_database()

    cursor = db.users.find({"role": {"$in": ["patwari", "tehsildar", "officer"]}})
    users = await cursor.to_list(length=200)

    assignments = []
    for user in users:
        # Get jurisdiction info from user profile or separate collection
        jurisdiction = user.get("jurisdiction", {})

        # Get assigned parcels count
        assigned_count = await db.parcels.count_documents({
            "assigned_officer_id": user.get("username")
        })

        assignments.append(UserAssignment(
            user_id=str(user["_id"]),
            username=user["username"],
            full_name=user["full_name"],
            role=user["role"],
            jurisdiction=jurisdiction,
            assigned_parcels=[]  # Could populate if needed
        ))

    return assignments


# PUT /admin/personnel/{user_id}/jurisdiction - Assign jurisdiction
@router.put("/personnel/{user_id}/jurisdiction", response_model=UserAssignment)
async def assign_jurisdiction(
    user_id: str,
    jurisdiction: Dict[str, Any],
    current_user: dict = Depends(require_admin)
):
    """Assign jurisdiction (district, tehsil, village) to an officer"""
    db = get_database()

    from bson import ObjectId
    try:
        obj_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = await db.users.update_one(
        {"_id": obj_id},
        {"$set": {"jurisdiction": jurisdiction, "updated_at": datetime.utcnow()}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserAssignment(
        user_id=str(user["_id"]),
        username=user["username"],
        full_name=user["full_name"],
        role=user["role"],
        jurisdiction=user.get("jurisdiction", {})
    )


# POST /admin/personnel/{user_id}/assign-parcel - Assign parcel to officer
@router.post("/personnel/{user_id}/assign-parcel/{parcel_id}")
async def assign_parcel_to_officer(
    user_id: str,
    parcel_id: str,
    current_user: dict = Depends(require_admin)
):
    """Assign a specific parcel to an officer for handling"""
    db = get_database()

    from bson import ObjectId
    try:
        obj_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    # Verify user exists and is officer
    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["role"] not in ["patwari", "tehsildar", "officer"]:
        raise HTTPException(status_code=400, detail="User is not an officer")

    # Verify parcel exists
    parcel = await db.parcels.find_one({"parcel_id": parcel_id})
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    # Assign parcel
    await db.parcels.update_one(
        {"parcel_id": parcel_id},
        {"$set": {"assigned_officer_id": user["username"], "updated_at": datetime.utcnow()}}
    )

    # Log audit event
    await db.audit_logs.insert_one({
        "log_id": f"LOG-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{user['username']}",
        "timestamp": datetime.utcnow(),
        "actor_id": current_user.get("username", "admin"),
        "actor_name": current_user.get("full_name", "Admin"),
        "actor_role": "admin",
        "action": "ASSIGN_PARCEL",
        "resource_type": "parcel",
        "resource_id": parcel_id,
        "details": {"assigned_to": user["username"], "officer_name": user["full_name"]}
    })

    return {"status": "success", "message": f"Parcel {parcel_id} assigned to {user['full_name']}"}


# GET /admin/audit-logs - Get system audit logs
@router.get("/audit-logs", response_model=List[AuditLogEntry])
async def get_audit_logs(
    limit: int = 100,
    skip: int = 0,
    actor_id: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(require_admin)
):
    """Get system audit logs with filters"""
    db = get_database()

    query = {}
    if actor_id:
        query["actor_id"] = actor_id
    if action:
        query["action"] = action
    if resource_type:
        query["resource_type"] = resource_type
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            query["timestamp"]["$gte"] = start_date
        if end_date:
            query["timestamp"]["$lte"] = end_date

    cursor = db.audit_logs.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    logs = await cursor.to_list(length=limit)

    return [AuditLogEntry(**log) for log in logs]


# GET /admin/audit-logs/stats - Get audit log statistics
@router.get("/audit-logs/stats")
async def get_audit_log_stats(current_user: dict = Depends(require_admin)):
    """Get audit log statistics for dashboard"""
    db = get_database()

    # Total logs
    total = await db.audit_logs.count_documents({})

    # Logs by action
    pipeline = [
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_action = await db.audit_logs.aggregate(pipeline).to_list(length=20)

    # Logs by actor role
    pipeline = [
        {"$group": {"_id": "$actor_role", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_role = await db.audit_logs.aggregate(pipeline).to_list(length=10)

    # Recent activity (last 24h)
    from datetime import timedelta
    recent = await db.audit_logs.count_documents({
        "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=24)}
    })

    return {
        "total_logs": total,
        "recent_24h": recent,
        "by_action": [{"action": a["_id"], "count": a["count"]} for a in by_action],
        "by_role": [{"role": r["_id"], "count": r["count"]} for r in by_role]
    }