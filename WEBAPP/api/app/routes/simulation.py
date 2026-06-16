from flask import Blueprint, jsonify, request
from app.services.simulation_service import predict_share, get_competitors

bp = Blueprint("simulation", __name__)


@bp.route("/simulate", methods=["POST"])
def simulate():
    body = request.get_json(force=True) or {}
    orig = body.get("orig")
    cand = body.get("cand")
    if not orig or not cand:
        return jsonify({"error": "orig and cand are required"}), 400
    result = predict_share(orig, cand)
    return jsonify(result)


@bp.route("/competitors")
def competitors():
    slot = request.args.get("slot")
    force_external = request.args.get("force_external", "false").lower() == "true"
    result = get_competitors(slot, force_external)
    return jsonify(result)
