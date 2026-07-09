from __future__ import annotations

from datetime import datetime

from app.models.simulation_request import SimulationSostRequest, SimulationSpostRequest
from app.services.ai_service import AiService
from app.services.databricks_service_simulation_sostituzione import DatabricksServiceSimulationSostituzione
from app.services.databricks_service_simulation_spostamento import DatabricksServiceSimulationSpostamento


class SostituzioneSimulationHandler:
    simulation_type = "sostituzione"

    def __init__(self, service: DatabricksServiceSimulationSostituzione, ai_service: AiService) -> None:
        self._service = service
        self._ai_service = ai_service

    def get_scenario_simulations(self, req: SimulationSostRequest) -> list[dict]:
        return self._service.get_scenario_simulations(
            program_name=req.program_name,
            program_channel=req.program_channel,
            program_date=req.program_date,
            program_from_time=req.program_from_time,
            program_to_time=req.program_to_time,
            scenario_type=req.scenario_type,
        )

    def is_same_simulation(self, row: dict, req: SimulationSostRequest) -> bool:
        return row.get("new_program_name") == req.new_program_name

    def insert_simulation(self, simulation_id: str, scenario_id: str, req: SimulationSostRequest, now: datetime) -> None:
        self._service.insert_simulation({
            "id": simulation_id,
            "id_scenario": scenario_id,
            "new_program_name": req.new_program_name,
            "new_program_share_storico": req.new_program_share_storico,
            "share_result": None,
            "status": "Running",
            "creation_date": now,
            "modified_date": now,
            "last_error": None,
            "is_retry": False,
        })

    def update_simulation(self, simulation_id: str, **fields) -> None:
        self._service.update_simulation(simulation_id, **fields)

    def get_simulation_for_retry(self, simulation_id: str) -> dict | None:
        return self._service.get_simulation_for_retry(simulation_id)

    def build_retry_request(self, row: dict) -> SimulationSostRequest:
        return SimulationSostRequest(
            program_name=row.get("program_name"),
            program_channel=row.get("program_channel"),
            program_date=str(row.get("program_date")) if row.get("program_date") else None,
            program_from_time=row.get("program_from_time"),
            program_to_time=row.get("program_to_time"),
            scenario_type=row.get("scenario_type"),
            new_program_name=row.get("new_program_name"),
            new_program_share_storico=row.get("new_program_share_storico"),
            program_share_predict=row.get("program_share_predict"),
        )

    def predict(self, payload: dict) -> dict:
        return self._ai_service.call_sostituzione(payload)

    def on_success(self, simulation_id: str, result: dict, now: datetime) -> None:
        predictions = result["predictions"]
        self.update_simulation(
            simulation_id,
            share_result=predictions["predicted_share_pct"],
            shap_values=predictions.get("shap_values"),
            status="Completed",
            modified_date=now,
        )

    def on_failure(self, simulation_id: str, error_message: str, now: datetime) -> None:
        self.update_simulation(
            simulation_id,
            status="Failed",
            modified_date=now,
            last_error=error_message,
            is_retry=True,
        )

    def close(self) -> None:
        self._service.close()


class SpostamentoSimulationHandler:
    simulation_type = "spostamento"

    def __init__(self, service: DatabricksServiceSimulationSpostamento, ai_service: AiService) -> None:
        self._service = service
        self._ai_service = ai_service

    def get_scenario_simulations(self, req: SimulationSpostRequest) -> list[dict]:
        return self._service.get_scenario_simulations(
            program_name=req.program_name,
            program_channel=req.program_channel,
            program_date=req.program_date,
            program_from_time=req.program_from_time,
            program_to_time=req.program_to_time,
            scenario_type=req.scenario_type,
        )

    def is_same_simulation(self, row: dict, req: SimulationSpostRequest) -> bool:
        return (
            row.get("new_channel") == req.new_channel
            and str(row.get("new_date")) == str(req.new_date)
            and row.get("new_from_time") == req.new_from_time
        )

    def insert_simulation(self, simulation_id: str, scenario_id: str, req: SimulationSpostRequest, now: datetime) -> None:
        self._service.insert_simulation({
            "id": simulation_id,
            "id_scenario": scenario_id,
            "new_channel": req.new_channel,
            "new_date": req.new_date,
            "new_from_time": req.new_from_time,
            "share_result": None,
            "status": "Running",
            "creation_date": now,
            "modified_date": now,
            "last_error": None,
            "is_retry": False,
        })

    def update_simulation(self, simulation_id: str, **fields) -> None:
        self._service.update_simulation(simulation_id, **fields)

    def get_simulation_for_retry(self, simulation_id: str) -> dict | None:
        return self._service.get_simulation_for_retry(simulation_id)

    def build_retry_request(self, row: dict) -> SimulationSpostRequest:
        return SimulationSpostRequest(
            program_name=row.get("program_name"),
            program_channel=row.get("program_channel"),
            program_date=str(row.get("program_date")) if row.get("program_date") else None,
            program_from_time=row.get("program_from_time"),
            program_to_time=row.get("program_to_time"),
            scenario_type=row.get("scenario_type"),
            new_channel=row.get("new_channel"),
            new_date=str(row.get("new_date")) if row.get("new_date") else None,
            new_from_time=row.get("new_from_time"),
            program_share_predict=row.get("program_share_predict"),
        )

    def predict(self, payload: dict) -> dict:
        return self._ai_service.call_spostamento(payload)

    def on_success(self, simulation_id: str, result: dict, now: datetime) -> None:
        predictions = result["predictions"]
        self.update_simulation(
            simulation_id,
            share_result=predictions["predicted_share_pct"],
            shap_values=predictions.get("shap_values"),
            status="Completed",
            modified_date=now,
        )

    def on_failure(self, simulation_id: str, error_message: str, now: datetime) -> None:
        self.update_simulation(
            simulation_id,
            status="Failed",
            modified_date=now,
            last_error=error_message,
            is_retry=True,
        )

    def close(self) -> None:
        self._service.close()


class SimulationHandlerFactory:
    def __init__(self, sostituzione_handler: SostituzioneSimulationHandler, spostamento_handler: SpostamentoSimulationHandler) -> None:
        self._handlers = {
            "sostituzione": sostituzione_handler,
            "spostamento": spostamento_handler,
        }

    def get_handler(self, simulation_type: str):
        handler = self._handlers.get(simulation_type)
        if handler is None:
            raise ValueError(f"Tipo simulazione non supportato: {simulation_type}")
        return handler

    def close(self) -> None:
        for handler in self._handlers.values():
            close = getattr(handler, "close", None)
            if callable(close):
                close()
