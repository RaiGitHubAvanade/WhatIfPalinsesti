import logging
import random
import time
import requests

from app.config import Config
from app.models.prediction import Prediction
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


    def call_sostituzione(self, payload: dict) -> Prediction:
        return self._invoke_simulation(
            operation="AiService.call_sostituzione",
            endpoint=Config.SOSTITUZIONE_ENDPOINT,
            payload=payload,
            timeout_seconds=Config.SOSTITUZIONE_TIMEOUT_SECONDS,
            use_mock=Config.MOCK_SIMULATION_SOSTITUZIONE_RESULT,
        )


    def call_spostamento(self, payload: dict) -> Prediction:
        return self._invoke_simulation(
            operation="AiService.call_spostamento",
            endpoint=Config.SPOSTAMENTO_ENDPOINT,
            payload=payload,
            timeout_seconds=Config.SPOSTAMENTO_TIMEOUT_SECONDS,
            use_mock=Config.MOCK_SIMULATION_SPOSTAMENTO_RESULT,
        )

    
    def _invoke_simulation(self, operation: str, endpoint: str, payload: dict, timeout_seconds: int, use_mock: bool) -> Prediction:
        self._logger.info("%s | payload=%s", operation, payload)

        if use_mock:
            return Prediction.from_dict(self._mock_prediction()["predictions"])

        response = self._session.post(
            url=f"{self._host}/serving-endpoints/{endpoint}/invocations",
            headers=self._headers,
            json=payload,
            timeout=timeout_seconds,
        )
        self._raise_for_status_with_error_body(response, operation)
        result = response.json()
        if not isinstance(result, dict):
            raise ValueError("La risposta del serving endpoint deve essere un oggetto JSON")
        return Prediction.from_dict(result.get("predictions"))


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
                "predicted_share_pct": round(random.uniform(0, 20), 2),
                "feature_explanations": [
                    {"feature_name": "HistoricalSharePreviousProgram", "feature_value": "1.2", "shap_value": -4.38},
                    {"feature_name": "HistoricalShareNextProgram", "feature_value": "26.1", "shap_value": 2.1},
                ],
            }
        }