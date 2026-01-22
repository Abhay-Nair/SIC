import json
from flask import Blueprint, current_app, jsonify, request, session, render_template
from bson import ObjectId
from models import require_role, now_iso


authorities_bp = Blueprint("authorities", __name__)


@authorities_bp.route("/login", methods=["POST"])
def login():
    # Support both JSON and form data
    if request.is_json:
        data = request.get_json() or {}
        authority_id = data.get("authority_id", "").strip()
        password = data.get("password", "").strip()
    else:
        authority_id = request.form.get("authority_id", "").strip()
        password = request.form.get("password", "").strip()
    
    if not authority_id or not password:
        return jsonify({"error": "Authority ID and password required"}), 400
    
    # Simple authentication - can be enhanced later
    if authority_id.upper() == "AUTHORITY" and password == "authority123":
        session.clear()
        session.update({"role": "authority", "authority_id": authority_id.upper()})
        return jsonify({"message": "Login successful"})
    return jsonify({"error": "Invalid credentials"}), 401


@authorities_bp.route("/disapproved-travelers", methods=["GET"])
@require_role("authority")
def list_disapproved():
    # Authorities only see NAME, AADHAR, and Tier
    travelers = list(current_app.officials_db.disapproved_travelers.find({}))
    result = []
    for t in travelers:
        result.append({
            "name": t.get("name"),
            "aadhar": t.get("aadhar"),
            "tier": t.get("tier"),
        })
    return jsonify({"travelers": result})


@authorities_bp.route("/scan-qr", methods=["POST"])
@require_role("authority")
def scan_qr():
    data = request.get_json() or {}
    qr_data_str = data.get("qr_data")
    
    if not qr_data_str:
        return jsonify({"error": "QR data is required"}), 400
    
    try:
        # Parse QR code data
        qr_data = json.loads(qr_data_str)
        status = qr_data.get("status")
        aadhar = qr_data.get("aadhar")
        
        if not aadhar:
            return jsonify({"error": "Invalid QR code: Aadhar not found"}), 400
        
        if status == "DISAPPROVED":
            # Find traveler in database
            traveler = current_app.officials_db.disapproved_travelers.find_one({"aadhar": aadhar})
            if not traveler:
                return jsonify({
                    "status": "DISAPPROVED",
                    "flag": "RED",
                    "name": qr_data.get("name"),
                    "aadhar": aadhar,
                    "tier": qr_data.get("tier"),
                    "message": "Traveler found in disapproved database"
                })
            
            # Calculate penalty based on tier
            tier = traveler.get("tier", 1)
            penalty_amounts = {1: 5000, 2: 10000, 3: 20000}
            penalty = penalty_amounts.get(tier, 5000)
            
            return jsonify({
                "status": "DISAPPROVED",
                "flag": "RED",
                "name": traveler.get("name"),
                "aadhar": traveler.get("aadhar"),
                "tier": tier,
                "penalty_amount": penalty,
                "disease_name": traveler.get("disease_name"),
                "message": f"⚠️ DISAPPROVED TRAVELER DETECTED - Tier {tier}"
            })
        
        elif status == "APPROVED":
            # Get from approved migrants or immigrants
            migrant = current_app.immigrants_db.immigrants.find_one({"aadhar": aadhar})
            if migrant and migrant.get("doctor_approval") == "APPROVED" and migrant.get("official_approval") == "APPROVED":
                return jsonify({
                    "status": "APPROVED",
                    "flag": "GREEN",
                    "name": qr_data.get("name", migrant.get("name")),
                    "aadhar": aadhar,
                    "phone_number": qr_data.get("phone_number", migrant.get("email", "")),
                    "email": qr_data.get("email", migrant.get("email", "")),
                    "source": qr_data.get("source", migrant.get("source", "")),
                    "destination": qr_data.get("destination", migrant.get("destination", "")),
                    "message": "✓ APPROVED TRAVELER - Clear to travel"
                })
            else:
                return jsonify({
                    "status": "PENDING",
                    "flag": "YELLOW",
                    "name": qr_data.get("name"),
                    "aadhar": aadhar,
                    "message": "⚠️ Traveler status is pending approval"
                })
        
        else:
            return jsonify({"error": "Unknown status in QR code"}), 400
            
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid QR code format"}), 400
    except Exception as e:
        return jsonify({"error": f"Error processing QR code: {str(e)}"}), 500


@authorities_bp.route("/levy-penalty", methods=["POST"])
@require_role("authority")
def levy_penalty():
    data = request.get_json() or {}
    aadhar = data.get("aadhar")
    penalty_amount = data.get("penalty_amount")
    reason = data.get("reason", "Violation of health protocols")
    
    if not aadhar or not penalty_amount:
        return jsonify({"error": "Aadhar and penalty amount are required"}), 400
    
    # Record penalty
    penalty_record = {
        "aadhar": aadhar,
        "penalty_amount": float(penalty_amount),
        "reason": reason,
        "authority_id": session.get("authority_id"),
        "levied_at": now_iso(),
    }
    
    # Store in database
    current_app.officials_db.penalties.insert_one(penalty_record)
    
    return jsonify({
        "message": f"Penalty of ₹{penalty_amount} levied successfully",
        "penalty_record": {
            "aadhar": aadhar,
            "amount": penalty_amount,
            "reason": reason,
        }
    })


@authorities_bp.route("/logout", methods=["POST"])
@require_role("authority")
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})
