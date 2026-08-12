from motor.motor_asyncio import AsyncIOMotorClient
from .settings import settings

client: AsyncIOMotorClient | None = None

def get_mongo_client() -> AsyncIOMotorClient:
    global client
    if client is None:
        client = AsyncIOMotorClient(settings.mongo_uri)
    return client


def get_mongo_db():
    return get_mongo_client()[settings.mongo_db]


def get_mongo_collection():
    return get_mongo_db()[settings.mongo_collection]
