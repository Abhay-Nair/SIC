import json
from io import BytesIO
from flask import Blueprint, current_app, jsonify, request, session, send_file, render_template
from bson import ObjectId
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from models import require_role, now_iso, send_email
import qrcode


health_admin_bp = Blueprint("health_admin", __name__)


@health_admin_bp.route("/login", methods=["POST"])
def login():
    # Support both JSON and form data
    if request.is_json:
        data = request.get_json() or {}
        admin_id = data.get("admin_id", "").strip()
        password = data.get("password", "").strip()
    else:
        admin_id = request.form.get("admin_id", "").strip()
        password = request.form.get("password", "").strip()
    
    if not admin_id or not password:
        return jsonify({"error": "Admin ID and password required"}), 400
    
    # Simple authentication - can be enhanced later
    if admin_id.upper() == "HEALTH_ADMIN" and password == "admin123":
        session.clear()
        session.update({"role": "health_admin", "admin_id": admin_id.upper()})
        return jsonify({"message": "Login successful"})
    return jsonify({"error": "Invalid credentials"}), 401




@health_admin_bp.route("/disapproved-travelers", methods=["GET"])
@require_role("health_admin")
def list_disapproved():
    travelers = list(current_app.officials_db.disapproved_travelers.find({}))
    result = []
    for t in travelers:
        result.append({
            "id": str(t["_id"]),
            "name": t.get("name"),
            "aadhar": t.get("aadhar"),
            "tier": t.get("tier"),
            "disease_name": t.get("disease_name"),
            "qr_generated": t.get("qr_generated", False),
        })
    return jsonify({"travelers": result})


@health_admin_bp.route("/traveler/<traveler_id>", methods=["GET"])
@require_role("health_admin")
def get_traveler_details(traveler_id):
    traveler = current_app.officials_db.disapproved_travelers.find_one({"_id": ObjectId(traveler_id)})
    if not traveler:
        return jsonify({"error": "Traveler not found"}), 404
    
    result = {
        "id": str(traveler["_id"]),
        "name": traveler.get("name"),
        "age": traveler.get("age"),
        "current_address": traveler.get("current_address"),
        "email": traveler.get("email"),
        "phone_number": traveler.get("phone_number"),
        "aadhar": traveler.get("aadhar"),
        "disease_name": traveler.get("disease_name"),
        "tier": traveler.get("tier"),
        "expected_recovery_date": traveler.get("expected_recovery_date"),
        "doctor_id": traveler.get("doctor_id"),
        "created_at": traveler.get("created_at"),
        "qr_generated": traveler.get("qr_generated", False),
    }
    return jsonify({"traveler": result})


