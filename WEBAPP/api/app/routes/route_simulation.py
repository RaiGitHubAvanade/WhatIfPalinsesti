import logging
from dataclasses import asdict
from datetime import date

from flask import Blueprint, request

from app.container import get_simulation_service
from app.logics.business_logic_simulation import BusinessLogicSimulation
from app.models.api_response import error, success
from app.models.simulation_request import SimulationSostRequest

logger = logging.getLogger(__name__)

bp = Blueprint("simulation", __name__)


# Step 1
@bp.route("/simulation/getTargetPrograms")
def get_target_programs():
    day_str = request.args.get("day") or None

    if not day_str:
        return error(message="Il parametro 'day' è obbligatorio", errors=["missing_day"]), 400

    try:
        day = date.fromisoformat(day_str)
    except ValueError:
        return error(message="Formato data non valido (atteso YYYY-MM-DD)", errors=["invalid_date"]), 400

    logger.info("getTargetPrograms | day=%s", day)

    try:
        logic = BusinessLogicSimulation(get_simulation_service())
        result = logic.get_target_programs(day=day)
    except RuntimeError as e:
        logger.error("getTargetPrograms RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("getTargetPrograms unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    return success(data=[asdict(ch) for ch in result], message="Palinsesto RAI ottenuto con successo")


# Step 3
@bp.route("/simulation/getCandidatePrograms")
def get_candidate_programs():
    logger.info("getCandidatePrograms")

    try:
        logic  = BusinessLogicSimulation(get_simulation_service())
        result = logic.get_candidate_programs()
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
    req = SimulationSostRequest.from_body(body)

    missing = [
        name for name, val in {
            "program_name":              req.program_name,
            "program_channel":           req.program_channel,
            "program_date":              req.program_date,
            "program_from_time":         req.program_from_time,
            "scenario_type":             req.scenario_type,
            "new_program_name":          req.new_program_name,
            "new_program_share_storico": req.new_program_share_storico,
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
        req.scenario_type, req.program_name, req.program_channel,
        req.program_date, req.program_from_time, req.new_program_name,
    )

    try:
        logic = BusinessLogicSimulation(get_simulation_service())
        message, status_code = logic.start_sostituzione(req)
    except ValueError as e:
        return error(message=str(e), errors=["missing_params"]), 400
    except RuntimeError as e:
        logger.error("startSostituzione RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("startSostituzione unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    return success(message=message), status_code


# Simulation: Retry Sostituzione
@bp.route("/simulation/<simulation_id>/retry", methods=["POST"])
def retry_simulation(simulation_id):
    logger.info("retrySimulation | id=%s", simulation_id)
    try:
        logic = BusinessLogicSimulation(get_simulation_service())
        message, status_code = logic.retry_simulation(simulation_id)
    except ValueError as e:
        return error(message=str(e), errors=["invalid_state"]), 400
    except RuntimeError as e:
        logger.error("retrySimulation RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("retrySimulation unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500
    return success(message=message), status_code
