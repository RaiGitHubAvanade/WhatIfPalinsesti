import logging
from dataclasses import asdict
from datetime import date

from flask import Blueprint, request

from app.container import get_simulation_service
from app.logics.business_logic_simulation import BusinessLogicSimulation
from app.models.api_response import error, success

logger = logging.getLogger(__name__)

bp = Blueprint("simulation", __name__)


# Step 1
@bp.route("/simulation/getPalinsestoFuturoRai")
def get_palinsesto_futuro_rai():
    channel   = request.args.get("channel")   or None
    day_str   = request.args.get("day")       or None
    from_time = request.args.get("from_time") or None
    to_time   = request.args.get("to_time")   or None

    if day_str:
        try:
            day = date.fromisoformat(day_str)
        except ValueError:
            return error(message="Formato data non valido (atteso YYYY-MM-DD)", errors=["invalid_date"]), 400
    else:
        day = date.today()

    logger.info(
        "getPalinsestoFuturoRai | channel=%s day=%s from=%s to=%s",
        channel, day, from_time, to_time,
    )

    try:
        logic = BusinessLogicSimulation(get_simulation_service())
        result = logic.get_palinsesto_futuro_rai(
            day=day, channel=channel, from_time=from_time, to_time=to_time
        )
    except RuntimeError as e:
        logger.error("getPalinsestoFuturoRai RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("getPalinsestoFuturoRai unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    return success(data=[asdict(ch) for ch in result], message="Palinsesto RAI ottenuto con successo")


# Step 3
@bp.route("/simulation/getCandidatePrograms")
def get_candidate_programs():
    program_name = request.args.get("program_name") or None
    channel      = request.args.get("channel")      or None
    target_sex   = request.args.get("target_sex")   or None
    target_age   = request.args.get("target_age")   or None
    min_share_str = request.args.get("min_share")   or None

    min_share: float | None = None
    if min_share_str:
        try:
            min_share = float(min_share_str)
        except ValueError:
            return error(message="Valore min_share non valido", errors=["invalid_min_share"]), 400

    logger.info(
        "getCandidatePrograms | program_name=%s channel=%s target_sex=%s target_age=%s min_share=%s",
        program_name, channel, target_sex, target_age, min_share,
    )

    try:
        logic  = BusinessLogicSimulation(get_simulation_service())
        result = logic.get_candidate_programs(
            program_name=program_name,
            channel=channel,
            target_sex=target_sex,
            target_age=target_age,
            min_share=min_share,
        )
    except RuntimeError as e:
        logger.error("getCandidatePrograms RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("getCandidatePrograms unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    return success(data=[asdict(p) for p in result], message="Programmi candidati ottenuti con successo")


# Simulation: Sostituzione
@bp.route("/simulation/sostituzione/start", methods=["POST"])
def start_sostituzione():
    body = request.get_json(silent=True) or {}

    program_name              = body.get("program_name")
    program_channel           = body.get("program_channel")
    program_date              = body.get("program_date")
    program_from_time         = body.get("program_from_time")
    scenario_type             = body.get("scenario_type")
    new_program_name          = body.get("new_program_name")
    new_program_share_storico = body.get("new_program_share_storico")

    missing = [
        name for name, val in {
            "program_name":              program_name,
            "program_channel":           program_channel,
            "program_date":              program_date,
            "program_from_time":         program_from_time,
            "scenario_type":             scenario_type,
            "new_program_name":          new_program_name,
            "new_program_share_storico": new_program_share_storico,
        }.items()
        if val is None
    ]
    if missing:
        return error(
            message=f"Parametri obbligatori mancanti: {', '.join(missing)}",
            errors=["missing_params"],
        ), 400

    logger.info(
        "startSostituzione | scenario_type=%s program=%s channel=%s date=%s from=%s new_program=%s",
        scenario_type,
        program_name,
        program_channel,
        program_date,
        program_from_time,
        new_program_name,
    )

    try:
        logic = BusinessLogicSimulation(get_simulation_service())
        message, status_code = logic.start_sostituzione(body)
    except ValueError as e:
        return error(message=str(e), errors=["missing_params"]), 400
    except RuntimeError as e:
        logger.error("startSostituzione RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("startSostituzione unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    if status_code == 202:
        return success(message=message), 202
    return error(message=message, errors=["simulation_conflict"]), status_code
