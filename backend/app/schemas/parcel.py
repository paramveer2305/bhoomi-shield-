from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class ParcelBase(BaseModel):
    parcel_id: str = Field(..., description="Unique parcel identifier e.g. MP-BPL-1024")
    survey_number: str = Field(..., description="Survey/Khasra number e.g. 425/1")
    district: str = Field(..., description="District e.g. Bhopal")
    tehsil: str = Field(..., description="Tehsil e.g. Huzur")
    village: str = Field(..., description="Village e.g. Khajuri Kalan")
    owner_name: str = Field(..., description="Registered owner name")
    area: float = Field(..., description="Land area in acres or hectares")
    land_type: str = Field(..., description="Land classification e.g. Agricultural, Commercial, Residential")
    latitude: Optional[float] = Field(None, description="GPS latitude")
    longitude: Optional[float] = Field(None, description="GPS longitude")
    status: str = Field("VERIFIED", description="Current status: VERIFIED, REQUIRES_VERIFICATION, DISPUTED, IN_REVIEW")

class ParcelCreate(ParcelBase):
    pass

class ParcelUpdate(BaseModel):
    survey_number: Optional[str] = None
    district: Optional[str] = None
    tehsil: Optional[str] = None
    village: Optional[str] = None
    owner_name: Optional[str] = None
    area: Optional[float] = None
    land_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = None

class ParcelResponse(ParcelBase):
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ParcelEventResponse(BaseModel):
    event_id: str
    parcel_id: str
    event_type: str
    title: str
    description: str
    timestamp: datetime
    actor: str = "SYSTEM"
    metadata: Optional[dict] = None
