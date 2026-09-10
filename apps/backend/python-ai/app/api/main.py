from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

import logging
from app.core.config import settings
from app.core.logging import setup_logging
from app.api.routes import health, auth, users, phishing, integrations, storage

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Application factory for FastAPI."""

    app = FastAPI(
        title=settings.APP_NAME,
        debug=settings.DEBUG,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )

    # Rate limiting
    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(health.router, tags=["health"])
    app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["auth"])
    app.include_router(users.router, prefix=f"{settings.API_V1_PREFIX}/users", tags=["users"])
    app.include_router(phishing.router, prefix=f"{settings.API_V1_PREFIX}/phishing", tags=["phishing"])
    app.include_router(
        integrations.router,
        prefix=f"{settings.API_V1_PREFIX}/integrations",
        tags=["integrations"],
    )
    app.include_router(storage.router, prefix=f"{settings.API_V1_PREFIX}/storage", tags=["storage"])

    @app.on_event("startup")
    async def startup_event():
        logger.info(
            "Application starting",
            extra={
                "app_name": settings.APP_NAME,
                "environment": settings.APP_ENV,
                "debug": settings.DEBUG
            }
        )

    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info("Application shutting down")

    return app


app = create_app()
