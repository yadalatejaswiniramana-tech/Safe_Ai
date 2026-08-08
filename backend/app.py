import os
import json
from flask import Flask
from backend.config import get_db
from backend.routes import main_bp
from backend.models import HotspotModel

def create_app():
    # Since app.py is in backend/, templates and static are one directory up
    app = Flask(
        __name__, 
        template_folder=os.path.abspath(os.path.join(os.path.dirname(__file__), '../templates')),
        static_folder=os.path.abspath(os.path.join(os.path.dirname(__file__), '../static'))
    )
    
    # Secure secret key for sessions
    app.secret_key = os.getenv("SECRET_KEY", "safezone-ultra-secure-key-987654321")
    
    # Register blueprints
    app.register_blueprint(main_bp)
    
    # Auto-seed the database with crime hotspots if none exist
    with app.app_context():
        seed_database()

    return app

def seed_database():
    try:
        db = get_db()
        # Check if hotspots already exist
        if db.hotspots.find_one():
            print("Database already has crime hotspots seeded.")
            return

        # Seed data
        print("No crime hotspots found. Seeding database with initial hotspot data...")
        seed_file = os.path.abspath(os.path.join(os.path.dirname(__file__), '../database/sample_data.json'))
        
        hotspots_to_seed = []
        if os.path.exists(seed_file):
            try:
                with open(seed_file, 'r') as f:
                    data = json.load(f)
                    hotspots_to_seed = data.get("hotspots", [])
                print(f"Loaded {len(hotspots_to_seed)} hotspots from database/sample_data.json")
            except Exception as e:
                print(f"Failed to read sample_data.json: {e}")
        
        # If file was missing or empty, use fallback data
        if not hotspots_to_seed:
            print("Using default fallback hotspot data for seeding...")
            hotspots_to_seed = [
                {
                    "name": "Central Metro Station Area",
                    "lat": 28.6139,
                    "lng": 77.2090,
                    "risk_level": "high",
                    "description": "High pocket-picking and low-lighting reported near gate 3."
                },
                {
                    "name": "Sector 4 Market Alleyways",
                    "lat": 28.6200,
                    "lng": 77.2200,
                    "risk_level": "medium",
                    "description": "Bag snatching incidents in dark alleys after 9 PM."
                },
                {
                    "name": "North Transit Hub Park",
                    "lat": 28.6050,
                    "lng": 77.1950,
                    "risk_level": "high",
                    "description": "Multiple reports of harassment in late evening hours."
                },
                {
                    "name": "West Cyber City Gate 2",
                    "lat": 28.5900,
                    "lng": 77.2100,
                    "risk_level": "low",
                    "description": "Minor theft reports, heavily guarded but isolated near boundary."
                },
                {
                    "name": "Eastern Overpass",
                    "lat": 28.6250,
                    "lng": 77.2000,
                    "risk_level": "medium",
                    "description": "Isolated walkway under bridge. Limited CCTV coverage."
                }
            ]

        for hs in hotspots_to_seed:
            HotspotModel.create_hotspot(
                db=db,
                name=hs.get("name"),
                lat=hs.get("lat"),
                lng=hs.get("lng"),
                risk_level=hs.get("risk_level"),
                description=hs.get("description", "")
            )
        print("Database seeding completed.")
    except Exception as e:
        print(f"Non-fatal error during database seed: {e}")

if __name__ == '__main__':
    app = create_app()
    # Bind to all interfaces (0.0.0.0) so it's accessible externally if needed
    # Run on port 8000 by default (avoids AirPlay conflicts on macOS)
    app.run(host='0.0.0.0', port=8000, debug=True)
