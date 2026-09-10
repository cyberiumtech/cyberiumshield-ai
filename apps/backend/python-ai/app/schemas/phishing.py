"""Pydantic schemas for phishing detection."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class URLScanRequest(BaseModel):
    """Request schema for URL scanning."""
    url: str = Field(..., description="URL to scan for phishing", min_length=10, max_length=2048)


class URLScanResponse(BaseModel):
    """Response schema for URL scanning."""
    model_config = ConfigDict(protected_namespaces=())

    url: str
    is_phishing: bool
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0-1)")
    score: int = Field(..., ge=0, le=100, description="Risk score (0-100)")
    risk_level: str = Field(..., description="Risk level: low, medium, high, critical")
    model_version: str
    features_analyzed: Optional[Dict[str, Any]] = None
    warnings: List[str] = Field(default_factory=list)
    scanned_at: Optional[str] = None


class EmailScanRequest(BaseModel):
    """Request schema for email scanning (future)."""
    subject: str
    body: str
    sender: str
    urls: List[str] = Field(default_factory=list)


class BatchScanRequest(BaseModel):
    """Request schema for batch URL scanning."""
    urls: List[str] = Field(..., max_length=100, description="List of URLs to scan (max 100)")
