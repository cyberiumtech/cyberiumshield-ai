"""
Phishing detection API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.db.session import get_db
from app.api.dependencies.auth import get_current_user, require_permission
from app.db.models import User
from app.schemas.phishing import URLScanRequest, URLScanResponse
from app.services.phishing_service import phishing_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/scan-url", response_model=URLScanResponse)
async def scan_url(
    request: URLScanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Scan a URL for phishing indicators using trained ML model.

    Requires authentication.

    Returns:
        - is_phishing: Whether URL is likely phishing
        - confidence: Model confidence (0-1)
        - score: Risk score (0-100)
        - risk_level: low, medium, high, or critical
        - warnings: List of specific issues found
    """
    try:
        logger.info(f"Scanning URL for user {current_user.username}: {request.url}")

        # Scan URL
        result = phishing_service.scan_url(request.url)

        # Add metadata
        result['url'] = request.url
        result['scanned_at'] = datetime.utcnow().isoformat()

        logger.info(
            f"Scan complete: {request.url} -> "
            f"{'PHISHING' if result['is_phishing'] else 'SAFE'} "
            f"(confidence: {result['confidence']:.2f})"
        )

        return URLScanResponse(**result)

    except Exception as e:
        logger.error(f"Error scanning URL {request.url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error scanning URL: {str(e)}"
        )


@router.post("/scan-url/public", response_model=URLScanResponse)
async def scan_url_public(request: URLScanRequest):
    """
    Public URL scanner (no authentication required).

    Useful for testing or embedded widgets.
    Consider adding rate limiting per IP in production.
    """
    try:
        logger.info(f"Public scan request: {request.url}")

        result = phishing_service.scan_url(request.url)
        result['url'] = request.url
        result['scanned_at'] = datetime.utcnow().isoformat()

        return URLScanResponse(**result)

    except Exception as e:
        logger.error(f"Error in public scan {request.url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error scanning URL"
        )


@router.get("/model-info")
async def get_model_info():
    """
    Get information about the loaded phishing detection model.

    Public endpoint.
    """
    if phishing_service.model_package is None:
        return {
            'status': 'Model not loaded',
            'fallback_active': True
        }

    return {
        'status': 'Model loaded',
        'model_type': phishing_service.model_type,
        'version': phishing_service.model_package['version'],
        'trained_at': phishing_service.model_package.get('trained_at'),
        'metrics': phishing_service.model_package.get('metrics'),
        'feature_count': len(phishing_service.feature_extractor.get_feature_names())
    }


@router.post("/scan-url/analyze", response_model=dict)
async def analyze_url(
    request: URLScanRequest,
    current_user: User = Depends(require_permission('analyze:threats'))
):
    """
    Detailed analysis of URL with feature breakdown.

    Requires 'analyze:threats' permission (analyst or admin).

    Returns full feature extraction details for security analysis.
    """
    try:
        # Get basic scan result
        result = phishing_service.scan_url(request.url)

        # Add detailed feature extraction
        features = phishing_service.feature_extractor.extract_features(request.url)

        return {
            **result,
            'url': request.url,
            'detailed_features': features,
            'scanned_at': datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error analyzing URL {request.url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error analyzing URL"
        )
