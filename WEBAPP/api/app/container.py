"""Dependency container using Flask's application context (g).

Services are created lazily on first access within a request and closed
automatically at the end of the request via teardown_appcontext.

Usage in a route:
    from app.container import get_databricks_service
    logic = WeeklyLogic(get_databricks_service())
"""

from flask import g

from app.services.databricks_service import DatabricksService


def get_databricks_service() -> DatabricksService:
    """Return the DatabricksService for the current request context.

    A new instance is created on first call and reused for the lifetime
    of the request. The connection is closed by teardown_databricks_service.
    """
    if "databricks_service" not in g:
        g.databricks_service = DatabricksService()
    return g.databricks_service


def teardown_databricks_service(exception=None) -> None:
    """Close the DatabricksService connection at end of request."""
    svc = g.pop("databricks_service", None)
    if svc is not None:
        svc.close()
