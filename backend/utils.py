import math
from functools import wraps
from flask import session, redirect, url_for, flash, jsonify, request

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees) in meters.
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371000 # Radius of earth in meters. Use 6371 for km
    return c * r

def get_safety_status(user_lat, user_lng, hotspots):
    """
    Evaluate the safety status of a user based on nearby hotspots.
    Returns a dict with safety_score, risk_level, and nearby_alerts.
    """
    min_dist_high = float('inf')
    min_dist_med = float('inf')
    min_dist_low = float('inf')
    
    nearby_count = 0
    warning_hotspots = []

    for hs in hotspots:
        dist = calculate_distance(user_lat, user_lng, hs["lat"], hs["lng"])
        # We consider a radius of 500 meters for immediate vicinity
        if dist <= 500:
            nearby_count += 1
            warning_hotspots.append({
                "name": hs["name"],
                "risk_level": hs["risk_level"],
                "distance": round(dist, 1)
            })
            
            if hs["risk_level"] == "high":
                min_dist_high = min(min_dist_high, dist)
            elif hs["risk_level"] == "medium":
                min_dist_med = min(min_dist_med, dist)
            elif hs["risk_level"] == "low":
                min_dist_low = min(min_dist_low, dist)

    # Determine risk level
    if min_dist_high <= 200:
        level = "High Risk"
        score = 20  # Out of 100
        message = "Warning: You are in an immediate high-risk crime zone!"
    elif min_dist_high <= 500 or min_dist_med <= 250:
        level = "Moderate Risk"
        score = 50
        message = "Caution: Medium or high crime risk zone nearby."
    elif min_dist_med <= 500 or min_dist_low <= 300:
        level = "Low Risk"
        score = 80
        message = "Relatively safe, but stay alert. Minor risk areas nearby."
    else:
        level = "Safe"
        score = 100
        message = "You are currently in a designated safe area."

    return {
        "status": level,
        "score": score,
        "message": message,
        "nearby_count": nearby_count,
        "details": warning_hotspots
    }

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.is_json:
                return jsonify({"error": "Unauthorized. Please log in."}), 401
            flash("Please login to access this page.", "danger")
            return redirect(url_for('login_view'))
        return f(*args, **kwargs)
    return decorated_function

def pin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.is_json:
                return jsonify({"error": "Unauthorized. Please log in."}), 401
            return redirect(url_for('login_view'))
        if not session.get('pin_verified'):
            if request.is_json:
                return jsonify({"error": "PIN verification required."}), 403
            flash("Security PIN verification required.", "warning")
            return redirect(url_for('verify_view'))
        return f(*args, **kwargs)
    return decorated_function
