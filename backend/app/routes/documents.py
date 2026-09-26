from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import json

from app.schemas.document import DocumentCreate, DocumentResponse
from app.database import get_database

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    parcel_id: str = Form(...),
    document_type: str = Form(...),
    file_name: Optional[str] = Form(None),
    extracted_data_json: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
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
    if extracted_data_json:
        try:
            extracted_data = json.loads(extracted_data_json)
        except Exception:
            extracted_data = {"raw": extracted_data_json}

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

    return doc_dict

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
