import bcrypt
from datetime import datetime
from backend.config import get_db

def parse_id(user_id):
    try:
        from bson.objectid import ObjectId
        if isinstance(user_id, str) and len(user_id) == 24:
            return ObjectId(user_id)
    except Exception:
        pass
    return user_id

class UserModel:
    @staticmethod
    def create_user(db, username, email, phone, password):
        # Hash the password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user_data = {
            "username": username,
            "email": email,
            "phone": phone,
            "password_hash": hashed_password,
            "pin_hash": None,
            "emergency_contacts": [],
            "current_location": None,
            "location_history": [],
            "created_at": datetime.utcnow().isoformat()
        }
        db.users.insert_one(user_data)
        return user_data

    @staticmethod
    def get_user_by_username(db, username):
        return db.users.find_one({"username": username})

    @staticmethod
    def get_user_by_id(db, user_id):
        return db.users.find_one({"_id": parse_id(user_id)})

    @staticmethod
    def verify_password(stored_hash, password):
        if not stored_hash:
            return False
        return bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))

    @staticmethod
    def set_pin(db, user_id, pin):
        # Hash the 4-digit PIN
        hashed_pin = bcrypt.hashpw(pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        db.users.update_one(
            {"_id": parse_id(user_id)},
            {"$set": {"pin_hash": hashed_pin}}
        )
        return True

    @staticmethod
    def verify_pin(db, user_id, pin):
        user = UserModel.get_user_by_id(db, user_id)
        if not user or not user.get("pin_hash"):
            return False
        return bcrypt.checkpw(pin.encode('utf-8'), user["pin_hash"].encode('utf-8'))

    @staticmethod
    def update_contacts(db, user_id, contacts):
        # contacts is a list of {"name": "...", "phone": "..."}
        db.users.update_one(
            {"_id": parse_id(user_id)},
            {"$set": {"emergency_contacts": contacts}}
        )
        return True

    @staticmethod
    def update_location(db, user_id, lat, lng):
        timestamp = datetime.utcnow().isoformat()
        loc_data = {"lat": lat, "lng": lng, "timestamp": timestamp}
        db.users.update_one(
            {"_id": parse_id(user_id)},
            {
                "$set": {"current_location": loc_data},
                "$push": {"location_history": loc_data}
            }
        )
        return loc_data

class HotspotModel:
    @staticmethod
    def create_hotspot(db, name, lat, lng, risk_level, description=""):
        hotspot_data = {
            "name": name,
            "lat": lat,
            "lng": lng,
            "risk_level": risk_level.lower(),  # 'high', 'medium', 'low'
            "description": description,
            "created_at": datetime.utcnow().isoformat()
        }
        db.hotspots.insert_one(hotspot_data)
        return hotspot_data

    @staticmethod
    def get_all_hotspots(db):
        return db.hotspots.find()

class AlertModel:
    @staticmethod
    def create_alert(db, user_id, username, lat, lng, message="SOS Emergency Alert"):
        timestamp = datetime.utcnow().isoformat()
        alert_data = {
            "user_id": user_id,
            "username": username,
            "lat": lat,
            "lng": lng,
            "message": message,
            "timestamp": timestamp,
            "status": "active"
        }
        db.alerts.insert_one(alert_data)
        return alert_data

    @staticmethod
    def get_alerts_by_user(db, user_id):
        return db.alerts.find({"user_id": user_id})
