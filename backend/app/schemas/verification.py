from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class VerificationCreate(BaseModel):
    parcel_id: str
    case_id: Optional[str] = Field(None, description="Associated case ID if applicable")
    action_taken: str = Field(..., description="Action performed e.g. Physical On-site Inspection, Revenue Office Cross-Check")
    notes: str = Field(..., description="Explainable notes and observations during verification")
    status: str = Field("COMPLETED", description="Verification outcome e.g. COMPLETED, REJECTED, REQUIRES_FURTHER_INVESTIGATION")
    verified_by: Optional[str] = Field(None, description="Officer conducting verification")

class VerificationResponse(BaseModel):
    verification_id: str
    parcel_id: str
    case_id: Optional[str] = None
    action_taken: str
    notes: str
    verified_by: str
    status: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
