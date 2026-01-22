from flask import Flask, render_template, jsonify
from flask_cors import CORS
from config import Config, get_mongo_client, ensure_folders
from routes.migrant import migrant_bp
from routes.doctor import doctor_bp
from routes.official import official_bp
from routes.health_admin import health_admin_bp
from routes.authorities import authorities_bp
from models import require_role, seed_doctors


def create_app():
    ensure_folders()
    app = Flask(__name__, template_folder="../templates", static_folder="../static")
    app.config.from_object(Config)
    CORS(app, supports_credentials=True)

    app.mongo_client = get_mongo_client(app.config["MONGO_URI"])
    app.immigrants_db = app.mongo_client[app.config["IMMIGRANTS_DB_NAME"]]
    app.officials_db = app.mongo_client[app.config["OFFICIALS_DB_NAME"]]
    seed_doctors(app.officials_db, app.config["DOCTOR_ACCOUNTS"])

    app.register_blueprint(migrant_bp, url_prefix="/migrant")
    app.register_blueprint(doctor_bp, url_prefix="/doctor")
    app.register_blueprint(official_bp, url_prefix="/official")
    app.register_blueprint(health_admin_bp, url_prefix="/health-admin")
    app.register_blueprint(authorities_bp, url_prefix="/authorities")

    @app.route("/")
    def index():
        return render_template("landing.html")

    @app.route("/login")
    def login_page():
        return render_template("login.html")

    @app.route("/migrant-dashboard")
    def migrant_dashboard():
        return render_template("migrant_dashboard.html")

    @app.route("/doctor-dashboard")
    @require_role("doctor")
    def doctor_dashboard():
        return render_template("doctor_dashboard.html")

    @app.route("/official-dashboard")
    @require_role("official")
    def official_dashboard():
        return render_template("official_dashboard.html")

    @app.route("/health-admin-dashboard")
    @require_role("health_admin")
    def health_admin_dashboard():
        return render_template("health_admin_dashboard.html")

    @app.route("/authorities-dashboard")
    @require_role("authority")
    def authorities_dashboard():
        return render_template("authorities_dashboard.html")

    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": "Not found"}), 404

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
