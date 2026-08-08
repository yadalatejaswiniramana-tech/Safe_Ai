// MongoDB Setup Script for SafeZone
// Run: mongosh safezone_db database/mongodb_setup.js

db = db.getSiblingDB("safezone_db");

// Drop collections if they exist to start clean (optional)
// db.users.drop();
// db.hotspots.drop();
// db.alerts.drop();

// Create indexes
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 });
db.alerts.createIndex({ "user_id": 1 });
db.hotspots.createIndex({ "lat": 1, "lng": 1 });

// Seed crime hotspots
var sampleHotspots = [
  {
    "name": "GB Road Area",
    "lat": 28.6415,
    "lng": 77.2244,
    "risk_level": "high",
    "description": "High crime rate, poorly lit alleyways, and numerous theft and harassment incidents.",
    "created_at": new Date().toISOString()
  },
  {
    "name": "Paharganj Alleys",
    "lat": 28.6432,
    "lng": 77.2148,
    "risk_level": "medium",
    "description": "Crowded narrow streets, frequent pocket-picking, and low evening surveillance.",
    "created_at": new Date().toISOString()
  },
  {
    "name": "Old Delhi Station West",
    "lat": 28.6560,
    "lng": 77.2280,
    "risk_level": "high",
    "description": "Severe crowding, reported chain snatching, and high rate of night-time minor assaults.",
    "created_at": new Date().toISOString()
  },
  {
    "name": "Karol Bagh Market Backlanes",
    "lat": 28.6450,
    "lng": 77.1900,
    "risk_level": "medium",
    "description": "Isolated parking lots and low light intensity on secondary market alleys.",
    "created_at": new Date().toISOString()
  },
  {
    "name": "Connaught Place Inner Circle",
    "lat": 28.6304,
    "lng": 77.2177,
    "risk_level": "low",
    "description": "Generally secure, but isolated pedestrian subways at late hours are caution zones.",
    "created_at": new Date().toISOString()
  },
  {
    "name": "India Gate Radial Roads",
    "lat": 28.6129,
    "lng": 77.2295,
    "risk_level": "low",
    "description": "Well-guarded tourist spot, caution recommended only in unlit peripheral lawn areas.",
    "created_at": new Date().toISOString()
  }
];

print("Seeding crime hotspots...");
db.hotspots.deleteMany({}); // Clean existing
db.hotspots.insertMany(sampleHotspots);
print("Successfully seeded " + db.hotspots.countDocuments() + " hotspots.");
print("Setup complete.");
