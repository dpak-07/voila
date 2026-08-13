from pymongo import MongoClient

from .settings import settings


client = MongoClient(settings.mongo_uri)

db = client[settings.mongo_db]


def get_mongo_collection(collection_name: str):
    return db[collection_name]


users_collection = get_mongo_collection("users")