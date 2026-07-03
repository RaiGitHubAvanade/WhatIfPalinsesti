import random
import time
import logging

from app.utils.number_utils import NumberUtils


class AiService:
    def __init__(self) -> None:
        self._logger = logging.getLogger(__name__)

    # ------------------------------------------------------------------ #
    # Sostituzione
    # ------------------------------------------------------------------ #

    def call_sostituzione(self, payload: dict) -> dict:
        """Call the Serving Endpoint for a Sostituzione simulation.

        Mock: sleeps 30 s, then returns {"result": 5.00}.

        Production: POST to the Databricks Serving Endpoint with *payload*
        and return the parsed JSON response.
        """
        self._logger.info("AiService.call_sostituzione | payload=%s", payload)
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
