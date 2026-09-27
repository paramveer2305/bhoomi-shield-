from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from app.schemas.evidence import EvidenceCreate, EvidenceResponse
from app.database import get_database

router = APIRouter(prefix="/evidence", tags=["Evidence Tracking"])

ALLOWED_EVIDENCE_TYPES = ["SITE_PHOTO", "BOUNDARY_MEASUREMENT", "WITNESS_RECORD"]

@router.post("", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def create_evidence(evidence_in: EvidenceCreate):
    db = get_database()

    # Validate evidence type
    if evidence_in.evidence_type not in ALLOWED_EVIDENCE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid evidence_type '{evidence_in.evidence_type}'. Must be one of: {', '.join(ALLOWED_EVIDENCE_TYPES)}"
        )

    # Verify parcel exists if provided
    parcel = await db.parcels.find_one({"parcel_id": evidence_in.parcel_id})
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Parcel ID '{evidence_in.parcel_id}' not found")

    evidence_id = f"EVD-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)

    evidence_dict = {
        "evidence_id": evidence_id,
        "parcel_id": evidence_in.parcel_id,
        "case_id": evidence_in.case_id,
        "evidence_type": evidence_in.evidence_type,
        "file_url": evidence_in.file_url,
        "geo_coordinates": evidence_in.geo_coordinates,
        "uploaded_by": evidence_in.uploaded_by or "FIELD_PATWARI",
        "notes": evidence_in.notes,
        "timestamp": now
    }

    await db.evidence.insert_one(evidence_dict)

    # Record in parcel events timeline
    event_dict = {
        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
        "parcel_id": evidence_in.parcel_id,
        "event_type": "EVIDENCE_UPLOADED",
        "title": f"Field Evidence Logged ({evidence_in.evidence_type})",
        "description": f"Evidence {evidence_id} attached to case {evidence_in.case_id}. {evidence_in.notes or ''}".strip(),
        "timestamp": now,
        "actor": evidence_in.uploaded_by or "FIELD_PATWARI",
        "metadata": {
            "evidence_id": evidence_id,
            "case_id": evidence_in.case_id,
            "evidence_type": evidence_in.evidence_type
        }
    }
    await db.parcel_events.insert_one(event_dict)

    return evidence_dict

@router.get("/{case_id}", response_model=List[EvidenceResponse])
async def get_evidence_by_case(case_id: str):
    db = get_database()
    cursor = db.evidence.find({"case_id": case_id}).sort("timestamp", -1)
    evidence_list = await cursor.to_list(length=100)
    return evidence_list

@router.get("", response_model=List[EvidenceResponse])
async def list_all_evidence(
    parcel_id: Optional[str] = None,
    case_id: Optional[str] = None,
    evidence_type: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    db = get_database()
    query = {}
    if parcel_id:
        query["parcel_id"] = parcel_id
    if case_id:
        query["case_id"] = case_id
    if evidence_type:
        query["evidence_type"] = evidence_type

    cursor = db.evidence.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    evidence_list = await cursor.to_list(length=limit)
    return evidence_list
