import os
import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_ROOT = BASE_DIR / "uploads"


class Config:
    """Central configuration for Flask and MongoDB."""

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    PERMANENT_SESSION_LIFETIME = 60 * 60 * 4  # 4 hours

    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    IMMIGRANTS_DB_NAME = os.getenv("IMMIGRANTS_DB_NAME", "immigrants_db")
    OFFICIALS_DB_NAME = os.getenv("OFFICIALS_DB_NAME", "officials_db")

    MEDICAL_REPORT_FOLDER = str(UPLOAD_ROOT / "medical_reports")
    APPROVAL_LETTER_FOLDER = str(UPLOAD_ROOT / "approval_letters")
    DOCTOR_VERIFICATION_FOLDER = str(UPLOAD_ROOT / "doctor_verifications")
    OFFICIAL_VERIFICATION_FOLDER = str(UPLOAD_ROOT / "official_verifications")

    ALLOWED_REPORT_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}
    ALLOWED_LETTER_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}
    ALLOWED_VERIFICATION_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}

    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_SENDER = os.getenv("SMTP_SENDER", SMTP_USERNAME)

    # Simple credential stores for hackathon demo; move to DB for production.
    DOCTOR_ACCOUNTS = json.loads(
        os.getenv("DOCTOR_ACCOUNTS", '{"0010":"abhaymon@1"}')
    )
    OFFICIAL_ACCOUNTS = json.loads(
        os.getenv("OFFICIAL_ACCOUNTS", '{"0010":"abhaymon@1"}')
    )


def ensure_folders():
    """Ensure upload folders exist."""
    Path(Config.MEDICAL_REPORT_FOLDER).mkdir(parents=True, exist_ok=True)
    Path(Config.APPROVAL_LETTER_FOLDER).mkdir(parents=True, exist_ok=True)
    Path(Config.DOCTOR_VERIFICATION_FOLDER).mkdir(parents=True, exist_ok=True)
    Path(Config.OFFICIAL_VERIFICATION_FOLDER).mkdir(parents=True, exist_ok=True)


def allowed_file(filename: str, allowed_extensions: set) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions


def get_mongo_client(uri: str):
    from pymongo import MongoClient

    return MongoClient(uri, serverSelectionTimeoutMS=5000)
