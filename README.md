# SafeZone - Women Safety Application

> 🌐 **Live Website:** [https://safezone-app.onrender.com](https://safezone-app.onrender.com)

SafeZone is a web-based safety application designed to enhance personal security by providing real-time location tracking, crime hotspot visualization, and emergency assistance (SOS).

Built with **Flask** (backend), **MongoDB / Local JSON DB** (database layer), and **Leaflet.js + CartoDB Dark Matter** (interactive mapping system), SafeZone provides a seamless, premium glassmorphism dark-themed portal for navigation safety.

---

## Key Features

1. **Dual-Auth PIN Security**
   - Credentials entry is protected by a secondary 4-digit lock screen passcode.
   - Restricts sensitive resources (safety logs, maps, contact list changes) behind secure passcode validations.
   
2. **Interactive Risk Zoning & GPS Simulation**
   - Leverages Leaflet.js with CartoDB dark tiling to overlays color-coded hotspots (Red: High risk, Amber: Moderate, Cyan: Low).
   - Dynamic Haversine distance calculations trigger alerts and slide-down banners in real-time.
   - Built-in location simulator allows teleporting coordinates or using a slider to walk towards hotspots to inspect alert triggers.
   
3. **Safe Route Recommendations**
   - Draw navigation path polylines bypass high-risk zones, highlighting route safety scores.
   
4. **Panic Command (SOS Alert)**
   - Cancelable 5-second countdown timer to avoid accidental triggers.
   - Asynchronously updates location coordinates on dispatch, mocking SMS outputs in console reports.
   - Triggers Web Audio API synthesizers to sound high-frequency local siren alarms on your device.

---

## Tech Stack

- **Backend:** Python (Flask), PyMongo, BCrypt (Hashing), PyJWT
- **Frontend:** Vanilla HTML5, CSS3 (Glassmorphism design tokens), Javascript (ES6)
- **Map engine:** Leaflet.js & OpenStreetMap (CartoDB Dark Matter Tiles)
- **Database:** MongoDB (with an automatic file-based `database/local_db.json` fallback if a live server is not running)

---

## Installation & Setup

### 1. Clone the Project Workspace
Ensure you are in the project folder containing the files:
```bash
cd SAFE.AI
```

### 2. Configure Python Environment
Initialize and start a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
Install packages listed in `requirements.txt`:
```bash
pip install -r requirements.txt
```

### 4. Database Setup (Optional)
SafeZone operates on a local file database (`database/local_db.json`) if MongoDB is unavailable. 

If you prefer using MongoDB:
- Ensure MongoDB is running locally (`brew services start mongodb-community` on macOS).
- Seed the DB: `mongosh safezone_db database/mongodb_setup.js`.

### 5. Launch the Server
Start the Flask application:
```bash
python backend/app.py
```

The application will be running locally at **`http://localhost:5000`**.

---

## Project Structure

```text
SAFE.AI/
├── backend/
│   ├── app.py                 # Main entrypoint (auto-seeding, Flask initialization)
│   ├── config.py              # MongoDB connection & local JSON DB fallback
│   ├── routes.py              # Web views and JSON REST API blueprints
│   ├── models.py              # Database transactions and password hashing
│   ├── utils.py               # Haversine distance, decorators, safety index calculations
│   └── requirements.txt       # Dependencies manifest
├── database/
│   ├── mongodb_setup.js       # Shell scripting for index structures
│   └── sample_data.json       # Preconfigured hotspot incident coordinates
├── static/
│   ├── css/
│   │   ├── style.css          # Core layout guidelines (Dark theme variables)
│   │   ├── home.css           # Landing aesthetics & radar keyframes
│   │   ├── register.css       # Forms validation & pin keypad styles
│   │   ├── login.css          # Injected register styles
│   │   ├── set_pin.css        # Passcode creator panel
│   │   ├── verify.css         # Passcode verification keypad
│   │   └── map.css            # Navigation side panel & Leaflet styling
│   └── js/
│       ├── register.js        # Registration forms controller
│       ├── login.js           # Verification credential submissions
│       ├── set_pin.js         # Passcode keypad triggers
│       ├── verify.js          # Unlock code validation
│       ├── location.js        # Geolocation APIs & dashboard indicators
│       ├── map.js             # Leaflet rendering & path algorithms
│       └── sos.js             # Timer dispatches & Web Audio synthesizer
├── templates/
│   ├── base.html              # HTML core skeleton (navbar, flashing nodes)
│   ├── index.html             # Landing page
│   ├── register.html          # Register account
│   ├── login.html             # Credentials check
│   ├── set_pin.html           # Setup security lock
│   ├── verify.html            # Verify security lock
│   ├── dashboard.html         # User console
│   ├── map.html               # Live coordinates map
│   └── sos.html               # Pulsing panic button
├── .gitignore
├── requirements.txt
└── README.md
```
