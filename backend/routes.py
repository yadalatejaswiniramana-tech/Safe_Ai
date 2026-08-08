from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for, flash
from backend.config import get_db
from backend.models import UserModel, HotspotModel, AlertModel
from backend.utils import login_required, pin_required, get_safety_status

# Initialize the routes blueprint
main_bp = Blueprint('main', __name__)

# ==========================================
#              HTML VIEW ROUTES
# ==========================================

@main_bp.route('/')
def index_view():
    if 'user_id' in session:
        return redirect(url_for('main.dashboard_view'))
    return render_template('index.html')

@main_bp.route('/register')
def register_view():
    if 'user_id' in session:
        return redirect(url_for('main.dashboard_view'))
    return render_template('register.html')

@main_bp.route('/login')
def login_view():
    if 'user_id' in session:
        return redirect(url_for('main.dashboard_view'))
    return render_template('login.html')

@main_bp.route('/set-pin')
@login_required
def set_pin_view():
    db = get_db()
    user = UserModel.get_user_by_id(db, session['user_id'])
    # If PIN already exists, no need to set again (can redirect to dashboard or verify)
    if user.get("pin_hash"):
        return redirect(url_for('main.dashboard_view'))
    return render_template('set_pin.html')

@main_bp.route('/verify')
@login_required
def verify_view():
    db = get_db()
    user = UserModel.get_user_by_id(db, session['user_id'])
    if not user.get("pin_hash"):
        return redirect(url_for('main.set_pin_view'))
    if session.get('pin_verified'):
        return redirect(url_for('main.dashboard_view'))
    return render_template('verify.html')

@main_bp.route('/dashboard')
@pin_required
def dashboard_view():
    db = get_db()
    user = UserModel.get_user_by_id(db, session['user_id'])
    return render_template('dashboard.html', user=user)

@main_bp.route('/map')
@pin_required
def map_view():
    db = get_db()
    user = UserModel.get_user_by_id(db, session['user_id'])
    return render_template('map.html', user=user)

@main_bp.route('/hotspots')
@pin_required
def hotspots_view():
    db = get_db()
    user = UserModel.get_user_by_id(db, session['user_id'])
    hotspots = list(HotspotModel.get_all_hotspots(db))
    return render_template('hotspots.html', user=user, hotspots=hotspots)

@main_bp.route('/sos')
@pin_required
def sos_view():
    db = get_db()
    user = UserModel.get_user_by_id(db, session['user_id'])
    return render_template('sos.html', user=user)

@main_bp.route('/logout')
def logout():
    session.clear()
    flash("You have been logged out safely.", "success")
    return redirect(url_for('main.index_view'))


# ==========================================
#                API ENDPOINTS
# ==========================================

@main_bp.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')

    if not all([username, email, phone, password]):
        return jsonify({"error": "All fields are required"}), 400

    db = get_db()
    if UserModel.get_user_by_username(db, username):
        return jsonify({"error": "Username already exists"}), 409

    try:
        UserModel.create_user(db, username, email, phone, password)
        return jsonify({"message": "Registration successful! Please login."}), 201
    except Exception as e:
        return jsonify({"error": f"Failed to register: {str(e)}"}), 500

@main_bp.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    if not all([username, password]):
        return jsonify({"error": "Username and password are required"}), 400

    db = get_db()
    user = UserModel.get_user_by_username(db, username)
    if not user or not UserModel.verify_password(user.get('password_hash'), password):
        return jsonify({"error": "Invalid username or password"}), 401

    # Store user in session
    session['user_id'] = str(user['_id'])
    session['username'] = user['username']
    session['pin_verified'] = False # Require PIN verification

    # Check if PIN is configured
    has_pin = bool(user.get('pin_hash'))
    redirect_target = '/verify' if has_pin else '/set-pin'

    return jsonify({
        "message": "Login successful",
        "redirect": redirect_target,
        "has_pin": has_pin
    }), 200

