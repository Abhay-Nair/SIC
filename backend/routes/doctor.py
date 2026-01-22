import uuid
from flask import Blueprint, current_app, jsonify, request, session, send_file
from bson import ObjectId
from config import Config, allowed_file
from models import require_role, serialize_migrant, verify_card, send_email


doctor_bp = Blueprint("doctor", __name__)


@doctor_bp.route("/login", methods=["POST"])
def login():
    # Support both JSON and form data
    if request.is_json:
        data = request.get_json() or {}
        doctor_id = data.get("doctor_id")
        password = data.get("password")
    else:
        doctor_id = request.form.get("doctor_id")
        password = request.form.get("password")

    if not doctor_id or not password:
        return jsonify({"error": "Doctor ID and password required"}), 400

    # Check DB-backed doctor accounts first
    account = current_app.officials_db.doctor_accounts.find_one({"doctor_id": doctor_id})
    if account:
        if account.get("password") != password:
            return jsonify({"error": "Invalid credentials"}), 401
    else:
        if Config.DOCTOR_ACCOUNTS.get(doctor_id) != password:
            return jsonify({"error": "Invalid credentials"}), 401
    session.clear()
    session.update({"role": "doctor", "doctor_id": doctor_id})
    return jsonify({"message": "Login successful"})


@doctor_bp.route("/migrants", methods=["GET"])
@require_role("doctor")
def list_migrants():
    aadhar_search = request.args.get("aadhar", "").strip()
    query = {}
    if aadhar_search:
        query["aadhar"] = {"$regex": aadhar_search, "$options": "i"}
    # Only show PENDING applications
    query["doctor_approval"] = "PENDING"
    docs = current_app.immigrants_db.immigrants.find(query)
    migrants = [serialize_migrant(doc, include_sensitive=True) for doc in docs]
    return jsonify({"migrants": migrants})


@doctor_bp.route("/medical-report/<migrant_id>", methods=["GET"])
@require_role("doctor")
def download_report(migrant_id):
    doc = current_app.immigrants_db.immigrants.find_one({"_id": ObjectId(migrant_id)})
    if not doc or not doc.get("medical_report_path"):
        return jsonify({"error": "Report not found"}), 404
    return send_file(doc["medical_report_path"], as_attachment=True)


@doctor_bp.route("/decision/<migrant_id>", methods=["POST"])
@require_role("doctor")
def decide(migrant_id):
    data = request.get_json() or {}
    decision = data.get("decision")
    if decision not in ["APPROVED", "REJECTED"]:
        return jsonify({"error": "Decision must be APPROVED or REJECTED"}), 400

    doc = current_app.immigrants_db.immigrants.find_one({"_id": ObjectId(migrant_id)})
    if not doc:
        return jsonify({"error": "Migrant not found"}), 404
    current_app.immigrants_db.immigrants.update_one(
        {"_id": ObjectId(migrant_id)},
        {"$set": {"doctor_approval": decision, "doctor_id": session.get("doctor_id")}},
    )
    if decision == "REJECTED":
        # Check if health form data is provided
        health_data = data.get("health_data")
        if health_data:
            # Save health information for disapproved traveler
            from models import now_iso
            health_info = {
                "migrant_id": str(doc["_id"]),
                "name": health_data.get("name", doc.get("name")),
                "age": health_data.get("age"),
                "current_address": health_data.get("current_address"),
                "email": health_data.get("email", doc.get("email")),
                "phone_number": health_data.get("phone_number"),
                "aadhar": doc.get("aadhar"),
                "disease_name": health_data.get("disease_name"),
                "tier": int(health_data.get("tier", 1)),
                "expected_recovery_date": health_data.get("expected_recovery_date"),
                "doctor_id": session.get("doctor_id"),
                "created_at": now_iso(),
                "qr_generated": False,
            }
            current_app.officials_db.disapproved_travelers.insert_one(health_info)
        
        body = (
            f"Dear {doc.get('name')},\n\n"
            "Your application has been rejected by the medical reviewer.\n"
            "Reason: medical fitness not approved.\n\n"
            "Regards,\nAarogya Check"
        )
        send_email(doc.get("email"), "Aarogya Check - Doctor Rejection", body)
    return jsonify({"message": f"Migrant {decision.lower()}"})


@doctor_bp.route("/logout", methods=["POST"])
@require_role("doctor")
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})
