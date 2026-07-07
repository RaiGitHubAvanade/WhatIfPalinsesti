import logging
import os
import random
import time

import requests
from app.utils.number_utils import NumberUtils
from databricks.sdk import WorkspaceClient

from app.config import Config


class AiService:
    def __init__(self) -> None:
        self._logger = logging.getLogger(__name__)
        self._databricks_client = WorkspaceClient()

    # ------------------------------------------------------------------ #
    # Sostituzione
    # ------------------------------------------------------------------ #

    def call_sostituzione(self, payload: dict) -> dict:
        """POST *payload* to the Databricks Serving Endpoint for Sostituzione
        and return the parsed JSON response.
        """
        self._logger.info("AiService.call_sostituzione | payload=%s", payload)
        headers = {
            **self._databricks_client.config.authenticate(),
            "Content-Type": "application/json",
        }
        response = requests.post(
            Config.DATABRICKS_SOSTITUZIONE_ENDPOINT,
            headers=headers,
            json=payload,
            timeout=120,
        )
        response.raise_for_status()
        return response.json()

    def call_sostituzione_token(self, payload: dict) -> dict:
        """Temporary: POST *payload* using a PAT from DATABRICKS_TOKEN env var."""
        self._logger.info("AiService.call_sostituzione_token | payload=%s", payload)
        token = Config.DATABRICKS_TOKEN_SIMULAZIONE
        
        if not token:
            raise ValueError("DATABRICKS_TOKEN environment variable is not set")
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        response = requests.post(
            Config.DATABRICKS_SOSTITUZIONE_ENDPOINT,
            headers=headers,
            json=payload,
            timeout=240,
        )
        response.raise_for_status()
        return response.json()

    def call_sostituzione_mocked(self, payload: dict) -> dict:
        """Mocked version of call_sostituzione for testing purposes."""
        self._logger.info("AiService.call_sostituzione_mocked | payload=%s", payload)
        
        # Return a mocked response
        time.sleep(30)
        raw = random.uniform(0, 10)
        return {
            "predictions": {
                "predicted_share_pct": NumberUtils.round_share(raw),
                "shap_values": {
                    "StoricoShare_precedente": round(random.uniform(-3, 3), 4),
                    "TargetEta_vs_competitor": round(random.uniform(-2, 2), 4),
                    "StoricoShare_competitor": round(random.uniform(-2, 2), 4),
                },
            }
        }