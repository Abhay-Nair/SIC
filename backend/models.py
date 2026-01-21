from datetime import datetime
from functools import wraps
from pathlib import Path
import smtplib
from email.message import EmailMessage
from flask import current_app, jsonify, session
from bson import ObjectId


def require_role(role: str):
    """Decorator to enforce role-based access via session."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if session.get("role") != role:
                return jsonify({"error": "Unauthorized"}), 401
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def to_object_id(id_str: str):
    try:
        return ObjectId(id_str)
    except Exception:
        return None


def serialize_migrant(doc: dict, include_sensitive: bool = False):
    """Shape migrant data for responses with privacy controls."""
    if not doc:
        return None
    base = {
        "id": str(doc["_id"]),
        "name": doc.get("name"),
        "aadhar": doc.get("aadhar"),
        "source": doc.get("source"),
        "destination": doc.get("destination"),
        "medium_of_travel": doc.get("medium_of_travel"),
        "email": doc.get("email"),
        "doctor_approval": doc.get("doctor_approval"),
        "official_approval": doc.get("official_approval"),
        "created_at": doc.get("created_at"),
        "doctor_id": doc.get("doctor_id"),
    }
    if include_sensitive:
        base["medical_report_path"] = doc.get("medical_report_path")
    return base


def send_email(to_email: str, subject: str, body: str, attachment_path: str | None = None):
    """Send email via SMTP; silently skip if credentials are absent."""
    cfg = current_app.config
    if not cfg.get("SMTP_USERNAME") or not cfg.get("SMTP_PASSWORD"):
        # Development fallback to avoid hard failures without credentials.
        current_app.logger.warning("SMTP credentials not configured; skipping email send.")
        return False

    msg = EmailMessage()
    msg["From"] = cfg.get("SMTP_SENDER") or cfg.get("SMTP_USERNAME")
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    if attachment_path:
        path = Path(attachment_path)
        if path.exists():
            data = path.read_bytes()
            msg.add_attachment(data, maintype="application", subtype="octet-stream", filename=path.name)

    with smtplib.SMTP_SSL(cfg.get("SMTP_HOST"), cfg.get("SMTP_PORT")) as smtp:
        smtp.login(cfg.get("SMTP_USERNAME"), cfg.get("SMTP_PASSWORD"))
        smtp.send_message(msg)
    return True


def now_iso():
    return datetime.utcnow().isoformat()


def verify_card(file_path: str):
    """
    Lightweight verification to simulate AI check.
    Rules:
    - File must exist.
    - Size between 1KB and 5MB.
    """
    path = Path(file_path)
    if not path.exists():
        return False, "File not found"
    size = path.stat().st_size
    if size < 1024:
        return False, "Verification card too small"
    if size > 5 * 1024 * 1024:
        return False, "Verification card too large"
    return True, "Verified"


def seed_doctors(db, defaults: dict):
    """Ensure default doctor accounts exist in the database-backed store."""
    if not defaults:
        return
    coll = db.doctor_accounts
    for did, pwd in defaults.items():
        if not coll.find_one({"doctor_id": did}):
            coll.insert_one(
                {
                    "doctor_id": did,
                    "password": pwd,
                    "created_at": now_iso(),
                    "created_by": "system",
                }
            )