@main_bp.route('/api/set-pin', methods=['POST'])
@login_required
def api_set_pin():
    data = request.get_json() or {}
    pin = data.get('pin')

    if not pin or len(pin) != 4 or not pin.isdigit():
        return jsonify({"error": "PIN must be a 4-digit number"}), 400

    db = get_db()
    UserModel.set_pin(db, session['user_id'], pin)
    session['pin_verified'] = True # Set verified for current session since they just created it
    
    return jsonify({
        "message": "PIN setup successful!",
        "redirect": "/dashboard"
    }), 200

@main_bp.route('/api/verify-pin', methods=['POST'])
@login_required
def api_verify_pin():
    data = request.get_json() or {}
    pin = data.get('pin')

    if not pin or len(pin) != 4 or not pin.isdigit():
        return jsonify({"error": "Invalid PIN format"}), 400

    db = get_db()
    if UserModel.verify_pin(db, session['user_id'], pin):
        session['pin_verified'] = True
        return jsonify({
            "message": "PIN verification successful!",
            "redirect": "/dashboard"
        }), 200
    else:
        return jsonify({"error": "Incorrect PIN"}), 401

@main_bp.route('/api/contacts/update', methods=['POST'])
@pin_required
def api_update_contacts():
    data = request.get_json() or {}
    contacts = data.get('contacts') # Expected to be list of {"name": "...", "phone": "..."}

    if not isinstance(contacts, list):
        return jsonify({"error": "Contacts list is required"}), 400

    # Basic check on contact objects
    for contact in contacts:
        if not contact.get('name') or not contact.get('phone'):
            return jsonify({"error": "Each contact must have a name and phone number"}), 400

    db = get_db()
    UserModel.update_contacts(db, session['user_id'], contacts)
    return jsonify({"message": "Emergency contacts updated successfully!"}), 200

@main_bp.route('/api/location/update', methods=['POST'])
@pin_required
def api_update_location():
    data = request.get_json() or {}
    lat = data.get('lat')
    lng = data.get('lng')

    if lat is None or lng is None:
        return jsonify({"error": "Latitude and longitude are required"}), 400

    try:
        lat = float(lat)
        lng = float(lng)
    except ValueError:
        return jsonify({"error": "Invalid coordinate formats"}), 400

    db = get_db()
    # Save user current position
    UserModel.update_location(db, session['user_id'], lat, lng)

    # Fetch hotspots and calculate safety scores
    hotspots = list(HotspotModel.get_all_hotspots(db))
    safety_info = get_safety_status(lat, lng, hotspots)

    return jsonify({
        "message": "Location updated",
        "safety_info": safety_info
    }), 200

@main_bp.route('/api/hotspots', methods=['GET'])
@pin_required
def api_get_hotspots():
    db = get_db()
    hotspots = list(HotspotModel.get_all_hotspots(db))
    # Remove _id object from dict since it isn't JSON serializable directly
    for hs in hotspots:
        hs['_id'] = str(hs['_id'])
    return jsonify(hotspots), 200

@main_bp.route('/api/sos/trigger', methods=['POST'])
@pin_required
def api_trigger_sos():
    data = request.get_json() or {}
    lat = data.get('lat')
    lng = data.get('lng')
    message = data.get('message', "SOS Emergency! Please help, here is my location.")

    db = get_db()
    user = UserModel.get_user_by_id(db, session['user_id'])
    contacts = user.get("emergency_contacts", [])

    if not contacts:
        # Note: we still allow triggering the SOS alert, but we advise that contacts are empty.
        contact_warning = True
    else:
        contact_warning = False

    # Log/Save the Alert
    alert = AlertModel.create_alert(db, session['user_id'], session['username'], lat, lng, message)
    alert['_id'] = str(alert['_id'])

    # Prepare detailed notifications text
    notify_logs = []
    for contact in contacts:
        notify_logs.append(f"SMS sent to {contact['name']} ({contact['phone']}): '{message} Map Link: https://www.openstreetmap.org/?mlat={lat}&mlon={lng}'")

    return jsonify({
        "status": "success",
        "message": "SOS Emergency Triggered!",
        "alert": alert,
        "contacts_notified": len(contacts),
        "notifications": notify_logs,
        "contact_warning": contact_warning
    }), 200
