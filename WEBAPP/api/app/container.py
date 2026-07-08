"""Dependency container using Flask's application context (g).

Services are created lazily on first access within a request and closed
automatically at the end of the request via teardown_appcontext.

Usage in a route:
    from app.container import get_databricks_service
    logic = BusinessLogicWeeklyProgramming(get_databricks_service())
"""

from flask import g

from app.services.databricks_service_weekly_programming import DatabricksServiceWeeklyProgramming
from app.services.databricks_service_simulation import DatabricksServiceSimulation
from app.services.databricks_service_simulation_sostituzione import DatabricksServiceSimulationSostituzione
from app.services.databricks_service_simulation_spostamento import DatabricksServiceSimulationSpostamento
from app.services.ai_service import AiService
from app.services.databricks_service_scenarios import DatabricksServiceScenarios
from app.logics.business_logic_simulation import BusinessLogicSimulation
from app.logics.simulation_handlers import SimulationHandlerFactory, SostituzioneSimulationHandler, SpostamentoSimulationHandler


def get_databricks_service() -> DatabricksServiceWeeklyProgramming:
    """Return the DatabricksServiceWeeklyProgramming for the current request context.

    A new instance is created on first call and reused for the lifetime
    of the request. The connection is closed by teardown_databricks_service.
    """
    if "databricks_service" not in g:
        g.databricks_service = DatabricksServiceWeeklyProgramming()
    return g.databricks_service


def teardown_databricks_service(exception=None) -> None:
    """Close the DatabricksService connection at end of request."""
    svc = g.pop("databricks_service", None)
    if svc is not None:
        svc.close()


def get_simulation_service() -> DatabricksServiceSimulation:
    """Return the DatabricksServiceSimulation for the current request context."""
    if "simulation_service" not in g:
        g.simulation_service = DatabricksServiceSimulation()
    return g.simulation_service


def get_simulation_service_sostituzione() -> DatabricksServiceSimulationSostituzione:
    """Return the DatabricksServiceSimulationSostituzione for the current request context."""
    if "simulation_service_sostituzione" not in g:
        g.simulation_service_sostituzione = DatabricksServiceSimulationSostituzione()
    return g.simulation_service_sostituzione


def get_simulation_service_spostamento() -> DatabricksServiceSimulationSpostamento:
    """Return the DatabricksServiceSimulationSpostamento for the current request context."""
    if "simulation_service_spostamento" not in g:
        g.simulation_service_spostamento = DatabricksServiceSimulationSpostamento()
    return g.simulation_service_spostamento


def get_ai_service() -> AiService:
    """Return AiService for the current request context."""
    if "ai_service" not in g:
        g.ai_service = AiService()
    return g.ai_service


def get_simulation_handler_factory() -> SimulationHandlerFactory:
    """Return typed simulation handler factory for current request context."""
    if "simulation_handler_factory" not in g:
        ai_service = get_ai_service()
        g.simulation_handler_factory = SimulationHandlerFactory(
            SostituzioneSimulationHandler(get_simulation_service_sostituzione(), ai_service),
            SpostamentoSimulationHandler(get_simulation_service_spostamento(), ai_service),
        )
    return g.simulation_handler_factory


def build_background_simulation_handler_factory() -> SimulationHandlerFactory:
    """Build a standalone handler factory for background threads."""
    ai_service = AiService()
    return SimulationHandlerFactory(
        SostituzioneSimulationHandler(DatabricksServiceSimulationSostituzione(), ai_service),
        SpostamentoSimulationHandler(DatabricksServiceSimulationSpostamento(), ai_service),
    )


def get_simulation_logic() -> BusinessLogicSimulation:
    """Return BusinessLogicSimulation configured with typed handlers for this request."""
    if "simulation_logic" not in g:
        g.simulation_logic = BusinessLogicSimulation(
            get_simulation_service(),
            get_simulation_handler_factory(),
            build_background_simulation_handler_factory,
        )
    return g.simulation_logic


def teardown_simulation_service(exception=None) -> None:
    """Close the simulation service at end of request (no-op in mock mode)."""
    g.pop("simulation_logic", None)
    g.pop("simulation_handler_factory", None)
    g.pop("ai_service", None)

    svc = g.pop("simulation_service", None)
    if svc is not None:
        svc.close()

    svc_sost = g.pop("simulation_service_sostituzione", None)
    if svc_sost is not None:
        svc_sost.close()

    svc_spost = g.pop("simulation_service_spostamento", None)
    if svc_spost is not None:
        svc_spost.close()


def get_scenarios_service() -> DatabricksServiceScenarios:
    """Return the DatabricksServiceScenarios for the current request context."""
    if "scenarios_service" not in g:
        g.scenarios_service = DatabricksServiceScenarios()
    return g.scenarios_service


def teardown_scenarios_service(exception=None) -> None:
    """Close the scenarios service connection at end of request."""
    svc = g.pop("scenarios_service", None)
    if svc is not None:
        svc.close()
