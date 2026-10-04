"""FastAPI entry point for SmartBite Intelligent Kitchen Inventory & Waste Reducer."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.database import init_db
from app.jobs.expiry_checker import start_expiry_scheduler, shutdown_expiry_scheduler
from app.api.items import router as items_router
from app.api.parsing import router as parsing_router
from app.api.recipes import router as recipes_router
from app.api.notifications import router as notifications_router
from app.api.analytics import router as analytics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database schema & background scheduler
    init_db()
    start_expiry_scheduler(interval_minutes=settings.CHECKER_INTERVAL_MINUTES)
    yield
    # Shutdown: Stop scheduler
    shutdown_expiry_scheduler()


app = FastAPI(
    title="SmartBite API",
    description=(
        "Production backend for SmartBite – Intelligent Kitchen Inventory & Waste Reducer.\n\n"
        "Features:\n"
        "- Supabase Auth integration with strict user data isolation\n"
        "- Server-side dynamic food freshness and expiry tracking\n"
        "- Quick natural-language item parser with shelf-life intelligence\n"
        "- Receipt OCR and speech-to-text voice ingestion\n"
        "- Idempotent background expiry alert notifications\n"
        "- Zero-waste culinary recipe generator prioritizing expiring ingredients\n"
        "- Waste prevention impact and dashboard analytics"
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers for structured error responses
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "detail": exc.errors(),
            "status_code": 422
        }
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred. Please try again.",
            "status_code": 500
        }
    )


# Root Health & Info
@app.get("/", tags=["Health"])
def root_info():
    return {
        "app": "SmartBite Backend",
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs",
        "environment": settings.ENVIRONMENT
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}


# Mount Routers under /api
app.include_router(items_router, prefix="/api")
app.include_router(parsing_router, prefix="/api")
app.include_router(recipes_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
