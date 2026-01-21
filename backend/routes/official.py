import uuid
from flask import Blueprint, current_app, jsonify, request, session, send_file
from bson import ObjectId
from config import Config, allowed_file
from models import require_role, serialize_migrant, send_email, now_iso, verify_card


official_bp = Blueprint("official", __name__)


@official_bp.route("/login", methods=["POST"])
def login():
    official_id = request.form.get("official_id")
    password = request.form.get("password")
    verification_file = request.files.get("verification_card")

    if not verification_file or verification_file.filename == "":
        return jsonify({"error": "Verification card is required"}), 400
    if not allowed_file(verification_file.filename, Config.ALLOWED_VERIFICATION_EXTENSIONS):
        return jsonify({"error": "Invalid verification card format"}), 400
    filename = f"{uuid.uuid4().hex}_{verification_file.filename}"
    filepath = f"{Config.OFFICIAL_VERIFICATION_FOLDER}/{filename}"
    verification_file.save(filepath)

    ok, reason = verify_card(filepath)
    if not ok:
        return jsonify({"error": f"Verification failed: {reason}"}), 401

    if Config.OFFICIAL_ACCOUNTS.get(official_id) != password:
        return jsonify({"error": "Invalid credentials"}), 401
    session.clear()
    session.update({"role": "official", "official_id": official_id})
    return jsonify({"message": "Login successful"})


@official_bp.route("/create-doctor", methods=["POST"])
@require_role("official")
def create_doctor():
    data = request.get_json() or {}
    doctor_id = data.get("doctor_id")
    password = data.get("password")
    if not doctor_id or not password:
        return jsonify({"error": "doctor_id and password are required"}), 400

    existing = current_app.officials_db.doctor_accounts.find_one({"doctor_id": doctor_id})
    if existing:
        return jsonify({"error": "Doctor ID already exists"}), 400

    current_app.officials_db.doctor_accounts.insert_one(
        {
            "doctor_id": doctor_id,
            "password": password,
            "created_at": now_iso(),
            "created_by": session.get("official_id"),
        }
    )
    return jsonify({"message": "Doctor account created"})


@official_bp.route("/migrants", methods=["GET"])
@require_role("official")
def list_migrants():
    docs = current_app.immigrants_db.immigrants.find({"doctor_approval": "APPROVED"})
    sanitized = []
    for doc in docs:
        dto = serialize_migrant(doc, include_sensitive=False)
        dto.pop("doctor_id", None)  # officials do not need doctor details
        sanitized.append(dto)
    return jsonify({"migrants": sanitized})


@official_bp.route("/decision/<migrant_id>", methods=["POST"])
@require_role("official")
def decide(migrant_id):
    form = request.form
    decision = form.get("decision")
    if decision not in ["APPROVED", "REJECTED"]:
        return jsonify({"error": "Decision must be APPROVED or REJECTED"}), 400

    doc = current_app.immigrants_db.immigrants.find_one({"_id": ObjectId(migrant_id)})
    if not doc:
        return jsonify({"error": "Migrant not found"}), 404
    if doc.get("doctor_approval") != "APPROVED":
        return jsonify({"error": "Doctor approval pending"}), 400

    letter_path = None
    if decision == "APPROVED":
        if "approval_letter" not in request.files:
            return jsonify({"error": "Approval letter file required for approval"}), 400
        letter_file = request.files["approval_letter"]
        if letter_file.filename == "" or not allowed_file(letter_file.filename, Config.ALLOWED_LETTER_EXTENSIONS):
            return jsonify({"error": "Invalid approval letter format"}), 400
        filename = f"{uuid.uuid4().hex}_{letter_file.filename}"
        letter_path = f"{Config.APPROVAL_LETTER_FOLDER}/{filename}"
        letter_file.save(letter_path)

        current_app.officials_db.approved_migrants.insert_one(
            {
                "migrant_id": str(doc["_id"]),
                "name": doc.get("name"),
                "aadhar": doc.get("aadhar"),
                "source": doc.get("source"),
                "destination": doc.get("destination"),
                "medium_of_travel": doc.get("medium_of_travel"),
                "official_id": session.get("official_id"),
                "approval_letter_path": letter_path,
                "approved_at": now_iso(),
            }
        )

    current_app.immigrants_db.immigrants.update_one(
        {"_id": ObjectId(migrant_id)},
        {"$set": {"official_approval": decision}},
    )

    if decision == "APPROVED":
        body = (
            f"Dear {doc.get('name')},\n\n"
            "Your travel clearance has been approved by a Government Official.\n"
            f"Issued by Official ID: {session.get('official_id')}\n\n"
            "You can download your clearance PDF from the migrant dashboard.\n"
            "Your official approval letter is attached with this email.\n\n"
            "Regards,\nAarogya Check (Government Mailbox)"
        )
        send_email(doc.get("email"), "Aarogya Check Approval Letter", body, letter_path)
    else:
        body = (
            f"Dear {doc.get('name')},\n\n"
            "Your application has been rejected by the Government Official.\n"
            "You may contact support for further details.\n\n"
            "Regards,\nAarogya Check (Government Mailbox)"
        )
        send_email(doc.get("email"), "Aarogya Check - Official Rejection", body)

    return jsonify({"message": f"Migrant {decision.lower()}"})


@official_bp.route("/approval-letter/<migrant_id>", methods=["GET"])
@require_role("official")
def download_letter(migrant_id):
    record = current_app.officials_db.approved_migrants.find_one({"migrant_id": migrant_id})
    if not record or not record.get("approval_letter_path"):
        return jsonify({"error": "Approval letter not found"}), 404
    return send_file(record["approval_letter_path"], as_attachment=True)


@official_bp.route("/logout", methods=["POST"])
@require_role("official")
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})
