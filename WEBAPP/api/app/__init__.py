import logging
import os
import time
import uuid
import json

from flask import Flask, jsonify, request, send_file, g
from flask_cors import CORS
from .config import Config
from .container import (
    teardown_databricks_service,
    teardown_simulation_service,
    teardown_scenarios_service,
    get_audit_service,
    teardown_audit_service,
)
from .utils.request_identity import resolve_request_user_identity

_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
_AUDIT_MAX_FIELD_LENGTH = 512
_AUDIT_MAX_PARAMS_LENGTH = 4000
_SENSITIVE_KEYS = {"password", "pass", "pwd", "secret", "token", "authorization", "client_secret", "api_key", "key"}


def _truncate(value, limit: int) -> str | None:
    if value is None:
        return None
    text = str(value)
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


def _sanitize_param_value(key: str, value):
    lowered = (key or "").lower()
    if lowered in _SENSITIVE_KEYS:
        return "***"

    if value is None:
        return None

    if isinstance(value, (str, int, float, bool)):
        return _truncate(value, _AUDIT_MAX_FIELD_LENGTH)

    if isinstance(value, list):
        return [_sanitize_param_value(key, item) for item in value[:20]]

    if isinstance(value, dict):
        return {
            str(k): _sanitize_param_value(str(k), v)
            for k, v in list(value.items())[:50]
        }

    return _truncate(value, _AUDIT_MAX_FIELD_LENGTH)


def _request_parameters_snapshot() -> dict:
    query_params = {}
    for k in request.args.keys():
        values = request.args.getlist(k)
        if len(values) > 1:
            query_params[k] = _sanitize_param_value(k, values)
        else:
            query_params[k] = _sanitize_param_value(k, request.args.get(k))

    path_params = {
        str(k): _sanitize_param_value(str(k), v)
        for k, v in (request.view_args or {}).items()
    }

    body_value = None
    body = request.get_json(silent=True)
    if isinstance(body, dict):
        body_value = {
            str(k): _sanitize_param_value(str(k), v)
            for k, v in list(body.items())[:50]
        }
    elif isinstance(body, list):
        body_value = [_sanitize_param_value("body_item", item) for item in body[:20]]

    return {
        "query": query_params,
        "path": path_params,
        "body": body_value,
    }


def _write_api_audit_log() -> None:
    if not Config.AUDIT_LOG_ENABLED:
        return
    if not request.path.startswith("/api"):
        return

    logger = logging.getLogger("app.audit")
    try:
        actor_identity = getattr(g, "audit_identity", None)
        identity_source = getattr(g, "audit_identity_source", "missing")
        duration_ms = None
        started_ns = getattr(g, "audit_started_ns", None)
        if started_ns is not None:
            duration_ms = int((time.perf_counter_ns() - started_ns) / 1_000_000)

        params_json = json.dumps(_request_parameters_snapshot(), ensure_ascii=True, separators=(",", ":"))

        record = {
            "id": str(uuid.uuid4()),
            "operation_name": request.endpoint or request.path,
            "http_method": request.method,
            "route_path": request.path,
            "endpoint": request.endpoint,
            "duration_ms": duration_ms,
            "user_email": actor_identity,
            "identity_source": identity_source,
            "user_agent": _truncate(request.headers.get("User-Agent"), _AUDIT_MAX_FIELD_LENGTH),
            "client_ip": _truncate(request.headers.get("X-Forwarded-For") or request.remote_addr, _AUDIT_MAX_FIELD_LENGTH),
            "request_id": _truncate(getattr(g, "audit_request_id", None), _AUDIT_MAX_FIELD_LENGTH),
            "client_session_id": _truncate(
                request.headers.get("X-Client-Session-Id") or request.args.get("clientId"),
                _AUDIT_MAX_FIELD_LENGTH,
            ),
            "parameters": _truncate(params_json, _AUDIT_MAX_PARAMS_LENGTH),
        }

        get_audit_service().write_webapp_audit_log(record)
    except Exception as exc:
        logger.warning("Audit log write failed | endpoint=%s error=%s", request.endpoint, exc)


def create_app(config_class=Config):
    app = Flask(__name__, static_folder=_DIST_DIR, static_url_path="")
    app.config.from_object(config_class)

    CORS(app, origins=app.config["CORS_ORIGINS"])
    logging.basicConfig()
    logging.getLogger("app").setLevel(logging.INFO)
    app.teardown_appcontext(teardown_databricks_service)
    app.teardown_appcontext(teardown_simulation_service)
    app.teardown_appcontext(teardown_scenarios_service)
    app.teardown_appcontext(teardown_audit_service)

    @app.before_request
    def _before_request_audit_log():
        if not Config.AUDIT_LOG_ENABLED or not request.path.startswith("/api"):
            return
        g.audit_started_ns = time.perf_counter_ns()
        g.audit_request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        actor_identity, identity_source = resolve_request_user_identity(request)
        g.audit_identity = actor_identity
        g.audit_identity_source = identity_source

    @app.after_request
    def _after_request_audit_log(response):
        if Config.AUDIT_LOG_ENABLED and request.path.startswith("/api"):
            _write_api_audit_log()
        return response

    from .routes.route_weekly_programming import bp as weekly_bp
    from .routes.route_simulation import bp as simulation_bp
    from .routes.route_scenarios import bp as scenarios_bp
    from .routes.route_events import bp as events_bp

    api = "/api"
    app.register_blueprint(weekly_bp, url_prefix=api)
    app.register_blueprint(simulation_bp, url_prefix=api)
    app.register_blueprint(scenarios_bp, url_prefix=api)
    app.register_blueprint(events_bp, url_prefix=api)

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
