from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import json
import uuid

from app.database import get_database
from app.services.ai_document_engine import (
    extract_text_from_file_bytes,
    parse_document_fields,
    cross_compare_documents,
    generate_3d_land_geometry,
    get_demo_property_payload,
    DOCUMENT_TYPE_LABELS,
)

router = APIRouter(prefix="/ai", tags=["AI Document Engine"])


@router.get("/demo-property")
async def get_demo_property():
    """
    Returns pre-configured demonstration property with 3 realistic documents,
    intentional discrepancies, risk intelligence metrics, and 3D land boundary geometry.
    """
    try:
        return get_demo_property_payload()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate demo property: {str(e)}")


@router.post("/analyze-documents")
async def analyze_documents(
    files: List[UploadFile] = File(...),
    parcel_id: Optional[str] = Form(None),
    document_types: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """
    Full AI Engine pipeline:
    1. Upload & Validate Files (PDF, JPG, PNG)
    2. OCR & Text Extraction (PyMuPDF / Tesseract)
    3. Structured Field Extraction (Owner, Survey, Area, Location, Reg No, Boundaries, Lat/Lng)
    4. Cross-Document Comparison & Mismatch Detection
    5. Risk Intelligence & Explainable Scoring
    6. 3D Cadastral Geometry Generation
    7. Storage in MongoDB (db.documents, db.ai_analyses, db.parcel_events)
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files provided for analysis.")

    # Validate file formats
    allowed_exts = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".txt"]
    for file in files:
        fn = (file.filename or "").lower()
        if not any(fn.endswith(ext) for ext in allowed_exts):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{file.filename}'. Allowed formats: PDF, JPG, PNG, WEBP, TXT",
            )

    # Parse document types mapping if provided
    type_map = {}
    if document_types:
        try:
            parsed = json.loads(document_types)
            if isinstance(parsed, dict):
                type_map = parsed
            elif isinstance(parsed, list):
                for idx, t in enumerate(parsed):
                    type_map[str(idx)] = t
        except Exception:
            pass

    db = get_database()
    parcel_record = None
    if parcel_id:
        parcel_record = await db.parcels.find_one({"parcel_id": parcel_id})

    processed_docs: List[Dict[str, Any]] = []

    for idx, file in enumerate(files):
        doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
        filename = file.filename or f"document_{idx+1}.pdf"
        content = await file.read()
        file_size_kb = round(len(content) / 1024, 1)
        size_str = f"{file_size_kb} KB" if file_size_kb < 1024 else f"{round(file_size_kb / 1024, 2)} MB"

        # Determine doc type
        assigned_type = type_map.get(str(idx)) or type_map.get(filename) or "UNKNOWN"

        # OCR & Text Extraction
        extracted_text, ocr_engine = extract_text_from_file_bytes(
            content=content,
            filename=filename,
            content_type=file.content_type
        )

        # Field Extraction
        extracted_fields = parse_document_fields(
            text=extracted_text,
            default_type=assigned_type,
            filename=filename
        )

        final_doc_type = extracted_fields.get("document_type") or assigned_type

        doc_item = {
            "document_id": doc_id,
            "parcel_id": parcel_id or extracted_fields.get("property_id") or "UNASSIGNED",
            "file_name": filename,
            "document_type": final_doc_type,
            "ocr_engine": ocr_engine,
            "raw_text": extracted_text,
            "extracted_fields": extracted_fields,
            "file_size": size_str,
            "status": "ANALYZED",
            "upload_date": datetime.now(timezone.utc),
        }
        processed_docs.append(doc_item)

    # Cross-document comparison & Mismatch detection
    mismatches, risk_factors, risk_score, risk_level, summary = cross_compare_documents(
        doc_list=processed_docs,
        parcel_record=parcel_record
    )

    # Determine reference coordinates and area for 3D map
    lat = 23.2599
    lng = 77.4126
    area_ha = 2.5
    survey_no = "425/1"
    target_parcel_id = parcel_id or "PARCEL-DEMO"

    if parcel_record:
        lat = parcel_record.get("latitude", lat)
        lng = parcel_record.get("longitude", lng)
        area_ha = parcel_record.get("area", area_ha)
        survey_no = parcel_record.get("survey_number", survey_no)
        target_parcel_id = parcel_record.get("parcel_id", target_parcel_id)
    else:
        # Check if any doc has coordinates
        for doc in processed_docs:
            f = doc.get("extracted_fields", {})
            if f.get("latitude") and f.get("longitude"):
                lat = f["latitude"]
                lng = f["longitude"]
            if f.get("area") and f.get("area_unit") == "hectare":
                area_ha = f["area"]
            if f.get("survey_number"):
                survey_no = f["survey_number"]
            if f.get("property_id"):
                target_parcel_id = f["property_id"]

    has_boundary_or_area_mismatch = any(
        m.get("type") in ["BOUNDARY_MISMATCH", "AREA_MISMATCH", "SURVEY_KHASRA_MISMATCH"]
        for m in mismatches
    )
    first_mismatch_desc = mismatches[0]["title"] if mismatches else None

    map_geometry = generate_3d_land_geometry(
        parcel_id=target_parcel_id,
        survey_number=survey_no,
        center_lat=lat,
        center_lng=lng,
        area_hectare=area_ha,
        has_mismatch=has_boundary_or_area_mismatch,
        mismatch_type=first_mismatch_desc
    )

    # Generate synthesized AI findings and recommended actions
    ai_findings = []
    for m in mismatches[:4]:
        ai_findings.append(f"{m['title']}: {m['evidence']}")
    if not ai_findings:
        ai_findings.append("No critical legal or spatial discrepancies identified across uploaded documents.")

    recommended_actions = []
    if risk_level in ["CRITICAL", "HIGH"]:
        recommended_actions = [
            "Initiate official field demarcation by Patwari using DGPS/Total Station.",
            "Verify registration challan and thumb impressions at Sub-Registrar office.",
            "Issue statutory Form-12 notice to recorded titleholders before mutation approval.",
            "Place provisional hold on land registry transfer until discrepancy resolution.",
        ]
    elif risk_level == "MEDIUM":
        recommended_actions = [
            "Request applicant to submit original certified copy of Khasra Khatauni.",
            "Conduct routine Patwari field inspection to verify actual physical possession.",
        ]
    else:
        recommended_actions = [
            "All documents conform to statutory standards. Cleared for standard processing.",
        ]

    analysis_id = f"AI-ANALYSIS-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)

    analysis_record = {
        "analysis_id": analysis_id,
        "parcel_id": target_parcel_id,
        "documents": [
            {
                "document_id": d["document_id"],
                "file_name": d["file_name"],
                "document_type": d["document_type"],
                "extracted_fields": d["extracted_fields"],
                "file_size": d["file_size"],
            }
            for d in processed_docs
        ],
        "mismatches": mismatches,
        "risk_factors": risk_factors,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "summary": summary,
        "map_geometry": map_geometry,
        "ai_findings": ai_findings,
        "recommended_actions": recommended_actions,
        "created_at": now,
    }

    # Store in MongoDB asynchronously in background
    background_tasks.add_task(persist_analysis_to_db, analysis_record, processed_docs, target_parcel_id)

    return analysis_record


async def persist_analysis_to_db(analysis_record: dict, docs: list, parcel_id: str):
    """Saves documents, analysis record, and audit events to MongoDB."""
    try:
        db = get_database()
        # 1. Save documents
        for doc in docs:
            doc_dict = {
                "document_id": doc["document_id"],
                "parcel_id": parcel_id,
                "document_type": doc["document_type"],
                "file_name": doc["file_name"],
                "file_url": f"/static/uploads/{doc['file_name']}",
                "extracted_data": doc["extracted_fields"],
                "upload_date": doc["upload_date"],
                "verification_status": "DISCREPANCY_DETECTED" if analysis_record["risk_score"] >= 60 else "VERIFIED",
            }
            await db.documents.insert_one(doc_dict)

        # 2. Save analysis
        await db.ai_analyses.insert_one(analysis_record)

        # 3. Update parcel risk level if parcel exists
        parcel = await db.parcels.find_one({"parcel_id": parcel_id})
        if parcel:
            await db.parcels.update_one(
                {"parcel_id": parcel_id},
                {
                    "$set": {
                        "risk_score": analysis_record["risk_score"],
                        "risk_level": analysis_record["risk_level"],
                        "updated_at": datetime.now(timezone.utc),
                    }
                }
            )

        # 4. Insert parcel timeline event
        event_dict = {
            "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
            "parcel_id": parcel_id,
            "event_type": "AI_ANALYSIS_COMPLETED",
            "title": f"AI Document Engine Analysis ({analysis_record['risk_level']})",
            "description": f"Analyzed {len(docs)} documents. Risk score: {analysis_record['risk_score']}/100 with {len(analysis_record['mismatches'])} detected mismatches.",
            "timestamp": datetime.now(timezone.utc),
            "actor": "AI_ENGINE",
            "metadata": {
                "analysis_id": analysis_record["analysis_id"],
                "risk_score": analysis_record["risk_score"],
                "risk_level": analysis_record["risk_level"],
                "mismatches_count": len(analysis_record["mismatches"]),
            }
        }
        await db.parcel_events.insert_one(event_dict)

        # 5. If HIGH or CRITICAL, register alert
        if analysis_record["risk_level"] in ["HIGH", "CRITICAL"]:
            alert_dict = {
                "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                "parcel_id": parcel_id,
                "severity": analysis_record["risk_level"],
                "title": f"AI Discrepancy Alert: {analysis_record['risk_level']} Risk Detected",
                "message": f"Document comparison detected {len(analysis_record['mismatches'])} mismatches on parcel {parcel_id}. Risk score: {analysis_record['risk_score']}/100.",
                "status": "ACTIVE",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
            await db.alerts.insert_one(alert_dict)

    except Exception as e:
        print(f"[AI_ENGINE] Failed to persist analysis to database: {e}")


@router.post("/analyze-json")
async def analyze_json(payload: Dict[str, Any], background_tasks: BackgroundTasks = BackgroundTasks()):
    """
    Analyzes pre-extracted or text documents provided in JSON payload.
    Supports demo workflow or direct API integrations.
    """
    raw_docs = payload.get("documents", [])
    parcel_id = payload.get("parcel_id")

    if not raw_docs:
        raise HTTPException(status_code=400, detail="No documents provided in JSON payload.")

    db = get_database()
    parcel_record = None
    if parcel_id:
        parcel_record = await db.parcels.find_one({"parcel_id": parcel_id})

    processed_docs = []
    for idx, doc in enumerate(raw_docs):
        doc_id = doc.get("document_id") or f"DOC-{uuid.uuid4().hex[:8].upper()}"
        filename = doc.get("file_name") or f"document_{idx+1}.pdf"
        text = doc.get("raw_text") or doc.get("text") or ""
        doc_type = doc.get("document_type", "UNKNOWN")

        if doc.get("extracted_fields"):
            extracted_fields = doc["extracted_fields"]
        else:
            extracted_fields = parse_document_fields(text, doc_type, filename)

        processed_docs.append({
            "document_id": doc_id,
            "parcel_id": parcel_id or extracted_fields.get("property_id") or "UNASSIGNED",
            "file_name": filename,
            "document_type": extracted_fields.get("document_type") or doc_type,
            "raw_text": text,
            "extracted_fields": extracted_fields,
            "file_size": doc.get("file_size", "1.5 MB"),
            "status": "ANALYZED",
            "upload_date": datetime.now(timezone.utc),
        })

    mismatches, risk_factors, risk_score, risk_level, summary = cross_compare_documents(
        doc_list=processed_docs,
        parcel_record=parcel_record
    )

    lat = 23.2599
    lng = 77.4126
    area_ha = 2.5
    survey_no = "425/1"
    target_parcel_id = parcel_id or "PARCEL-DEMO"

    if parcel_record:
        lat = parcel_record.get("latitude", lat)
        lng = parcel_record.get("longitude", lng)
        area_ha = parcel_record.get("area", area_ha)
        survey_no = parcel_record.get("survey_number", survey_no)
        target_parcel_id = parcel_record.get("parcel_id", target_parcel_id)
    else:
        for doc in processed_docs:
            f = doc.get("extracted_fields", {})
            if f.get("latitude") and f.get("longitude"):
                lat = f["latitude"]
                lng = f["longitude"]
            if f.get("area"):
                area_ha = f["area"]
            if f.get("survey_number"):
                survey_no = f["survey_number"]
            if f.get("property_id"):
                target_parcel_id = f["property_id"]

    has_boundary_or_area_mismatch = any(
        m.get("type") in ["BOUNDARY_MISMATCH", "AREA_MISMATCH", "SURVEY_KHASRA_MISMATCH"]
        for m in mismatches
    )
    first_mismatch_desc = mismatches[0]["title"] if mismatches else None

    map_geometry = generate_3d_land_geometry(
        parcel_id=target_parcel_id,
        survey_number=survey_no,
        center_lat=lat,
        center_lng=lng,
        area_hectare=area_ha,
        has_mismatch=has_boundary_or_area_mismatch,
        mismatch_type=first_mismatch_desc
    )

    ai_findings = []
    for m in mismatches[:4]:
        ai_findings.append(f"{m['title']}: {m['evidence']}")
    if not ai_findings:
        ai_findings.append("No critical legal or spatial discrepancies identified across uploaded documents.")

    recommended_actions = []
    if risk_level in ["CRITICAL", "HIGH"]:
        recommended_actions = [
            "Initiate official field demarcation by Patwari using DGPS/Total Station.",
            "Verify registration challan and thumb impressions at Sub-Registrar office.",
            "Issue statutory Form-12 notice to recorded titleholders before mutation approval.",
            "Place provisional hold on land registry transfer until discrepancy resolution.",
        ]
    elif risk_level == "MEDIUM":
        recommended_actions = [
            "Request applicant to submit original certified copy of Khasra Khatauni.",
            "Conduct routine Patwari field inspection to verify actual physical possession.",
        ]
    else:
        recommended_actions = [
            "All documents conform to statutory standards. Cleared for standard processing.",
        ]

    analysis_id = f"AI-ANALYSIS-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)

    analysis_record = {
        "analysis_id": analysis_id,
        "parcel_id": target_parcel_id,
        "documents": [
            {
                "document_id": d["document_id"],
                "file_name": d["file_name"],
                "document_type": d["document_type"],
                "extracted_fields": d["extracted_fields"],
                "file_size": d["file_size"],
            }
            for d in processed_docs
        ],
        "mismatches": mismatches,
        "risk_factors": risk_factors,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "summary": summary,
        "map_geometry": map_geometry,
        "ai_findings": ai_findings,
        "recommended_actions": recommended_actions,
        "created_at": now,
    }

    background_tasks.add_task(persist_analysis_to_db, analysis_record, processed_docs, target_parcel_id)
    return analysis_record


@router.post("/create-case")
async def create_case_from_analysis(payload: Dict[str, Any]):
    """
    Creates an official verification case in MongoDB from an AI analysis result.
    Updates parcel status, records timeline event, and returns created case details.
    """
    db = get_database()
    parcel_id = payload.get("parcel_id")
    if not parcel_id:
        raise HTTPException(status_code=400, detail="parcel_id is required to create a case.")

    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)

    title = payload.get("title") or f"Cadastral Verification Case - Parcel {parcel_id}"
    priority = payload.get("priority", "HIGH")
    assigned_to = payload.get("assigned_to") or "patwari"
    risk_level = payload.get("risk_level", "HIGH")
    mismatches = payload.get("mismatches", [])
    analysis_id = payload.get("analysis_id")

    description = payload.get("description")
    if not description:
        mismatch_summary = ", ".join([m.get("title", "") for m in mismatches[:3]]) if mismatches else "AI flagged risk"
        description = f"Automated case created by BHOOMI-SHIELD AI Engine. Detected discrepancies: {mismatch_summary}."

    case_dict = {
        "case_id": case_id,
        "parcel_id": parcel_id,
        "title": title,
        "description": description,
        "status": "OPEN",
        "priority": priority,
        "assigned_to": assigned_to,
        "risk_level": risk_level,
        "created_at": now,
        "updated_at": now,
        "metadata": {
            "source": "AI_ENGINE_AUTOMATION",
            "analysis_id": analysis_id,
            "mismatches_count": len(mismatches),
        }
    }

    await db.cases.insert_one(case_dict)

    # Update parcel status in DB
    await db.parcels.update_one(
        {"parcel_id": parcel_id},
        {"$set": {"status": "REQUIRES_VERIFICATION", "updated_at": now}}
    )

    # Record timeline event
    await db.parcel_events.insert_one({
        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
        "parcel_id": parcel_id,
        "event_type": "VERIFICATION_CASE_OPENED",
        "title": f"Case Registered: {title}",
        "description": f"Verification case {case_id} established from AI Document Engine findings.",
        "timestamp": now,
        "actor": "AI_ENGINE",
        "metadata": {"case_id": case_id, "priority": priority}
    })

    return {
        "success": True,
        "case_id": case_id,
        "message": f"Case '{case_id}' successfully established in Revenue Administration System.",
        "case": {
            "case_id": case_id,
            "parcel_id": parcel_id,
            "title": title,
            "status": "OPEN",
            "priority": priority,
            "assigned_to": assigned_to,
            "risk_level": risk_level,
            "created_at": now.isoformat(),
        }
    }


@router.get("/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Retrieves stored analysis results from MongoDB."""
    db = get_database()
    analysis = await db.ai_analyses.find_one({"analysis_id": analysis_id}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Analysis ID '{analysis_id}' not found.")
    return analysis
