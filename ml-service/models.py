"""
Pydantic models for API request/response validation
"""
from pydantic import BaseModel, Field, UUID4
from typing import List, Optional, Literal
from datetime import datetime


class PredictRequest(BaseModel):
    """Request model for /predict endpoint"""
    tenant_id: UUID4 = Field(..., description="Tenant UUID")
    vehicle_ids: Optional[List[UUID4]] = Field(
        None, 
        description="Optional list of vehicle UUIDs. If not provided, predicts for all tenant vehicles"
    )


class PredictResponse(BaseModel):
    """Response model for /predict endpoint"""
    success: bool
    predictions_count: int
    alerts_generated: int
    execution_time_seconds: float
    message: str


class TrainRequest(BaseModel):
    """Request model for /train endpoint"""
    tenant_id: UUID4 = Field(..., description="Tenant UUID")
    component_category: Optional[str] = Field(
        None,
        description="Optional component category to train. If not provided, trains all categories"
    )


class TrainResponse(BaseModel):
    """Response model for /train endpoint"""
    success: bool
    models_trained: List[str]
    execution_time_seconds: float
    metrics: dict
    message: str


class HealthResponse(BaseModel):
    """Response model for /health endpoint"""
    status: Literal["healthy", "unhealthy"]
    timestamp: datetime
    database_connected: bool
    models_loaded: bool
    version: str
    details: Optional[dict] = None


class PredictionResult(BaseModel):
    """Individual prediction result"""
    component_id: UUID4
    vehicle_id: UUID4
    component_type: str
    failure_probability: float = Field(..., ge=0.0, le=1.0)
    risk_score: Literal["low", "medium", "high", "critical"]
    remaining_useful_life_days: Optional[int] = None
    remaining_useful_life_km: Optional[int] = None
    recommended_action: Optional[str] = None
    model_version: str


class FleetHealthResponse(BaseModel):
    """Response model for fleet health score endpoint"""
    fleet_health_score: Optional[float] = Field(
        None,
        description="Overall fleet health score (0-100)",
        ge=0.0,
        le=100.0
    )
    health_category: str = Field(
        ...,
        description="Health category: excellent, good, fair, poor, critical, or unknown"
    )
    total_components: int = Field(..., description="Total components tracked")
    risk_breakdown: dict = Field(..., description="Breakdown by risk level")
    avg_failure_probability: Optional[float] = Field(
        None,
        description="Average failure probability across all components"
    )
    avg_remaining_useful_life_days: Optional[int] = Field(
        None,
        description="Average remaining useful life in days"
    )
    vehicle_breakdown: Optional[List[dict]] = Field(
        None,
        description="Per-vehicle health breakdown"
    )
    message: str = Field(..., description="Human-readable status message")

