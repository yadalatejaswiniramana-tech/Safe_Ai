import os
import json
import uuid
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = "safezone_db"
LOCAL_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../database/local_db.json"))

class MockCollection:
    def __init__(self, db_fallback, name):
        self.db = db_fallback
        self.name = name

    def _load_data(self):
        return self.db._load_data().get(self.name, [])

    def _save_data(self, data):
        all_data = self.db._load_data()
        all_data[self.name] = data
        self.db._save_data(all_data)

    def find_one(self, query):
        data = self._load_data()
        for doc in data:
            if self._matches(doc, query):
                return doc
        return None

    def find(self, query=None):
        query = query or {}
        data = self._load_data()
        results = []
        for doc in data:
            if self._matches(doc, query):
                results.append(doc)
        return results

    def insert_one(self, doc):
        data = self._load_data()
        if "_id" not in doc:
            doc["_id"] = str(uuid.uuid4())
        data.append(doc)
        self._save_data(data)
        
        class InsertOneResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertOneResult(doc["_id"])

    def update_one(self, query, update_op, upsert=False):
        data = self._load_data()
        matched_idx = -1
        for i, doc in enumerate(data):
            if self._matches(doc, query):
                matched_idx = i
                break
        
        if matched_idx == -1:
            if upsert:
                new_doc = query.copy()
                if "$set" in update_op:
                    new_doc.update(update_op["$set"])
                if "_id" not in new_doc:
                    new_doc["_id"] = str(uuid.uuid4())
                data.append(new_doc)
                self._save_data(data)
                
                class UpdateResult:
                    matched_count = 0
                    modified_count = 1
                    upserted_id = new_doc["_id"]
                return UpdateResult()
            else:
                class UpdateResult:
                    matched_count = 0
                    modified_count = 0
                    upserted_id = None
                return UpdateResult()

        doc = data[matched_idx]
        if "$set" in update_op:
            for k, v in update_op["$set"].items():
                if "." in k:
                    parts = k.split(".")
                    curr = doc
                    for part in parts[:-1]:
                        curr = curr.setdefault(part, {})
                    curr[parts[-1]] = v
                else:
                    doc[k] = v
        
        self._save_data(data)
        
        class UpdateResult:
            matched_count = 1
            modified_count = 1
            upserted_id = None
        return UpdateResult()

    def delete_one(self, query):
        data = self._load_data()
        for i, doc in enumerate(data):
            if self._matches(doc, query):
                data.pop(i)
                self._save_data(data)
                class DeleteResult:
                    deleted_count = 1
                return DeleteResult()
        class DeleteResult:
            deleted_count = 0
        return DeleteResult()

    def _matches(self, doc, query):
        for k, v in query.items():
            if k == "_id" and isinstance(v, dict) and "$in" in v:
                if doc.get(k) not in v["$in"]:
                    return False
                continue
            if doc.get(k) != v:
                return False
        return True

class JSONDatabaseFallback:
    def __init__(self, filepath):
        self.filepath = filepath
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        if not os.path.exists(filepath):
            with open(filepath, "w") as f:
                json.dump({}, f, indent=2)

    def _load_data(self):
        try:
            with open(self.filepath, "r") as f:
                return json.load(f)
        except Exception:
            return {}

    def _save_data(self, data):
        with open(self.filepath, "w") as f:
            json.dump(data, f, indent=2)

    def __getattr__(self, name):
        return MockCollection(self, name)

def get_db():
    try:
        # We set a low server selection timeout so it fails quickly if MongoDB isn't running
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        # Force a connection check
        client.admin.command('ping')
        print("Successfully connected to MongoDB.")
        return client[DB_NAME]
    except Exception as e:
        print(f"MongoDB connection failed: {e}. Falling back to local file-based JSON DB: {LOCAL_DB_PATH}")
        return JSONDatabaseFallback(LOCAL_DB_PATH)
