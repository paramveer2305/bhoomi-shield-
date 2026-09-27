import logging
import re
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger("bhoomi_shield.database")

class InMemoryCursor:
    def __init__(self, items):
        self.items = list(items)

    def sort(self, key_or_list, direction=None):
        if isinstance(key_or_list, list):
            for k, d in reversed(key_or_list):
                reverse = d < 0
                self.items.sort(key=lambda x: str(x.get(k, "")), reverse=reverse)
        elif isinstance(key_or_list, str):
            reverse = (direction or 1) < 0
            self.items.sort(key=lambda x: str(x.get(key_or_list, "")), reverse=reverse)
        return self

    def skip(self, n):
        self.items = self.items[n:]
        return self

    def limit(self, n):
        self.items = self.items[:n]
        return self

    def __aiter__(self):
        self._iter = iter(self.items)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration

    async def to_list(self, length=100):
        return self.items[:length]

class InMemoryCollection:
    def __init__(self, name):
        self.name = name
        self.docs = []

    async def create_index(self, keys, **kwargs):
        pass

    def _match(self, doc, filter_dict):
        if not filter_dict:
            return True
        for k, v in filter_dict.items():
            val = doc.get(k)
            if isinstance(v, dict):
                if "$regex" in v:
                    pat = v["$regex"]
                    flags = re.IGNORECASE if v.get("$options") == "i" else 0
                    if not val or not re.search(pat, str(val), flags):
                        return False
                if "$in" in v and val not in v["$in"]:
                    return False
                if "$ne" in v and val == v["$ne"]:
                    return False
            else:
                if val != v:
                    return False
        return True

    async def count_documents(self, filter_dict):
        return sum(1 for d in self.docs if self._match(d, filter_dict))

    async def find_one(self, filter_dict):
        for d in self.docs:
            if self._match(d, filter_dict):
                return dict(d)
        return None

    def find(self, filter_dict=None, skip=0, limit=0):
        matching = [dict(d) for d in self.docs if self._match(d, filter_dict)]
        cursor = InMemoryCursor(matching)
        if skip:
            cursor.skip(skip)
        if limit:
            cursor.limit(limit)
        return cursor

    async def insert_one(self, document):
        doc = dict(document)
        self.docs.append(doc)
        return type('InsertOneResult', (), {'inserted_id': doc.get('_id', str(len(self.docs)))})()

    async def insert_many(self, documents):
        for d in documents:
            doc = dict(d)
            self.docs.append(doc)
        return type('InsertManyResult', (), {'inserted_ids': [d.get('_id', str(i)) for i, d in enumerate(documents)]})()

    async def update_one(self, filter_dict, update_dict):
        for d in self.docs:
            if self._match(d, filter_dict):
                if "$set" in update_dict:
                    d.update(update_dict["$set"])
                return type('UpdateResult', (), {'modified_count': 1})()
        return type('UpdateResult', (), {'modified_count': 0})()

class InMemoryDatabase:
    def __init__(self):
        self._collections = {}

    def __getattr__(self, name):
        if name not in self._collections:
            self._collections[name] = InMemoryCollection(name)
        return self._collections[name]

    def __getitem__(self, name):
        return self.__getattr__(name)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}")
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=2000)
        # Test connection with ping
        await client.admin.command('ping')
        db_instance.client = client
        db_instance.db = client[settings.DATABASE_NAME]
        logger.info("Successfully connected to real MongoDB instance.")
    except Exception as e:
        logger.warning(f"Could not connect to MongoDB ({e}). Switching to high-performance In-Memory Database fallback.")
        db_instance.client = None
        db_instance.db = InMemoryDatabase()

    # Initialize indexes
    db = db_instance.db
    try:
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
        await db.evidence.create_index("evidence_id", unique=True)
        await db.evidence.create_index("case_id")
        await db.evidence.create_index("parcel_id")
        logger.info("Database initialized successfully.")
    except Exception as idx_err:
        logger.warning(f"Index creation warning: {idx_err}")

async def close_mongo_connection():
    if db_instance.client:
        logger.info("Closing MongoDB connection.")
        db_instance.client.close()

def get_database():
    return db_instance.db
