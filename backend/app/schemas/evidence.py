from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

class EvidenceCreate(BaseModel):
    parcel_id: str = Field(..., description="ID of associated parcel, e.g. MP-BPL-1024")
    case_id: str = Field(..., description="ID of associated verification case, e.g. CASE-XXXX")
    evidence_type: str = Field(..., description="SITE_PHOTO, BOUNDARY_MEASUREMENT, WITNESS_RECORD")
    file_url: Optional[str] = Field(None, description="Path or URL to uploaded photo or document")
    geo_coordinates: Optional[Dict[str, Any]] = Field(None, description="GPS coordinates: latitude and longitude")
    uploaded_by: Optional[str] = Field("FIELD_PATWARI", description="Username or role of uploader")
    notes: Optional[str] = Field(None, description="Field notes and observations")

class EvidenceResponse(BaseModel):
    evidence_id: str
    parcel_id: str
    case_id: str
    evidence_type: str
    file_url: Optional[str] = None
    geo_coordinates: Optional[Dict[str, Any]] = None
    uploaded_by: str
    notes: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
