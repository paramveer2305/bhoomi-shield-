from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class AlertCreate(BaseModel):
    parcel_id: str
    severity: str = Field("MEDIUM", description="Severity: LOW, MEDIUM, HIGH, CRITICAL")
    title: str
    message: str

class AlertUpdate(BaseModel):
    status: Optional[str] = Field(None, description="Status: ACTIVE, ACKNOWLEDGED, RESOLVED")

class AlertResponse(BaseModel):
    alert_id: str
    parcel_id: str
    severity: str
    title: str
    message: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
