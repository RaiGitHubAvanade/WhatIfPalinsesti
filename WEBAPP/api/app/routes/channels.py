from flask import Blueprint, jsonify, request
from app.data.programs_data import DAY_SCHED, OTHER_CHANNELS
from datetime import date

bp = Blueprint("channels", __name__)

RAI_CHANNELS = ["Rai 1", "Rai 2", "Rai 3"]
COMP_CHANNELS = ["Canale 5", "Italia 1", "Rete 4", "La7"]
ALL_CHANNELS = RAI_CHANNELS + COMP_CHANNELS


@bp.route("/channels")
def get_channels():
    return jsonify({"rai": RAI_CHANNELS, "competitors": COMP_CHANNELS})


@bp.route("/channels/schedule")
def get_channel_schedule():
    """Return programs for a channel on a given date."""
    ch = request.args.get("ch")
    iso = request.args.get("date")
    if not ch or not iso:
        return jsonify({"error": "ch and date required"}), 400
    try:
        d = date.fromisoformat(iso)
        dow = d.isoweekday() % 7  # Mon=1..Sun=7 -> Mon=1..Sat=6, Sun=0
        if ch in RAI_CHANNELS:
            progs = DAY_SCHED.get(ch, {}).get(dow, [])
        else:
            progs = OTHER_CHANNELS.get(ch, {}).get(dow, [])
        return jsonify(progs)
    except ValueError:
        return jsonify({"error": "invalid date"}), 400


@bp.route("/channels/all-schedule")
def get_all_channels_schedule():
    """Return all channels' programs for a given date — used by the weekly table T4 panel."""
    iso = request.args.get("date")
    if not iso:
        return jsonify({"error": "date required"}), 400
    try:
        d = date.fromisoformat(iso)
        dow = d.isoweekday() % 7
        result = {}
        for ch in RAI_CHANNELS:
            result[ch] = DAY_SCHED.get(ch, {}).get(dow, [])
        for ch in COMP_CHANNELS:
            result[ch] = OTHER_CHANNELS.get(ch, {}).get(dow, [])
        return jsonify(result)
    except ValueError:
        return jsonify({"error": "invalid date"}), 400
