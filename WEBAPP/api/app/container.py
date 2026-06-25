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
from app.services.databricks_service_scenarios import DatabricksServiceScenarios


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


def teardown_simulation_service(exception=None) -> None:
    """Close the simulation service at end of request (no-op in mock mode)."""
    svc = g.pop("simulation_service", None)
    if svc is not None:
        svc.close()


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
