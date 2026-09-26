import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger("bhoomi_shield.database")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}")
    db_instance.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_instance.db = db_instance.client[settings.DATABASE_NAME]
    
    # Initialize indexes
    db = db_instance.db
    await db.users.create_index("username", unique=True)
    await db.users.create_index("email", unique=True)
    await db.parcels.create_index("parcel_id", unique=True)
    await db.documents.create_index("document_id", unique=True)
    await db.documents.create_index("parcel_id")
    await db.parcel_events.create_index("parcel_id")
    await db.risk_analysis.create_index("parcel_id")
    await db.alerts.create_index("alert_id", unique=True)
    await db.alerts.create_index("parcel_id")
    await db.cases.create_index("case_id", unique=True)
    await db.cases.create_index("parcel_id")
    await db.verification_records.create_index("verification_id", unique=True)
    await db.verification_records.create_index("parcel_id")
    await db.verification_records.create_index("case_id")
    logger.info("MongoDB indexes created successfully.")

async def close_mongo_connection():
    if db_instance.client:
        logger.info("Closing MongoDB connection.")
        db_instance.client.close()

def get_database():
    return db_instance.db
