from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.schemas.verification import VerificationCreate, VerificationResponse
from app.database import get_database
from app.utils.auth import get_optional_current_user

router = APIRouter(prefix="/verification", tags=["Verification"])

@router.get("", response_model=List[VerificationResponse])
async def list_verifications(
    parcel_id: Optional[str] = None,
    case_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = 100,
    skip: int = 0
):
    db = get_database()
    query = {}
    if parcel_id:
        query["parcel_id"] = parcel_id
    if case_id:
        query["case_id"] = case_id
    if status_filter:
        query["status"] = status_filter

    cursor = db.verification_records.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    verifications = await cursor.to_list(length=limit)
    return verifications

@router.post("", response_model=VerificationResponse, status_code=status.HTTP_201_CREATED)
async def submit_verification(
    verification_in: VerificationCreate,
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    db = get_database()

    parcel = await db.parcels.find_one({"parcel_id": verification_in.parcel_id})
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Parcel ID '{verification_in.parcel_id}' not found")

    if verification_in.case_id:
        case_doc = await db.cases.find_one({"case_id": verification_in.case_id})
        if not case_doc:
            raise HTTPException(status_code=404, detail=f"Case ID '{verification_in.case_id}' not found")

    ver_id = f"VER-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)

    # Determine officer identity from auth token, payload, or fallback
    officer_name = None
    if current_user:
        officer_name = current_user.get("full_name") or current_user.get("username")
    if not officer_name and verification_in.verified_by:
        officer_name = verification_in.verified_by
    if not officer_name:
        officer_name = "FIELD_PATWARI"

    ver_dict = {
        "verification_id": ver_id,
        "parcel_id": verification_in.parcel_id,
        "case_id": verification_in.case_id,
        "action_taken": verification_in.action_taken,
        "notes": verification_in.notes,
        "verified_by": officer_name,
        "status": verification_in.status,
        "timestamp": now
    }

    await db.verification_records.insert_one(ver_dict)

    # Record verification event in parcel timeline
    event_dict = {
        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
        "parcel_id": verification_in.parcel_id,
        "event_type": "VERIFICATION_LOGGED",
        "title": f"Officer Verification Conducted ({verification_in.status})",
        "description": f"Action: {verification_in.action_taken}. Notes: {verification_in.notes[:80]}...",
        "timestamp": now,
        "actor": officer_name,
        "metadata": {"verification_id": ver_id, "status": verification_in.status}
    }
    await db.parcel_events.insert_one(event_dict)

    # Update associated case and parcel status depending on verification outcome
    if verification_in.case_id:
        if verification_in.status == "COMPLETED":
            await db.cases.update_one(
                {"case_id": verification_in.case_id},
                {"$set": {"status": "RESOLVED", "updated_at": now}}
            )
            await db.parcels.update_one(
                {"parcel_id": verification_in.parcel_id},
                {"$set": {"status": "VERIFIED", "updated_at": now}}
            )
        elif verification_in.status == "REQUIRES_FURTHER_INVESTIGATION":
            await db.cases.update_one(
                {"case_id": verification_in.case_id},
                {"$set": {"status": "IN_PROGRESS", "updated_at": now}}
            )
            await db.parcels.update_one(
                {"parcel_id": verification_in.parcel_id},
                {"$set": {"status": "IN_REVIEW", "updated_at": now}}
            )
        elif verification_in.status == "REJECTED":
            await db.cases.update_one(
                {"case_id": verification_in.case_id},
                {"$set": {"status": "IN_PROGRESS", "updated_at": now}}
            )
            await db.parcels.update_one(
                {"parcel_id": verification_in.parcel_id},
                {"$set": {"status": "DISPUTED", "updated_at": now}}
            )

    return ver_dict

@router.get("/parcel/{parcel_id}", response_model=List[VerificationResponse])
@router.get("/{parcel_id}", response_model=List[VerificationResponse])
async def get_verifications_for_parcel(parcel_id: str):
    db = get_database()
    cursor = db.verification_records.find({"parcel_id": parcel_id}).sort("timestamp", -1)
    verifications = await cursor.to_list(length=100)
    return verifications
