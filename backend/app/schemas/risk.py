from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

class RiskReason(BaseModel):
    factor: str = Field(..., description="Risk factor code e.g. OWNER_MISMATCH, AREA_MISMATCH")
    impact: int = Field(..., description="Contribution to overall risk score (0-100)")
    description: Optional[str] = Field(None, description="Explainable description of potential inconsistency")

class RiskAnalyzeRequest(BaseModel):
    document_id: Optional[str] = Field(None, description="Optional document ID to compare against parcel records")
    extracted_data_override: Optional[Dict[str, Any]] = Field(None, description="Direct document extraction payload sent by AI engine")

class RiskAnalysisResponse(BaseModel):
    risk_id: str
    parcel_id: str
    score: int = Field(..., ge=0, le=100, description="Computed risk score from 0 (lowest) to 100 (highest)")
    level: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    trend: str = Field("STABLE", description="STABLE, INCREASING, DECREASING")
    reasons: List[RiskReason] = []
    recommended_actions: List[str] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
