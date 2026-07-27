import logging
from dataclasses import asdict
from datetime import date

from flask import Blueprint, request

from app.utils.messages import Messages
from app.container import get_simulation_logic
from app.models.api_response import error, success
from app.models.serving_endpoint_sostituzione_request import ServingEndpointSostituzioneRequest
from app.models.serving_endpoint_spostamento_request import ServingEndpointSpostamentoRequest
from app.utils.request_identity import resolve_request_user_identity
from app.utils.sse_broker import broker

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
        logic = get_simulation_logic()
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
    share_predicted_str = request.args.get("share_predicted") or None
    duration_str = request.args.get("duration") or None

    share_predicted = None
    if share_predicted_str is not None:
        try:
            share_predicted = float(share_predicted_str)
        except ValueError:
            return error(message="Parametro 'share_predicted' non valido", errors=["invalid_share_predicted"]), 400

    duration = None
    if duration_str is not None:
        try:
            duration = int(duration_str)
        except ValueError:
            return error(message="Parametro 'duration' non valido", errors=["invalid_duration"]), 400

    logger.info("getCandidatePrograms | share_predicted=%s duration=%s", share_predicted, duration)

    try:
        logic  = get_simulation_logic()
        result = logic.get_candidate_programs(share_predicted=share_predicted, duration=duration)
    except RuntimeError as e:
        logger.error("getCandidatePrograms RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("getCandidatePrograms unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    return success(data=[asdict(p) for p in result], message="Programmi candidati ottenuti con successo")


# Step 3 (Spostamento destination schedule)
@bp.route("/simulation/getSchedulePrograms")
def get_schedule_programs():
    day_str = request.args.get("day") or None

    if not day_str:
        return error(message="Il parametro 'day' è obbligatorio", errors=["missing_day"]), 400

    try:
        day = date.fromisoformat(day_str)
    except ValueError:
        return error(message="Formato data non valido (atteso YYYY-MM-DD)", errors=["invalid_date"]), 400

    logger.info("getSchedulePrograms | day=%s", day)

    try:
        logic = get_simulation_logic()
        result = logic.get_schedule_programs(day=day)
    except RuntimeError as e:
        logger.error("getSchedulePrograms RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("getSchedulePrograms unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    return success(data=[asdict(p) for p in result], message="Palinsesto destinazione ottenuto con successo")


@bp.route("/simulation/checkScenarioLimit")
def check_scenario_limit():
    program_id = request.args.get("program_id") or None
    scenario_type = request.args.get("scenario_type") or None

    if not program_id:
        return error(message="Il parametro 'program_id' è obbligatorio", errors=["missing_program_id"]), 400

    if scenario_type not in {"sostituzione", "spostamento"}:
        return error(
            message="Il parametro 'scenario_type' deve essere 'sostituzione' o 'spostamento'",
            errors=["invalid_scenario_type"],
        ), 400

    logger.info("checkScenarioLimit | program_id=%s scenario_type=%s", program_id, scenario_type)

    try:
        logic = get_simulation_logic()
        can_proceed, simulation_count = logic.can_proceed_to_step_3(program_id, scenario_type)
    except RuntimeError as e:
        logger.error("checkScenarioLimit RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("checkScenarioLimit unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    message = ""
    if not can_proceed:
        message = Messages.SCENARIO_LIMIT_REACHED_STEP_2

    return success(
        data={
            "can_proceed": can_proceed,
            "simulation_count": simulation_count,
        },
        message=message,
    )


# Simulation: Sostituzione
@bp.route("/simulation/sostituzione/start", methods=["POST"])
def start_sostituzione():
    body = request.get_json(silent=True) or {}
    req = ServingEndpointSostituzioneRequest.from_body(body)
    actor_identity, identity_source = resolve_request_user_identity(request)

    missing = req.retrieve_missing_parameters()
    if missing:
        return error(
            message=f"Parametri obbligatori mancanti: {', '.join(missing)}",
            errors=["missing_params"],
        ), 400

    logger.info(
        "startSostituzione | scenario_type=%s program=%s channel=%s date=%s from=%s to=%s new_program=%s user_email=%s user_email_source=%s",
        req.scenario_type,
        req.program_name,
        req.program_channel,
        req.program_date,
        req.program_from_time,
        req.program_to_time,
        req.new_program_name,
        actor_identity,
        identity_source,
    )

    try:
        logic = get_simulation_logic()
        message, status_code = logic.start_sostituzione(req, actor_identity)
        if (status_code == 202):
            message = Messages.SIMULATION_SOSTITUZIONE_STARTED
    except ValueError as e:
        return error(message=str(e), errors=["missing_params"]), 400
    except RuntimeError as e:
        logger.error("startSostituzione RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("startSostituzione unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    return success(message=message), status_code


# Simulation: Spostamento
@bp.route("/simulation/spostamento/start", methods=["POST"])
def start_spostamento():
    body = request.get_json(silent=True) or {}
    req = ServingEndpointSpostamentoRequest.from_body(body)
    actor_identity, identity_source = resolve_request_user_identity(request)

    missing = req.retrieve_missing_parameters()
    if missing:
        return error(
            message=f"Parametri obbligatori mancanti: {', '.join(missing)}",
            errors=["missing_params"],
        ), 400

    logger.info(
        "startSpostamento | scenario_type=%s program=%s channel=%s date=%s from=%s to=%s destination=%s %s %s user_email=%s user_email_source=%s",
        req.scenario_type,
        req.program_name,
        req.program_channel,
        req.program_date,
        req.program_from_time,
        req.program_to_time,
        req.new_channel,
        req.new_date,
        req.new_from_time,
        actor_identity,
        identity_source,
    )

    try:
        logic = get_simulation_logic()
        message, status_code = logic.start_spostamento(req, actor_identity)
        if (status_code == 202):
            message = Messages.SIMULATION_SPOSTAMENTO_STARTED
    except ValueError as e:
        return error(message=str(e), errors=["missing_params"]), 400
    except RuntimeError as e:
        logger.error("startSpostamento RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("startSpostamento unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    return success(message=message), status_code


@bp.route("/simulation/sostituzione/<simulation_id>/retry", methods=["POST"])
def retry_sostituzione(simulation_id):
    actor_identity, identity_source = resolve_request_user_identity(request)
    logger.info("retrySostituzione | id=%s user_email=%s user_email_source=%s", simulation_id, actor_identity, identity_source)
    try:
        logic = get_simulation_logic()
        message, status_code = logic.retry_sostituzione(simulation_id, actor_identity)
    except ValueError as e:
        return error(message=str(e), errors=["invalid_state"]), 400
    except RuntimeError as e:
        logger.error("retrySostituzione RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("retrySostituzione unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500
    broker.broadcast("scenarios_changed", {})
    return success(message=message), status_code


@bp.route("/simulation/spostamento/<simulation_id>/retry", methods=["POST"])
def retry_spostamento(simulation_id):
    actor_identity, identity_source = resolve_request_user_identity(request)
    logger.info("retrySpostamento | id=%s user_email=%s user_email_source=%s", simulation_id, actor_identity, identity_source)
    try:
        logic = get_simulation_logic()
        message, status_code = logic.retry_spostamento(simulation_id, actor_identity)
    except ValueError as e:
        return error(message=str(e), errors=["invalid_state"]), 400
    except RuntimeError as e:
        logger.error("retrySpostamento RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("retrySpostamento unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500
    broker.broadcast("scenarios_changed", {})
    return success(message=message), status_code
