from fastapi import APIRouter, HTTPException, Query, status, BackgroundTasks
from typing import List, Optional
from datetime import datetime
import uuid

from app.schemas.alert import AlertCreate, AlertUpdate, AlertResponse
from app.database import get_database
from app.services.notification import send_high_risk_alert

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
async def list_alerts(
    parcel_id: Optional[str] = None,
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = 50,
    skip: int = 0
):
    db = get_database()
    query = {}
    if parcel_id:
        query["parcel_id"] = parcel_id
    if severity:
        query["severity"] = severity
    if status_filter:
        query["status"] = status_filter

    cursor = db.alerts.find(query).sort("created_at", -1).skip(skip).limit(limit)
    alerts = await cursor.to_list(length=limit)
    return alerts

@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(alert_in: AlertCreate, background_tasks: BackgroundTasks):
    db = get_database()

    parcel = await db.parcels.find_one({"parcel_id": alert_in.parcel_id})
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Parcel ID '{alert_in.parcel_id}' not found")

    alert_id = f"ALT-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.utcnow()

    alert_dict = {
        "alert_id": alert_id,
        "parcel_id": alert_in.parcel_id,
        "severity": alert_in.severity,
        "title": alert_in.title,
        "message": alert_in.message,
        "status": "ACTIVE",
        "created_at": now,
        "updated_at": now
    }

    await db.alerts.insert_one(alert_dict)

    # Record alert event in timeline
    event_dict = {
        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
        "parcel_id": alert_in.parcel_id,
        "event_type": "ALERT_RAISED",
        "title": f"Early Warning Alert: {alert_in.title}",
        "description": alert_in.message,
        "timestamp": now,
        "actor": "ALERT_SERVICE",
        "metadata": {"alert_id": alert_id, "severity": alert_in.severity}
    }
    await db.parcel_events.insert_one(event_dict)

    # Send notifications for HIGH/CRITICAL alerts
    if alert_in.severity in ["HIGH", "CRITICAL"]:
        citizen_phone = parcel.get("owner_phone") or parcel.get("phone")
        if citizen_phone:
            background_tasks.add_task(send_high_risk_alert, parcel, alert_dict, citizen_phone)

        # Also log audit event
        await db.audit_logs.insert_one({
            "log_id": f"LOG-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-ALERT",
            "timestamp": datetime.utcnow(),
            "actor_id": "ALERT_SERVICE",
            "actor_name": "BHOOMI-SHIELD Alert Service",
            "actor_role": "system",
            "action": "ALERT_CREATED",
            "resource_type": "alert",
            "resource_id": alert_id,
            "details": {
                "parcel_id": alert_in.parcel_id,
                "severity": alert_in.severity,
                "title": alert_in.title,
                "notified": bool(citizen_phone)
            }
        })

    return alert_dict

@router.patch("/{alert_id}", response_model=AlertResponse)
async def update_alert_status(alert_id: str, alert_in: AlertUpdate):
    db = get_database()
    alert = await db.alerts.find_one({"alert_id": alert_id})
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")

    update_data = {k: v for k, v in alert_in.model_dump(exclude_unset=True).items()}
    if not update_data:
        return alert

    update_data["updated_at"] = datetime.utcnow()
    await db.alerts.update_one({"alert_id": alert_id}, {"$set": update_data})

    updated_alert = await db.alerts.find_one({"alert_id": alert_id})
    return updated_alert
