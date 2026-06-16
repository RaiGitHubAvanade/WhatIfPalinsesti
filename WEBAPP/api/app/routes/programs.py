from flask import Blueprint, jsonify, request
from app.data.programs_data import PROGS, CANDS

bp = Blueprint("programs", __name__)


@bp.route("/programs")
def get_programs():
    ch = request.args.get("ch")
    slot = request.args.get("slot")
    tipo = request.args.get("tipo")
    eta = request.args.get("eta")
    sesso = request.args.get("sesso")
    search = (request.args.get("search") or "").lower()

    result = PROGS
    if ch:
        result = [p for p in result if p.get("ch") == ch]
    if slot:
        result = [p for p in result if p.get("slot") == slot]
    if tipo:
        result = [p for p in result if p.get("tipo") == tipo]
    if eta and eta != "All":
        result = [p for p in result if p.get("eta") in (eta, "All")]
    if sesso and sesso != "All":
        result = [p for p in result if p.get("sesso") in (sesso, "All")]
    if search:
        result = [
            p for p in result
            if search in (p.get("title", "") + " " + p.get("genre", "") + " " + p.get("tipo", "")).lower()
        ]

    return jsonify(result[:200])


@bp.route("/programs/<prog_id>")
def get_program(prog_id):
    prog = next((p for p in PROGS if p["id"] == prog_id), None)
    if not prog:
        return jsonify({"error": "Not found"}), 404
    return jsonify(prog)


@bp.route("/candidates")
def get_candidates():
    return jsonify(CANDS)
