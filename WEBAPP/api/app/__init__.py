import logging
import os
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from .config import Config
from .container import teardown_databricks_service

_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))


def create_app(config_class=Config):
    app = Flask(__name__, static_folder=_DIST_DIR, static_url_path="")
    app.config.from_object(config_class)

    CORS(app, origins=app.config["CORS_ORIGINS"])
    logging.basicConfig()
    logging.getLogger("app").setLevel(logging.INFO)
    app.teardown_appcontext(teardown_databricks_service)

    from .routes.route_weekly_programming import bp as weekly_bp
    # from .routes.route_simulation import bp as simulation_bp
    # from .routes.route_scenarios import bp as scenarios_bp

    api = "/api"
    app.register_blueprint(weekly_bp, url_prefix=api)
    # app.register_blueprint(simulation_bp, url_prefix=api)
    # app.register_blueprint(scenarios_bp, url_prefix=api)

    @app.errorhandler(404)
    def not_found(e):
        # Return JSON only for API routes; for everything else serve the SPA
        if request.path.startswith("/api/"):
            return jsonify({"success": False, "message": "Not found"}), 404
        index_path = os.path.join(app.static_folder, "index.html")
        if os.path.exists(index_path):
            return send_file(index_path)
        return jsonify({"success": False, "message": "Frontend not built"}), 503

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"success": False, "message": "Internal server error"}), 500

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return app.send_static_file(path)
        index_path = os.path.join(app.static_folder, "index.html")
        if os.path.exists(index_path):
            return send_file(index_path)
        return jsonify({"success": False, "message": "Frontend not built"}), 503

    return app
