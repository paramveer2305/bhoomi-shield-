from fastapi import APIRouter, HTTPException, status
from typing import Optional
from datetime import datetime, timezone
import uuid

from app.schemas.risk import RiskAnalysisResponse, RiskAnalyzeRequest
from app.database import get_database
from app.services.risk_engine import RiskEngineService

router = APIRouter(prefix="/risk", tags=["Risk Analysis"])

@router.post("/analyze/{parcel_id}", response_model=RiskAnalysisResponse, status_code=status.HTTP_200_OK)
async def analyze_parcel_risk(parcel_id: str, payload: Optional[RiskAnalyzeRequest] = None):
    db = get_database()
    
    parcel = await db.parcels.find_one({"parcel_id": parcel_id})
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Parcel ID '{parcel_id}' not found")

    # Retrieve all uploaded documents for parcel
    doc_cursor = db.documents.find({"parcel_id": parcel_id})
    documents = await doc_cursor.to_list(length=100)

    # If payload provides direct extractions override (from AI engine integration), incorporate it
    if payload and payload.extracted_data_override:
        documents.append({
            "document_id": "DIRECT_AI_PAYLOAD",
            "extracted_data": payload.extracted_data_override,
            "verification_status": "PENDING_VERIFICATION"
        })

    # Fetch historical timeline events
    event_cursor = db.parcel_events.find({"parcel_id": parcel_id})
    events = await event_cursor.to_list(length=100)

    # Perform risk evaluation
    analysis_result = RiskEngineService.evaluate_risk(parcel, documents, events)

    risk_id = f"RSK-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)

    risk_dict = {
        "risk_id": risk_id,
        "parcel_id": parcel_id,
        "score": analysis_result["score"],
        "level": analysis_result["level"],
        "trend": analysis_result["trend"],
        "reasons": analysis_result["reasons"],
        "recommended_actions": analysis_result["recommended_actions"],
        "created_at": now
    }

    await db.risk_analysis.insert_one(risk_dict)

    # Record risk analysis event
    event_dict = {
        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
        "parcel_id": parcel_id,
        "event_type": "RISK_ANALYSIS_PERFORMED",
        "title": f"Risk Evaluation Generated ({analysis_result['level']})",
        "description": f"Calculated risk score {analysis_result['score']}/100 with level {analysis_result['level']}",
        "timestamp": now,
        "actor": "RISK_ENGINE",
        "metadata": {"risk_id": risk_id, "score": analysis_result["score"], "level": analysis_result["level"]}
    }
    await db.parcel_events.insert_one(event_dict)

    # Auto-generate Early Warning Alert if level is HIGH or CRITICAL
    if analysis_result["level"] in ["HIGH", "CRITICAL"]:
        alert_dict = {
            "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
            "parcel_id": parcel_id,
            "severity": analysis_result["level"],
            "title": f"Early Warning: High Risk Signal on Parcel {parcel_id}",
            "message": f"Potential inconsistency detected. Risk score: {analysis_result['score']}/100. Verification recommended.",
            "status": "ACTIVE",
            "created_at": now,
            "updated_at": now
        }
        await db.alerts.insert_one(alert_dict)

    return risk_dict

@router.get("/{parcel_id}", response_model=RiskAnalysisResponse)
async def get_latest_risk_analysis(parcel_id: str):
    db = get_database()
    parcel = await db.parcels.find_one({"parcel_id": parcel_id})
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Parcel ID '{parcel_id}' not found")

    risk_doc = await db.risk_analysis.find_one({"parcel_id": parcel_id}, sort=[("created_at", -1)])
    if not risk_doc:
        # Perform auto-analysis if none exists yet
        return await analyze_parcel_risk(parcel_id)
        
    return risk_doc
