import logging
from dataclasses import asdict

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
