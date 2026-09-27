from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.schemas.case import CaseCreate, CaseUpdate, CaseResolve, CaseResponse
from app.database import get_database
from app.utils.auth import get_optional_current_user

router = APIRouter(prefix="/cases", tags=["Cases"])

@router.get("", response_model=List[CaseResponse])
async def list_cases(
    parcel_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    db = get_database()
    query = {}
    if parcel_id:
        query["parcel_id"] = parcel_id
    if status_filter:
        query["status"] = status_filter
    if priority:
        query["priority"] = priority
    if assigned_to:
        query["assigned_to"] = assigned_to

    cursor = db.cases.find(query).sort("created_at", -1).skip(skip).limit(limit)
    cases = await cursor.to_list(length=limit)
    return cases

@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(case_in: CaseCreate):
    db = get_database()
    
    parcel = await db.parcels.find_one({"parcel_id": case_in.parcel_id})
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Parcel ID '{case_in.parcel_id}' not found")

    # Retrieve current risk level for parcel
    latest_risk = await db.risk_analysis.find_one({"parcel_id": case_in.parcel_id}, sort=[("created_at", -1)])
    risk_level = latest_risk.get("level", "MEDIUM") if latest_risk else "MEDIUM"

    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)

    case_dict = {
        "case_id": case_id,
        "parcel_id": case_in.parcel_id,
        "title": case_in.title,
        "description": case_in.description or f"Verification case initiated for parcel {case_in.parcel_id}",
        "status": "OPEN",
        "priority": case_in.priority,
        "assigned_to": case_in.assigned_to or "UNASSIGNED",
        "risk_level": risk_level,
        "created_at": now,
        "updated_at": now
    }

    await db.cases.insert_one(case_dict)

    # Update parcel status to REQUIRES_VERIFICATION
    await db.parcels.update_one({"parcel_id": case_in.parcel_id}, {"$set": {"status": "REQUIRES_VERIFICATION"}})

    # Record event
    event_dict = {
        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
        "parcel_id": case_in.parcel_id,
        "event_type": "VERIFICATION_CASE_OPENED",
        "title": f"Case Created: {case_in.title}",
        "description": f"Verification case '{case_id}' created with priority {case_in.priority}",
        "timestamp": now,
        "actor": case_in.assigned_to or "OFFICER",
        "metadata": {"case_id": case_id}
    }
    await db.parcel_events.insert_one(event_dict)

    return case_dict

@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(case_id: str):
    db = get_database()
    case_doc = await db.cases.find_one({"case_id": case_id})
    if not case_doc:
        raise HTTPException(status_code=404, detail=f"Case ID '{case_id}' not found")
    return case_doc

@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(case_id: str, case_in: CaseUpdate):
    db = get_database()
    case_doc = await db.cases.find_one({"case_id": case_id})
    if not case_doc:
        raise HTTPException(status_code=404, detail=f"Case ID '{case_id}' not found")

    update_data = {k: v for k, v in case_in.model_dump(exclude_unset=True).items()}
    if not update_data:
        return case_doc

    now = datetime.now(timezone.utc)
    update_data["updated_at"] = now
    await db.cases.update_one({"case_id": case_id}, {"$set": update_data})

    # Record status change event if status updated
    if "status" in update_data:
        event_dict = {
            "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
            "parcel_id": case_doc["parcel_id"],
            "event_type": "CASE_STATUS_CHANGED",
            "title": f"Case Status Updated ({update_data['status']})",
            "description": f"Case {case_id} status updated to {update_data['status']}",
            "timestamp": now,
            "actor": case_doc.get("assigned_to", "OFFICER"),
            "metadata": {"case_id": case_id, "new_status": update_data["status"]}
        }
        await db.parcel_events.insert_one(event_dict)

    updated_case = await db.cases.find_one({"case_id": case_id})
    return updated_case

@router.post("/{case_id}/resolve", response_model=CaseResponse)
async def resolve_case(
    case_id: str,
    resolve_in: CaseResolve,
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    db = get_database()
    case_doc = await db.cases.find_one({"case_id": case_id})
    if not case_doc:
        raise HTTPException(status_code=404, detail=f"Case ID '{case_id}' not found")

    now = datetime.now(timezone.utc)

    # Determine resolving officer
    officer_name = None
    if current_user:
        officer_name = current_user.get("full_name") or current_user.get("username")
    if not officer_name and resolve_in.resolved_by:
        officer_name = resolve_in.resolved_by
    if not officer_name:
        officer_name = case_doc.get("assigned_to") or "REVENUE_OFFICER"

    final_status = resolve_in.status if resolve_in.status in ["RESOLVED", "CLOSED"] else "RESOLVED"

    update_fields = {
        "status": final_status,
        "closing_notes": resolve_in.closing_notes,
        "legal_remarks": resolve_in.legal_remarks,
        "resolved_by": officer_name,
        "resolved_at": now,
        "updated_at": now
    }

    await db.cases.update_one({"case_id": case_id}, {"$set": update_fields})

    # Resolve associated active alerts for this parcel
    await db.alerts.update_many(
        {"parcel_id": case_doc["parcel_id"], "status": "ACTIVE"},
        {"$set": {"status": "RESOLVED", "updated_at": now}}
    )

    # Update parcel status to VERIFIED
    await db.parcels.update_one(
        {"parcel_id": case_doc["parcel_id"]},
        {"$set": {"status": "VERIFIED", "updated_at": now}}
    )

    # Record parcel event
    event_dict = {
        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
        "parcel_id": case_doc["parcel_id"],
        "event_type": "CASE_RESOLVED",
        "title": f"Case Resolved: {case_doc['title']} ({final_status})",
        "description": f"Closed with notes: {resolve_in.closing_notes[:100]}",
        "timestamp": now,
        "actor": officer_name,
        "metadata": {
            "case_id": case_id,
            "status": final_status,
            "closing_notes": resolve_in.closing_notes,
            "legal_remarks": resolve_in.legal_remarks,
            "resolved_by": officer_name
        }
    }
    await db.parcel_events.insert_one(event_dict)

    updated_case = await db.cases.find_one({"case_id": case_id})
    return updated_case
