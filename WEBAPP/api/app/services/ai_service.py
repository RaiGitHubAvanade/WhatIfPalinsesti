import logging
import random
import time
import requests

from app.config import Config
from databricks.sdk.core import Config as DatabricksConfig

class AiService:
    def __init__(self) -> None:
        self._logger = logging.getLogger(__name__)
        
        cfg = DatabricksConfig()
        self._host = cfg.host
        self._headers = {
            **cfg.authenticate(),
            "Content-Type": "application/json",
        }
        self._session = requests.Session()

    # ------------------------------------------------------------------ #
    # Sostituzione
    # ------------------------------------------------------------------ #

    def call_sostituzione(self, payload: dict) -> dict:
        """POST *payload* to the Databricks Serving Endpoint for Sostituzione
        and return the parsed JSON response.
        """
        self._logger.info("AiService.call_sostituzione | payload=%s", payload)
        
        if(Config.MOCK_SIMULATION_SOSTITUZIONE_RESULT):
            time.sleep(30)
            return {
                "predictions": {
                    "predicted_share_pct": round(random.uniform(0, 20), 1),
                    "shap_values": {},
                }
            }

        response = self._session.post(
            f"{self._host}/serving-endpoints/{Config.SOSTITUZIONE_ENDPOINT}/invocations",
            headers=self._headers,
            json=payload,
            timeout=Config.SOSTITUZIONE_TIMEOUT_SECONDS,
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

        if(Config.MOCK_SIMULATION_SPOSTAMENTO_RESULT):
            time.sleep(30)
            return {
                "predictions": {
                    "predicted_share_pct": round(random.uniform(0, 20), 1),
                    "shap_values": {},
                }
            }

        response = self._session.post(
            f"{self._host}/serving-endpoints/{Config.SPOSTAMENTO_ENDPOINT}/invocations",
            headers=self._headers,
            json=payload,
            timeout=Config.SPOSTAMENTO_TIMEOUT_SECONDS,
        )

        response.raise_for_status()
        return response.json()
