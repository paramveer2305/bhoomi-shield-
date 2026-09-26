from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

class ExtractedDataSchema(BaseModel):
    owner_name: Optional[str] = None
    area: Optional[float] = None
    survey_number: Optional[str] = None
    document_date: Optional[str] = None
    seller_name: Optional[str] = None
    buyer_name: Optional[str] = None
    stamp_duty_paid: Optional[float] = None
    registration_number: Optional[str] = None

class DocumentCreate(BaseModel):
    parcel_id: str
    document_type: str = Field(..., description="e.g. SALE_DEED, MUTATION_RECORD, KHASRA_COPY, POWER_OF_ATTORNEY")
    file_name: str
    file_url: Optional[str] = None
    extracted_data: Optional[ExtractedDataSchema] = None

class DocumentResponse(BaseModel):
    document_id: str
    parcel_id: str
    document_type: str
    file_name: str
    file_url: Optional[str] = None
    extracted_data: Dict[str, Any] = {}
    upload_date: datetime
    verification_status: str = Field("PENDING_VERIFICATION", description="STATUS: PENDING_VERIFICATION, VERIFIED, DISCREPANCY_DETECTED")

    model_config = ConfigDict(from_attributes=True)
