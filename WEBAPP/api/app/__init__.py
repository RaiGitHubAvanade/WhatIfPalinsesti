import os
from flask import Flask, jsonify
from flask_cors import CORS
from .config import Config
from .container import teardown_databricks_service

_DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")


def create_app(config_class=Config):
    app = Flask(__name__, static_folder=_DIST_DIR, static_url_path="")
    app.config.from_object(config_class)

    CORS(app, origins=app.config["CORS_ORIGINS"])

    app.teardown_appcontext(teardown_databricks_service)

    from .routes.programs import bp as programs_bp
    from .routes.simulation import bp as simulation_bp
    from .routes.weekly import bp as weekly_bp
    from .routes.channels import bp as channels_bp

    api = "/api"
    app.register_blueprint(programs_bp, url_prefix=api)
    app.register_blueprint(simulation_bp, url_prefix=api)
    app.register_blueprint(weekly_bp, url_prefix=api)
    app.register_blueprint(channels_bp, url_prefix=api)

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "message": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"success": False, "message": "Internal server error"}), 500

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return app.send_static_file(path)
        return app.send_static_file("index.html")

    return app
