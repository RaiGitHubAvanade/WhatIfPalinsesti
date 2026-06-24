"""AI service — wraps calls to the Databricks Serving Endpoint.

The inner logic is currently mocked: waits 30 seconds, then returns a
fixed result. Replace the mock body with a real HTTP call to the
Serving Endpoint once credentials are available.
"""

import time
import logging


class AiService:
    def __init__(self) -> None:
        self._logger = logging.getLogger(__name__)

    # ------------------------------------------------------------------ #
    # Spostamento
    # ------------------------------------------------------------------ #

    def call_spostamento(self, payload: dict) -> dict:
        """Call the Serving Endpoint for a Spostamento simulation.

        Mock: sleeps 30 s, then returns {"result": 5.00}.

        Production: POST to the Databricks Serving Endpoint with *payload*
        and return the parsed JSON response.
        """
        self._logger.info("AiService.call_spostamento | payload=%s", payload)
        time.sleep(30)
        return {"result": 5.00}
