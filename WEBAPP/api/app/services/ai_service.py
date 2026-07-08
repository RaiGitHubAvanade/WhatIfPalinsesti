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
            timeout=Config.DATABRICKS_SOSTITUZIONE_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return response.json()

    # ------------------------------------------------------------------ #
    # Spostamento
    # ------------------------------------------------------------------ #

    def call_spostamento(self, payload: dict) -> dict:
        """POST *payload* to the Databricks Serving Endpoint for Spostamento
        and return the parsed JSON response.
        """
        self._logger.info("AiService.call_spostamento | payload=%s", payload)
        
        # headers = {
        #     **self._databricks_client.config.authenticate(),
        #     "Content-Type": "application/json",
        # }
        # response = requests.post(
        #     Config.DATABRICKS_SPOSTAMENTO_ENDPOINT,
        #     headers=headers,
        #     json=payload,
        #     timeout=Config.DATABRICKS_SPOSTAMENTO_TIMEOUT_SECONDS,
        # )
        # response.raise_for_status()
        
        return {
            "predictions": {
                "predicted_share_pct": 0.0,
                "shap_values": {},
            }
        }
