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

class CaseResolve(BaseModel):
    status: str = Field("RESOLVED", description="Resolution status: RESOLVED or CLOSED")
    closing_notes: str = Field(..., description="Official closing notes/justification")
    legal_remarks: Optional[str] = Field(None, description="Legal or statutory remarks")
    resolved_by: Optional[str] = Field(None, description="Resolving officer identifier")

class CaseResponse(BaseModel):
    case_id: str
    parcel_id: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    assigned_to: Optional[str] = None
    risk_level: Optional[str] = None
    closing_notes: Optional[str] = None
    legal_remarks: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
