from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status, BackgroundTasks
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import json
import io

from app.schemas.document import DocumentCreate, DocumentResponse
from app.database import get_database
from app.services.risk_engine import RiskEngineService
from app.services.notification import send_high_risk_alert, send_document_verification_notification

router = APIRouter(prefix="/documents", tags=["Documents"])

# OCR Processing
async def extract_text_from_file(file: UploadFile) -> str:
    """Extract text from uploaded file using OCR"""
    try:
        # Try to use pytesseract if available
        try:
            import pytesseract
            from PIL import Image
            import fitz  # PyMuPDF for PDF

            content = await file.read()
            await file.seek(0)  # Reset file pointer

            if file.content_type and file.content_type.startswith("image/"):
                image = Image.open(io.BytesIO(content))
                text = pytesseract.image_to_string(image)
                return text
            elif file.content_type == "application/pdf":
                doc = fitz.open(stream=content, filetype="pdf")
                text = ""
                for page in doc:
                    text += page.get_text()
                doc.close()
                return text
        except ImportError:
            pass

        # Fallback: return empty string (mock OCR)
        return ""
    except Exception as e:
        print(f"OCR extraction failed: {e}")
        return ""


def parse_extracted_text(text: str, document_type: str) -> dict:
    """
    Parse OCR extracted text to find key fields
    This is a simplified parser - in production, use NLP/ML models
    """
    extracted = {}
    text_lower = text.lower()

    # Common patterns for Indian land documents
    import re

    # Survey number patterns
    survey_patterns = [
        r'survey\s*no\.?\s*[:\-]?\s*([\d\/\-]+)',
        r'khasra\s*no\.?\s*[:\-]?\s*([\d\/\-]+)',
        r's\.?\s*no\.?\s*[:\-]?\s*([\d\/\-]+)',
    ]
    for pattern in survey_patterns:
        match = re.search(pattern, text_lower)
        if match:
            extracted["survey_number"] = match.group(1).strip()
            break

    # Area patterns
    area_patterns = [
        r'area\s*[:\-]?\s*([\d\.]+)\s*(hectare|acre|bigha|guntha|sq\.?\s*m|sq\.?\s*ft)',
        r'(\d+\.?\d*)\s*(hectare|acre|bigha|guntha|sq\.?\s*m|sq\.?\s*ft)',
    ]
    for pattern in area_patterns:
        match = re.search(pattern, text_lower)
        if match:
            extracted["area"] = float(match.group(1))
            extracted["area_unit"] = match.group(2)
            break

    # Owner/Buyer name patterns
    name_patterns = [
        r'buyer\s*[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        r'owner\s*[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        r'seller\s*[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
    ]
    for pattern in name_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            if "buyer" in pattern.lower():
                extracted["buyer_name"] = match.group(1).strip()
            elif "seller" in pattern.lower():
                extracted["seller_name"] = match.group(1).strip()
            else:
                extracted["owner_name"] = match.group(1).strip()

    # Date patterns
    date_pattern = r'\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}'
    dates = re.findall(date_pattern, text)
    if dates:
        extracted["document_date"] = dates[0]

    # Registration number
    reg_pattern = r'reg(?:istration)?\s*no\.?\s*[:\-]?\s*([A-Z0-9\/\-]+)'
    match = re.search(reg_pattern, text_lower)
    if match:
        extracted["registration_number"] = match.group(1).strip()

    return extracted


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    parcel_id: str = Form(...),
    document_type: str = Form(...),
    file_name: Optional[str] = Form(None),
    extracted_data_json: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    db = get_database()

    # Verify parcel exists
    parcel = await db.parcels.find_one({"parcel_id": parcel_id})
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Parcel ID '{parcel_id}' not found. Cannot attach document.")

    doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    final_file_name = file_name or (file.filename if file else f"{document_type.lower()}_{doc_id}.pdf")
    file_url = f"/static/uploads/{final_file_name}"

    extracted_data = {}

    # 1. Try OCR if file provided
    if file and file.size and file.size > 0:
        ocr_text = await extract_text_from_file(file)
        if ocr_text:
            ocr_extracted = parse_extracted_text(ocr_text, document_type)
            extracted_data.update(ocr_extracted)
            extracted_data["_ocr_raw"] = ocr_text[:500]  # Store first 500 chars for debugging

    # 2. Override with manually provided extracted data
    if extracted_data_json:
        try:
            manual_data = json.loads(extracted_data_json)
            extracted_data.update(manual_data)
        except Exception:
            extracted_data["raw_manual"] = extracted_data_json

    doc_dict = {
        "document_id": doc_id,
        "parcel_id": parcel_id,
        "document_type": document_type,
        "file_name": final_file_name,
        "file_url": file_url,
        "extracted_data": extracted_data,
        "upload_date": datetime.now(timezone.utc),
        "verification_status": "PENDING_VERIFICATION"
    }

    await db.documents.insert_one(doc_dict)

    # Record document upload event in parcel timeline
    event_dict = {
        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
        "parcel_id": parcel_id,
        "event_type": "DOCUMENT_UPLOADED",
        "title": f"Document Uploaded ({document_type})",
        "description": f"New document '{final_file_name}' uploaded for parcel {parcel_id}",
        "timestamp": datetime.now(timezone.utc),
        "actor": "USER",
        "metadata": {"document_id": doc_id, "document_type": document_type}
    }
    await db.parcel_events.insert_one(event_dict)

    # Trigger risk evaluation in background
    background_tasks.add_task(evaluate_and_notify_risk, parcel_id, doc_id)

    return doc_dict


async def evaluate_and_notify_risk(parcel_id: str, document_id: str):
    """Background task to evaluate risk and send notifications"""
    try:
        db = get_database()

        parcel = await db.parcels.find_one({"parcel_id": parcel_id})
        if not parcel:
            return

        # Get all documents for this parcel
        cursor = db.documents.find({"parcel_id": parcel_id})
        documents = await cursor.to_list(length=100)

        # Get historical events
        cursor = db.parcel_events.find({"parcel_id": parcel_id}).sort("timestamp", -1).limit(50)
        events = await cursor.to_list(length=50)

        # Evaluate risk
        risk_result = RiskEngineService.evaluate_risk(parcel, documents, events)

        # Update parcel risk level
        await db.parcels.update_one(
            {"parcel_id": parcel_id},
            {"$set": {
                "risk_level": risk_result["level"],
                "risk_score": risk_result["score"],
                "risk_reasons": risk_result["reasons"],
                "updated_at": datetime.now(timezone.utc)
            }}
        )

        # If HIGH or CRITICAL, create alert and notify
        if risk_result["level"] in ["HIGH", "CRITICAL"]:
            alert_id = f"ALT-{uuid.uuid4().hex[:8].upper()}"
            now = datetime.now(timezone.utc)

            alert_dict = {
                "alert_id": alert_id,
                "parcel_id": parcel_id,
                "severity": risk_result["level"],
                "title": f"Risk Level Escalated to {risk_result['level']}",
                "message": f"Automated risk assessment detected {risk_result['level'].lower()} risk for parcel {parcel_id}. Reasons: {', '.join([r['factor'] for r in risk_result['reasons']])}",
                "status": "ACTIVE",
                "created_at": now,
                "updated_at": now
            }

            await db.alerts.insert_one(alert_dict)

            # Send notification to parcel owner (if phone available)
            citizen_phone = parcel.get("owner_phone") or parcel.get("phone")
            if citizen_phone:
                await send_high_risk_alert(parcel, alert_dict, citizen_phone)

        # Log audit event
        await db.audit_logs.insert_one({
            "log_id": f"LOG-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-RISK",
            "timestamp": datetime.utcnow(),
            "actor_id": "AI_ENGINE",
            "actor_name": "BHOOMI-SHIELD AI Engine",
            "actor_role": "system",
            "action": "RISK_EVALUATION",
            "resource_type": "parcel",
            "resource_id": parcel_id,
            "details": {
                "document_id": document_id,
                "risk_level": risk_result["level"],
                "risk_score": risk_result["score"],
                "reasons": risk_result["reasons"]
            }
        })

    except Exception as e:
        print(f"Risk evaluation failed: {e}")

@router.post("/register-json", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def register_document_json(doc_in: DocumentCreate):
    """Direct JSON integration endpoint for AI / OCR service to submit extracted document data"""
    db = get_database()
    parcel = await db.parcels.find_one({"parcel_id": doc_in.parcel_id})
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Parcel ID '{doc_in.parcel_id}' not found.")

    doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    extracted = doc_in.extracted_data.model_dump() if doc_in.extracted_data else {}

    doc_dict = {
        "document_id": doc_id,
        "parcel_id": doc_in.parcel_id,
        "document_type": doc_in.document_type,
        "file_name": doc_in.file_name,
        "file_url": doc_in.file_url or f"/static/uploads/{doc_in.file_name}",
        "extracted_data": extracted,
        "upload_date": datetime.now(timezone.utc),
        "verification_status": "PENDING_VERIFICATION"
    }

    await db.documents.insert_one(doc_dict)

    # Record event
    event_dict = {
        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
        "parcel_id": doc_in.parcel_id,
        "event_type": "DOCUMENT_UPLOADED",
        "title": f"Document Processed ({doc_in.document_type})",
        "description": f"AI extraction metadata registered for document '{doc_in.file_name}'",
        "timestamp": datetime.now(timezone.utc),
        "actor": "AI_ENGINE",
        "metadata": {"document_id": doc_id}
    }
    await db.parcel_events.insert_one(event_dict)

    return doc_dict

@router.get("/{parcel_id}", response_model=List[DocumentResponse])
async def get_documents_by_parcel(parcel_id: str):
    db = get_database()
    cursor = db.documents.find({"parcel_id": parcel_id}).sort("upload_date", -1)
    documents = await cursor.to_list(length=100)
    return documents
