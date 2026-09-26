from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class CaseCreate(BaseModel):
    parcel_id: str
    title: str
    description: Optional[str] = None
    priority: str = Field("MEDIUM", description="Priority: LOW, MEDIUM, HIGH, URGENT")
    assigned_to: Optional[str] = Field(None, description="Officer username assigned to case")

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = Field(None, description="Status: OPEN, IN_PROGRESS, RESOLVED, CLOSED")
    priority: Optional[str] = None
    assigned_to: Optional[str] = None

class CaseResponse(BaseModel):
    case_id: str
    parcel_id: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    assigned_to: Optional[str] = None
    risk_level: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
