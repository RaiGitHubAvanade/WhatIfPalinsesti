import logging
from dataclasses import asdict
from datetime import date

from flask import Blueprint, request

from app.container import get_scenarios_service
from app.logics.business_logic_scenarios import BusinessLogicScenarios
from app.models.api_response import error, success

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


@bp.route("/scenarios/simulation/<simulation_id>", methods=["DELETE"])
def delete_simulation(simulation_id):
    logger.info("deleteSimulation | id=%s", simulation_id)
    try:
        logic = BusinessLogicScenarios(get_scenarios_service())
        logic.delete_simulation(simulation_id)
    except RuntimeError as e:
        logger.error("deleteSimulation RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("deleteSimulation unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500
    return success(message="Simulazione eliminata con successo")


@bp.route("/scenarios/<scenario_id>", methods=["DELETE"])
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
    return success(message="Scenario eliminato con successo")


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
