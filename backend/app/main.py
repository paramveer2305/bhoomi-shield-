from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection, get_database
from app.middleware.error_handler import (
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from app.routes import health, auth, parcels, documents, risk, alerts, cases, verification
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bhoomi_shield.main")

async def seed_demo_data():
    """Seeds synthetic demonstration land records on first startup if DB is empty"""
    db = get_database()
    count = await db.parcels.count_documents({})
    if count > 0:
        return

    logger.info("Seeding synthetic demonstration parcels data...")
    demo_parcels = [
        {
            "parcel_id": "MP-BPL-1024",
            "survey_number": "425/1",
            "district": "Bhopal",
            "tehsil": "Huzur",
            "village": "Khajuri Kalan",
            "owner_name": "Ramesh Kumar Sharma",
            "area": 2.5,
            "land_type": "Agricultural",
            "latitude": 23.2599,
            "longitude": 77.4126,
            "status": "VERIFIED",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "parcel_id": "MP-IND-2048",
            "survey_number": "108/3B",
            "district": "Indore",
            "tehsil": "Sanwer",
            "village": "Manglia",
            "owner_name": "Sunita Verma",
            "area": 1.8,
            "land_type": "Residential",
            "latitude": 22.7196,
            "longitude": 75.8577,
            "status": "REQUIRES_VERIFICATION",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "parcel_id": "MP-JBP-3096",
            "survey_number": "78/2",
            "district": "Jabalpur",
            "tehsil": "Sihanora",
            "village": "Barela",
            "owner_name": "Vikram Singh Patel",
            "area": 4.2,
            "land_type": "Agricultural",
            "latitude": 23.1815,
            "longitude": 79.9864,
            "status": "VERIFIED",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    await db.parcels.insert_many(demo_parcels)

    # Initial timeline events
    for p in demo_parcels:
        await db.parcel_events.insert_one({
            "event_id": f"EVT-SEED-{p['parcel_id']}",
            "parcel_id": p["parcel_id"],
            "event_type": "INITIAL_RECORD_CREATED",
            "title": "Initial Cadastral Record Registered",
            "description": f"Synthetic parcel record created for demonstration under survey {p['survey_number']}",
            "timestamp": datetime.utcnow(),
            "actor": "SYSTEM_SEEDER",
            "metadata": {"owner": p["owner_name"]}
        })

    logger.info("Demo data seeding completed.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    await seed_demo_data()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="BHOOMI-SHIELD: AI-Powered Land Dispute Early Warning & Risk Intelligence System Backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Include Routers
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(parcels.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(risk.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(cases.router, prefix=settings.API_V1_STR)
app.include_router(verification.router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "title": settings.PROJECT_NAME,
        "status": "Online",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }
