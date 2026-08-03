import logging
from dataclasses import asdict
from datetime import date

from flask import Blueprint, request

from app.container import get_scenarios_service
from app.logics.business_logic_scenarios import BusinessLogicScenarios
from app.models.api_response import error, success
from app.utils.sse_broker import broker

logger = logging.getLogger(__name__)

bp = Blueprint("scenarios", __name__)


@bp.route("/scenarios")
def get_scenarios():
    search        = request.args.get("search") or None
    scenario_type = request.args.get("type")   or None
    program_date  = request.args.get("date")   or None

    logger.info(
        "getScenarios | search=%s type=%s date=%s",
        search, scenario_type, program_date,
    )

    try:
        logic  = BusinessLogicScenarios(get_scenarios_service())
        result = logic.get_scenarios(
            search=search,
            scenario_type=scenario_type,
            program_date=program_date,
        )
    except RuntimeError as e:
        logger.error("getScenarios RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("getScenarios unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    return success(data=asdict(result), message="Scenari ottenuti con successo")


@bp.route("/scenarios/simulation/sostituzione/<simulation_id>/delete", methods=["DELETE"])
def delete_simulation_sostituzione(simulation_id):
    logger.info("deleteSimulationSostituzione | id=%s", simulation_id)
    try:
        logic = BusinessLogicScenarios(get_scenarios_service())
        logic.delete_simulation_sostituzione(simulation_id)
    except RuntimeError as e:
        logger.error("deleteSimulationSostituzione RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("deleteSimulationSostituzione unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500
    broker.broadcast("scenarios_changed", {})
    return success(message="Simulazione eliminata con successo")


@bp.route("/scenarios/simulation/spostamento/<simulation_id>/delete", methods=["DELETE"])
def delete_simulation_spostamento(simulation_id):
    logger.info("deleteSimulationSpostamento | id=%s", simulation_id)
    try:
        logic = BusinessLogicScenarios(get_scenarios_service())
        logic.delete_simulation_spostamento(simulation_id)
    except RuntimeError as e:
        logger.error("deleteSimulationSpostamento RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("deleteSimulationSpostamento unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500
    broker.broadcast("scenarios_changed", {})
    return success(message="Simulazione eliminata con successo")


@bp.route("/scenarios/<scenario_id>/delete", methods=["DELETE"])
def delete_scenario(scenario_id):
    logger.info("deleteScenario | id=%s", scenario_id)
    try:
        logic = BusinessLogicScenarios(get_scenarios_service())
        logic.delete_scenario(scenario_id)
    except RuntimeError as e:
        logger.error("deleteScenario RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("deleteScenario unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500
    broker.broadcast("scenarios_changed", {})
    return success(message="Scenario eliminato con successo")


@bp.route("/scenarios/<scenario_id>/edit_scenario_name", methods=["POST"])
def edit_scenario_name(scenario_id):
    body = request.get_json(silent=True) or {}

    scenario_name = body.get("scenario_name")
    normalized_name = str(scenario_name or "").strip()

    if not scenario_id or not normalized_name:
        return error(
            message="I parametri 'scenario_id' e 'scenario_name' sono obbligatori",
            errors=["scenario_id and scenario_name required"],
        ), 400

    logger.info("editScenarioName | id=%s", scenario_id)
    try:
        logic = BusinessLogicScenarios(get_scenarios_service())
        logic.edit_scenario_name(scenario_id, normalized_name)
    except RuntimeError as e:
        logger.error("editScenarioName RuntimeError | id=%s error=%s", scenario_id, e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("editScenarioName unexpected | id=%s error=%s", scenario_id, e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    broker.broadcast("scenarios_changed", {})
    return success(message="Nome scenario aggiornato con successo")


@bp.route("/scenarios/simulation/getCompetitorPrograms")
def get_competitor_programs():
    channel = request.args.get("channel")
    day_str = request.args.get("day")
    from_time = request.args.get("from_time")
    logger.info(
        "getCompetitorPrograms called | channel=%s day=%s from_time=%s",
        channel, day_str, from_time,
    )

    if not channel or not day_str or not from_time:
        logger.warning(
            "getCompetitorPrograms: missing required params | channel=%s day=%s from_time=%s",
            channel, day_str, from_time,
        )
        return error(
            message="I parametri 'channel', 'day' e 'from_time' sono obbligatori",
            errors=["channel, day and from_time required"],
        ), 400

    try:
        day = date.fromisoformat(day_str)
    except ValueError:
        logger.warning("getCompetitorPrograms: invalid date format | day=%s", day_str)
        return error(
            message="Formato data non valido (atteso YYYY-MM-DD)",
            errors=["invalid day format"],
        ), 400

    try:
        logic = BusinessLogicScenarios(get_scenarios_service())
        result = logic.get_competitor_programs(channel, day, from_time)
    except RuntimeError as e:
        logger.error("getCompetitorPrograms: Databricks error | channel=%s day=%s error=%s", channel, day, e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("getCompetitorPrograms: unexpected error | channel=%s day=%s error=%s", channel, day, e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    logger.info("getCompetitorPrograms: success | channel=%s day=%s", channel, day)
    return success(data=asdict(result), message="Competitor ottenuti con successo")


@bp.route("/scenarios/simulation/toggle_evento_forte", methods=["POST"])
def toggle_evento_forte():
    body = request.get_json(silent=True) or {}
    competitor_id = body.get("id")
    logger.info("toggleEventoForte called | id=%s", competitor_id)

    if not competitor_id:
        return error(message="Il parametro 'id' è obbligatorio", errors=["missing id"]), 400

    try:
        logic = BusinessLogicScenarios(get_scenarios_service())
        logic.toggle_evento_forte(competitor_id)
    except RuntimeError as e:
        logger.error("toggleEventoForte: Databricks error | id=%s error=%s", competitor_id, e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("toggleEventoForte: unexpected error | id=%s error=%s", competitor_id, e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    logger.info("toggleEventoForte: success | id=%s", competitor_id)
    broker.broadcast("scenarios_changed", {})
    return success(message="Evento forte aggiornato con successo")


@bp.route("/scenarios/simulations/status", methods=["POST"])
def get_simulations_status():
    body = request.get_json(silent=True) or {}
    simulation_ids = body.get("simulation_ids")

    if not isinstance(simulation_ids, list):
        return error(
            message="Il parametro 'simulation_ids' deve essere una lista",
            errors=["simulation_ids must be a list"],
        ), 400

    if len(simulation_ids) > 200:
        return error(
            message="Numero massimo di simulation_ids superato (max 200)",
            errors=["too_many_ids"],
        ), 400

    logger.info("getSimulationsStatus | ids=%d", len(simulation_ids))

    try:
        logic = BusinessLogicScenarios(get_scenarios_service())
        statuses = logic.get_simulations_status(simulation_ids)
    except RuntimeError as e:
        logger.error("getSimulationsStatus RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("getSimulationsStatus unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    return success(data={"items": statuses}, message="Stati simulazioni ottenuti con successo")