@health_admin_bp.route("/update-qr/<traveler_id>", methods=["POST"])
@require_role("health_admin")
def update_qr(traveler_id):
    traveler = current_app.officials_db.disapproved_travelers.find_one({"_id": ObjectId(traveler_id)})
    if not traveler:
        return jsonify({"error": "Traveler not found"}), 404
    
    # Generate QR code data
    qr_data = {
        "migrant_id": traveler.get("migrant_id"),
        "name": traveler.get("name"),
        "aadhar": traveler.get("aadhar"),
        "phone_number": traveler.get("phone_number"),
        "email": traveler.get("email"),
        "address": traveler.get("current_address"),
        "recovery_date": traveler.get("expected_recovery_date"),
        "status": "DISAPPROVED",
        "tier": traveler.get("tier"),
        "disease_name": traveler.get("disease_name"),
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
    
    # Generate Health Warning Letter PDF
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Header
    p.setFont("Helvetica-Bold", 20)
    p.setFillColorRGB(0.8, 0, 0)  # Red color
    p.drawString(72, height - 50, "HEALTH WARNING NOTICE")
    p.setFillColorRGB(0, 0, 0)  # Black
    
    # Draw QR code (right side, top)
    qr_size = 120
    qr_x = width - 72 - qr_size
    qr_y = height - 50 - qr_size
    p.drawImage(ImageReader(qr_buffer), qr_x, qr_y, width=qr_size, height=qr_size)
    
    # QR code label
    p.setFont("Helvetica-Bold", 10)
    p.drawString(qr_x, qr_y - 15, "Health Status QR Code")
    
    # Content
    p.setFont("Helvetica-Bold", 12)
    y = height - 100
    p.drawString(72, y, f"Name: {traveler.get('name')}")
    y -= 20
    p.drawString(72, y, f"Aadhar Number: {traveler.get('aadhar')}")
    y -= 20
    p.drawString(72, y, f"Phone Number: {traveler.get('phone_number')}")
    y -= 20
    p.drawString(72, y, f"Email: {traveler.get('email')}")
    y -= 20
    p.drawString(72, y, f"Address: {traveler.get('current_address')}")
    y -= 20
    p.drawString(72, y, f"Disease: {traveler.get('disease_name')}")
    y -= 20
    p.drawString(72, y, f"Tier: {traveler.get('tier')}")
    y -= 20
    p.drawString(72, y, f"Expected Recovery Date: {traveler.get('expected_recovery_date')}")
    y -= 30
    
    # Health Guidelines
    p.setFont("Helvetica-Bold", 14)
    p.drawString(72, y, "HEALTH GUIDELINES TO BE FOLLOWED:")
    y -= 25
    p.setFont("Helvetica", 11)
    guidelines = [
        "1. You are advised to stay at home and follow strict isolation protocols.",
        "2. Do not travel or visit public places until you have fully recovered.",
        "3. Follow all medical prescriptions and take medications as prescribed.",
        "4. Monitor your health condition regularly and report any deterioration immediately.",
        "5. Maintain proper hygiene and sanitization at all times.",
        "6. Avoid contact with family members and others to prevent spread of infection.",
        "7. Follow up with your healthcare provider as scheduled.",
    ]
    for guideline in guidelines:
        p.drawString(72, y, guideline)
        y -= 18
    
    y -= 20
    # Fine Amount Warning
    p.setFont("Helvetica-Bold", 14)
    p.setFillColorRGB(0.8, 0, 0)  # Red
    p.drawString(72, y, "⚠️ PENALTY WARNING ⚠️")
    y -= 20
    p.setFont("Helvetica-Bold", 12)
    p.drawString(72, y, "A FINE AMOUNT OF ₹5,000 will be levied if you are caught")
    y -= 18
    p.drawString(72, y, "roaming in public places while you have been advised to")
    y -= 18
    p.drawString(72, y, "stay at home and follow safety protocols.")
    p.setFillColorRGB(0, 0, 0)  # Black
    
    y -= 30
    # Footer
    p.setFont("Helvetica-Oblique", 10)
    p.drawString(72, y, "This is an official health warning notice from the Government Health Administration.")
    p.drawString(72, y - 15, "Scan the QR code to verify health status and details.")
    
    p.showPage()
    p.save()
    buffer.seek(0)
    
    # Save PDF path (optional - can store in database)
    # For now, we'll send it via email
    
    # Update database to mark QR as generated
    current_app.officials_db.disapproved_travelers.update_one(
        {"_id": ObjectId(traveler_id)},
        {"$set": {"qr_generated": True, "qr_data": qr_json, "updated_at": now_iso()}}
    )
    
    # Send email with PDF attachment
    email_body = (
        f"Dear {traveler.get('name')},\n\n"
        "You have been issued a Health Warning Notice due to medical disapproval.\n"
        "Please find attached your health warning letter with QR code.\n\n"
        "IMPORTANT: You are required to stay at home and follow all health guidelines.\n"
        "A fine of ₹5,000 will be levied if you are found violating the safety protocols.\n\n"
        "Please scan the QR code to view your health status details.\n\n"
        "Regards,\nGovernment Health Administration"
    )
    
    # Save PDF temporarily to send as attachment
    import tempfile
    import os
    temp_path = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    temp_path.write(buffer.read())
    temp_path.close()
    
    send_email(traveler.get("email"), "Health Warning Notice - Government Health Administration", email_body, temp_path.name)
    
    # Clean up temp file
    os.unlink(temp_path.name)
    
    return jsonify({"message": "QR code generated and health warning letter sent to traveler"})


@health_admin_bp.route("/download-warning-letter/<traveler_id>", methods=["GET"])
@require_role("health_admin")
def download_warning_letter(traveler_id):
    traveler = current_app.officials_db.disapproved_travelers.find_one({"_id": ObjectId(traveler_id)})
    if not traveler:
        return jsonify({"error": "Traveler not found"}), 404
    
    # Regenerate QR and PDF (same logic as update_qr)
    qr_data = {
        "migrant_id": traveler.get("migrant_id"),
        "name": traveler.get("name"),
        "aadhar": traveler.get("aadhar"),
        "phone_number": traveler.get("phone_number"),
        "email": traveler.get("email"),
        "address": traveler.get("current_address"),
        "recovery_date": traveler.get("expected_recovery_date"),
        "status": "DISAPPROVED",
        "tier": traveler.get("tier"),
        "disease_name": traveler.get("disease_name"),
    }
    qr_json = json.dumps(qr_data, sort_keys=True)
    
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=4)
    qr.add_data(qr_json)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    qr_buffer = BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)
    
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    p.setFont("Helvetica-Bold", 20)
    p.setFillColorRGB(0.8, 0, 0)
    p.drawString(72, height - 50, "HEALTH WARNING NOTICE")
    p.setFillColorRGB(0, 0, 0)
    
    qr_size = 120
    qr_x = width - 72 - qr_size
    qr_y = height - 50 - qr_size
    p.drawImage(ImageReader(qr_buffer), qr_x, qr_y, width=qr_size, height=qr_size)
    
    p.setFont("Helvetica-Bold", 10)
    p.drawString(qr_x, qr_y - 15, "Health Status QR Code")
    
    p.setFont("Helvetica-Bold", 12)
    y = height - 100
    p.drawString(72, y, f"Name: {traveler.get('name')}")
    y -= 20
    p.drawString(72, y, f"Aadhar Number: {traveler.get('aadhar')}")
    y -= 20
    p.drawString(72, y, f"Phone Number: {traveler.get('phone_number')}")
    y -= 20
    p.drawString(72, y, f"Email: {traveler.get('email')}")
    y -= 20
    p.drawString(72, y, f"Address: {traveler.get('current_address')}")
    y -= 20
    p.drawString(72, y, f"Disease: {traveler.get('disease_name')}")
    y -= 20
    p.drawString(72, y, f"Tier: {traveler.get('tier')}")
    y -= 20
    p.drawString(72, y, f"Expected Recovery Date: {traveler.get('expected_recovery_date')}")
    y -= 30
    
    p.setFont("Helvetica-Bold", 14)
    p.drawString(72, y, "HEALTH GUIDELINES TO BE FOLLOWED:")
    y -= 25
    p.setFont("Helvetica", 11)
    guidelines = [
        "1. You are advised to stay at home and follow strict isolation protocols.",
        "2. Do not travel or visit public places until you have fully recovered.",
        "3. Follow all medical prescriptions and take medications as prescribed.",
        "4. Monitor your health condition regularly and report any deterioration immediately.",
        "5. Maintain proper hygiene and sanitization at all times.",
        "6. Avoid contact with family members and others to prevent spread of infection.",
        "7. Follow up with your healthcare provider as scheduled.",
    ]
    for guideline in guidelines:
        p.drawString(72, y, guideline)
        y -= 18
    
    y -= 20
    p.setFont("Helvetica-Bold", 14)
    p.setFillColorRGB(0.8, 0, 0)
    p.drawString(72, y, "⚠️ PENALTY WARNING ⚠️")
    y -= 20
    p.setFont("Helvetica-Bold", 12)
    p.drawString(72, y, "A FINE AMOUNT OF ₹5,000 will be levied if you are caught")
    y -= 18
    p.drawString(72, y, "roaming in public places while you have been advised to")
    y -= 18
    p.drawString(72, y, "stay at home and follow safety protocols.")
    p.setFillColorRGB(0, 0, 0)
    
    y -= 30
    p.setFont("Helvetica-Oblique", 10)
    p.drawString(72, y, "This is an official health warning notice from the Government Health Administration.")
    p.drawString(72, y - 15, "Scan the QR code to verify health status and details.")
    
    p.showPage()
    p.save()
    buffer.seek(0)
    return send_file(buffer, mimetype="application/pdf", as_attachment=True, download_name=f"health_warning_{traveler.get('aadhar')}.pdf")


@health_admin_bp.route("/logout", methods=["POST"])
@require_role("health_admin")
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})
