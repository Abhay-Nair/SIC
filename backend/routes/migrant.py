import uuid
import json
from io import BytesIO
from flask import Blueprint, current_app, jsonify, request, session, send_file
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from bson import ObjectId
from config import Config, allowed_file
from models import require_role, serialize_migrant, now_iso
import qrcode


migrant_bp = Blueprint("migrant", __name__)


@migrant_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    aadhar = data.get("aadhar")
    if not email or not aadhar:
        return jsonify({"error": "Email and Aadhar required"}), 400

    doc = current_app.immigrants_db.immigrants.find_one({"email": email, "aadhar": aadhar})
    if not doc:
        return jsonify({"error": "Application not found. Please submit a new application."}), 404

    session.clear()
    session.update({"role": "migrant", "migrant_id": str(doc["_id"]), "email": email})
    return jsonify({"message": "Login successful", "migrant_id": str(doc["_id"])})


@migrant_bp.route("/apply", methods=["POST"])
def apply():
    form = request.form
    required = ["name", "aadhar", "source", "destination", "medium_of_travel", "email"]
    if not all(form.get(k) for k in required):
        return jsonify({"error": "All fields are required"}), 400

    # Validate Aadhar: only numbers, exactly 12 digits
    aadhar = form.get("aadhar", "").strip()
    if not aadhar.isdigit() or len(aadhar) != 12:
        return jsonify({"error": "Aadhar must be exactly 12 digits (numbers only)"}), 400

    # Medical report is optional now
    medical_report_path = ""
    if "medical_report" in request.files:
        file = request.files["medical_report"]
        if file.filename and allowed_file(file.filename, Config.ALLOWED_REPORT_EXTENSIONS):
            filename = f"{uuid.uuid4().hex}_{file.filename}"
            filepath = f"{Config.MEDICAL_REPORT_FOLDER}/{filename}"
            file.save(filepath)
            medical_report_path = filepath

    payload = {
        "name": form.get("name"),
        "aadhar": aadhar,
        "source": form.get("source"),
        "destination": form.get("destination"),
        "medium_of_travel": form.get("medium_of_travel"),
        "email": form.get("email"),
        "medical_report_path": medical_report_path,
        "doctor_approval": "PENDING",
        "official_approval": "PENDING",
        "doctor_id": "",
        "created_at": now_iso(),
    }

    existing = current_app.immigrants_db.immigrants.find_one({"email": payload["email"], "aadhar": payload["aadhar"]})
    if existing:
        current_app.immigrants_db.immigrants.update_one({"_id": existing["_id"]}, {"$set": payload})
        migrant_id = existing["_id"]
    else:
        result = current_app.immigrants_db.immigrants.insert_one(payload)
        migrant_id = result.inserted_id

    session.clear()
    session.update({"role": "migrant", "migrant_id": str(migrant_id), "email": payload["email"]})
    return jsonify({"message": "Application submitted", "migrant_id": str(migrant_id)})


@migrant_bp.route("/status", methods=["GET"])
@require_role("migrant")
def status():
    migrant_id = session.get("migrant_id")
    doc = current_app.immigrants_db.immigrants.find_one({"_id": ObjectId(migrant_id)})
    return jsonify({"migrant": serialize_migrant(doc)})


@migrant_bp.route("/download-clearance", methods=["GET"])
@require_role("migrant")
def download_clearance():
    migrant_id = session.get("migrant_id")
    doc = current_app.immigrants_db.immigrants.find_one({"_id": ObjectId(migrant_id)})
    if not doc or doc.get("doctor_approval") != "APPROVED" or doc.get("official_approval") != "APPROVED":
        return jsonify({"error": "Clearance available only after all approvals"}), 400

    # Generate QR code data
    qr_data = {
        "migrant_id": str(doc["_id"]),
        "name": doc.get("name"),
        "aadhar": doc.get("aadhar"),
        "status": "APPROVED",
        "doctor_approval": doc.get("doctor_approval"),
        "official_approval": doc.get("official_approval"),
        "source": doc.get("source"),
        "destination": doc.get("destination"),
        "created_at": doc.get("created_at"),
    }
    qr_json = json.dumps(qr_data, sort_keys=True)
    
    # Create QR code image
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_json)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert QR code to BytesIO for ReportLab
    qr_buffer = BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)

    # Generate PDF
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Header
    p.setFont("Helvetica-Bold", 18)
    p.drawString(72, height - 50, "Aarogya Check - Travel Clearance")
    
    # Draw QR code (right side, top)
    qr_size = 120
    qr_x = width - 72 - qr_size
    qr_y = height - 50 - qr_size
    p.drawImage(ImageReader(qr_buffer), qr_x, qr_y, width=qr_size, height=qr_size)
    
    # QR code label
    p.setFont("Helvetica-Bold", 10)
    p.drawString(qr_x, qr_y - 15, "Verification QR Code")
    
    # Content
    p.setFont("Helvetica", 12)
    y = height - 100
    lines = [
        f"Name: {doc.get('name')}",
        f"Aadhar: {doc.get('aadhar')}",
        f"Source: {doc.get('source')}",
        f"Destination: {doc.get('destination')}",
        f"Mode of Travel: {doc.get('medium_of_travel')}",
        "",
        f"Doctor Approval: {doc.get('doctor_approval')}",
        f"Official Approval: {doc.get('official_approval')}",
        f"Approved On: {doc.get('created_at')}",
    ]
    for line in lines:
        p.drawString(72, y, line)
        y -= 20
    
    # Footer note
    p.setFont("Helvetica-Oblique", 10)
    p.drawString(72, y - 20, "Note: Medical details are intentionally omitted.")
    p.drawString(72, y - 35, "Scan the QR code to verify this clearance certificate.")
    
    p.showPage()
    p.save()
    buffer.seek(0)
    return send_file(buffer, mimetype="application/pdf", as_attachment=True, download_name="travel_clearance.pdf")


@migrant_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})
