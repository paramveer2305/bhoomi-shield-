from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.schemas.parcel import ParcelCreate, ParcelUpdate, ParcelResponse, ParcelEventResponse
from app.database import get_database

router = APIRouter(prefix="/parcels", tags=["Parcels"])

@router.get("", response_model=List[ParcelResponse])
async def list_parcels(
    district: Optional[str] = None,
    tehsil: Optional[str] = None,
    village: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = 50,
    skip: int = 0
):
    db = get_database()
    query = {}
    if district:
        query["district"] = {"$regex": district, "$options": "i"}
    if tehsil:
        query["tehsil"] = {"$regex": tehsil, "$options": "i"}
    if village:
        query["village"] = {"$regex": village, "$options": "i"}
    if status_filter:
        query["status"] = status_filter

    cursor = db.parcels.find(query).skip(skip).limit(limit)
    parcels = await cursor.to_list(length=limit)
    return parcels

@router.post("", response_model=ParcelResponse, status_code=status.HTTP_201_CREATED)
async def create_parcel(parcel_in: ParcelCreate):
    db = get_database()
    
    existing = await db.parcels.find_one({"parcel_id": parcel_in.parcel_id})
    if existing:
        raise HTTPException(status_code=400, detail=f"Parcel with ID {parcel_in.parcel_id} already exists")

    now = datetime.now(timezone.utc)
    parcel_dict = parcel_in.model_dump()
    parcel_dict["created_at"] = now
    parcel_dict["updated_at"] = now

    await db.parcels.insert_one(parcel_dict)

    # Record creation timeline event
    event_dict = {
        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
        "parcel_id": parcel_in.parcel_id,
        "event_type": "PARCEL_REGISTERED",
        "title": "Parcel Record Registered",
        "description": f"Parcel registered under survey {parcel_in.survey_number} in {parcel_in.village}, {parcel_in.district}",
        "timestamp": now,
        "actor": "REVENUE_OFFICER",
        "metadata": {"owner_name": parcel_in.owner_name, "area": parcel_in.area}
    }
    await db.parcel_events.insert_one(event_dict)

    return parcel_dict

@router.get("/{parcel_id}", response_model=ParcelResponse)
async def get_parcel(parcel_id: str):
    db = get_database()
    parcel = await db.parcels.find_one({"parcel_id": parcel_id})
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Parcel record '{parcel_id}' not found")
    return parcel

@router.put("/{parcel_id}", response_model=ParcelResponse)
async def update_parcel(parcel_id: str, parcel_in: ParcelUpdate):
    db = get_database()
    existing = await db.parcels.find_one({"parcel_id": parcel_id})
    if not existing:
        raise HTTPException(status_code=404, detail=f"Parcel record '{parcel_id}' not found")

    update_data = {k: v for k, v in parcel_in.model_dump(exclude_unset=True).items()}
    if not update_data:
        return existing

    update_data["updated_at"] = datetime.now(timezone.utc)

    await db.parcels.update_one({"parcel_id": parcel_id}, {"$set": update_data})

    # Record update event in timeline
    event_dict = {
        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
        "parcel_id": parcel_id,
        "event_type": "PARCEL_RECORD_UPDATED",
        "title": "Parcel Information Updated",
        "description": f"Updated fields: {', '.join(update_data.keys())}",
        "timestamp": datetime.now(timezone.utc),
        "actor": "REVENUE_OFFICER",
        "metadata": update_data
    }
    await db.parcel_events.insert_one(event_dict)

    updated_parcel = await db.parcels.find_one({"parcel_id": parcel_id})
    return updated_parcel

@router.get("/{parcel_id}/timeline", response_model=List[ParcelEventResponse])
async def get_parcel_timeline(parcel_id: str):
    db = get_database()
    existing = await db.parcels.find_one({"parcel_id": parcel_id})
    if not existing:
        raise HTTPException(status_code=404, detail=f"Parcel record '{parcel_id}' not found")

    cursor = db.parcel_events.find({"parcel_id": parcel_id}).sort("timestamp", -1)
    events = await cursor.to_list(length=100)
    return events

@router.post("/{parcel_id}/export")
async def export_parcel_report(parcel_id: str):
    """Generate and return a comprehensive parcel report"""
    db = get_database()
    parcel = await db.parcels.find_one({"parcel_id": parcel_id})
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Parcel record '{parcel_id}' not found")

    # Get related data
    timeline = await db.parcel_events.find({"parcel_id": parcel_id}).sort("timestamp", -1).to_list(length=100)
    documents = await db.documents.find({"parcel_id": parcel_id}).to_list(length=100)
    risk_analysis = await db.risk_analyses.find_one({"parcel_id": parcel_id}, sort=[("timestamp", -1)])

    # Create comprehensive report
    report = {
        "parcel": parcel,
        "timeline": timeline,
        "documents_count": len(documents),
        "risk_analysis": risk_analysis,
        "generated_at": datetime.now(timezone.utc),
        "report_type": "COMPREHENSIVE_PARCEL_REPORT"
    }

    # Record export event
    event_dict = {
        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
        "parcel_id": parcel_id,
        "event_type": "REPORT_EXPORTED",
        "title": "Parcel Report Exported",
        "description": f"Comprehensive report generated for parcel {parcel_id}",
        "timestamp": datetime.now(timezone.utc),
        "actor": "SYSTEM",
        "metadata": {"report_type": "COMPREHENSIVE"}
    }
    await db.parcel_events.insert_one(event_dict)

    return report

@router.post("/{parcel_id}/initiate-verification")
async def initiate_verification(parcel_id: str):
    """Initiate a verification process for a parcel"""
    db = get_database()
    parcel = await db.parcels.find_one({"parcel_id": parcel_id})
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Parcel record '{parcel_id}' not found")

    # Create verification case
    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)

    case_dict = {
        "case_id": case_id,
        "parcel_id": parcel_id,
        "title": f"Verification Request for {parcel_id}",
        "description": f"Verification initiated for parcel in {parcel['village']}, {parcel['district']}",
        "status": "OPEN",
        "priority": "MEDIUM",
        "risk_level": "MEDIUM",
        "assigned_to": None,
        "created_at": now,
        "updated_at": now
    }

    await db.cases.insert_one(case_dict)

    # Update parcel status
    await db.parcels.update_one(
        {"parcel_id": parcel_id},
        {"$set": {"status": "IN_REVIEW", "updated_at": now}}
    )

    # Record verification initiation event
    event_dict = {
        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
        "parcel_id": parcel_id,
        "event_type": "VERIFICATION_INITIATED",
        "title": "Verification Process Initiated",
        "description": f"Verification case {case_id} created for parcel {parcel_id}",
        "timestamp": now,
        "actor": "OFFICER",
        "metadata": {"case_id": case_id}
    }
    await db.parcel_events.insert_one(event_dict)

    return {
        "message": "Verification initiated successfully",
        "case_id": case_id,
        "parcel_id": parcel_id,
        "status": "IN_REVIEW"
    }
