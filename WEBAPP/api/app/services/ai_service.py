import logging
import random
import time
import requests

from app.config import Config
from app.utils.databricks_config_utils import build_databricks_config

class AiService:
    def __init__(self) -> None:
        self._logger = logging.getLogger(__name__)
        
        cfg = build_databricks_config()
        self._host = cfg.host
        self._headers = {
            **cfg.authenticate(),
            "Content-Type": "application/json",
        }
        self._session = requests.Session()


    def call_sostituzione(self, payload: dict) -> dict:
        return self._invoke_simulation(
            operation="AiService.call_sostituzione",
            endpoint=Config.SOSTITUZIONE_ENDPOINT,
            payload=payload,
            timeout_seconds=Config.SOSTITUZIONE_TIMEOUT_SECONDS,
            use_mock=Config.MOCK_SIMULATION_SOSTITUZIONE_RESULT,
        )


    def call_spostamento(self, payload: dict) -> dict:
        return self._invoke_simulation(
            operation="AiService.call_spostamento",
            endpoint=Config.SPOSTAMENTO_ENDPOINT,
            payload=payload,
            timeout_seconds=Config.SPOSTAMENTO_TIMEOUT_SECONDS,
            use_mock=Config.MOCK_SIMULATION_SPOSTAMENTO_RESULT,
        )

    
    def _invoke_simulation(self, operation: str, endpoint: str, payload: dict, timeout_seconds: int, use_mock: bool) -> dict:
        self._logger.info("%s | payload=%s", operation, payload)

        if use_mock:
            return self._mock_prediction()

        response = self._post_json(
            url=f"{self._host}/serving-endpoints/{endpoint}/invocations",
            headers=self._headers,
            json=payload,
            timeout=timeout_seconds,
        )
        self._raise_for_status_with_error_body(response, operation)
        return response.json()


    def _raise_for_status_with_error_body(self, response: requests.Response, operation: str) -> None:
        if not response.ok:
            self._logger.error(
                "%s | Databricks error status=%s body=%s",
                operation,
                response.status_code,
                response.text,
            )
        response.raise_for_status()


    def _mock_prediction(self) -> dict:
        time.sleep(30)
        return {
            "predictions": {
                "predicted_share_pct": round(random.uniform(0, 20), 1),
                "shap_values": {},
            }
        }