from fastapi import APIRouter
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    logger.info("Health check requested")
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "service": settings.APP_NAME,
            "environment": settings.APP_ENV
        }
    )
