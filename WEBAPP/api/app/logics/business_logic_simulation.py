import logging
import threading
import uuid
from collections.abc import Callable
from datetime import datetime, timezone

from app.config import Config
from app.logics.simulation_handlers import SimulationHandlerFactory
from app.utils.messages import Messages
from app.services.databricks_service_simulation import DatabricksServiceSimulation
from app.models.serving_endpoint_sostituzione_request import ServingEndpointSostituzioneRequest
from app.models.serving_endpoint_spostamento_request import ServingEndpointSpostamentoRequest
from app.view_models.simulation import (
    CandidateProgramViewModel,
    DestinationProgramViewModel,
    TargetProgramViewModel,
)


class BusinessLogicSimulation:
    def __init__(
        self,
        service: DatabricksServiceSimulation,
        handler_factory: SimulationHandlerFactory,
        background_handler_factory_provider: Callable[[], SimulationHandlerFactory],
    ) -> None:
        self._base_service = service
        self._handler_factory = handler_factory
        self._background_handler_factory_provider = background_handler_factory_provider
        self._logger = logging.getLogger(__name__)


    def get_target_programs(
        self,
        day,
    ) -> list[TargetProgramViewModel]:
        try:
            rows = self._base_service.get_target_programs(day=day)
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero del palinsesto RAI: {e}") from e

        return [
            TargetProgramViewModel.from_target_program(row)
            for row in rows
        ]


    def get_candidate_programs(self, share_predicted: float, duration: int) -> list[CandidateProgramViewModel]:
        offset = Config.CANDIDATES_DURATION_OFFSET_MINUTES
        min_duration = duration - offset if duration - offset > 0 else 0
        max_duration = duration + offset
        try:
            rows = self._base_service.get_candidate_programs(share_predicted=share_predicted, min_duration=min_duration, max_duration=max_duration)
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero dei programmi candidati: {e}") from e

        return [
            CandidateProgramViewModel.from_candidate_program(row)
            for row in rows
        ]


    def get_schedule_programs(
        self,
        day,
    ) -> list[DestinationProgramViewModel]:
        try:
            rows = self._base_service.get_schedule_programs(day=day)
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero del palinsesto destinazione: {e}") from e

        return [
            DestinationProgramViewModel.from_destination_program(row)
            for row in rows
        ]


    def start_sostituzione(self, req: ServingEndpointSostituzioneRequest, actor_identity: str | None = None) -> tuple[str, int]:
        return self.start_simulation(req, "sostituzione", actor_identity)


    def start_spostamento(self, req: ServingEndpointSpostamentoRequest, actor_identity: str | None = None) -> tuple[str, int]:
        return self.start_simulation(req, "spostamento", actor_identity)


    def can_proceed_to_step_3(self, program_id: str, scenario_type: str) -> tuple[bool, int]:
        handler = self._handler_factory.get_handler(scenario_type)

        try:
            simulation_count = handler.get_scenario_simulation_count(program_id, scenario_type)
        except Exception as e:
            raise RuntimeError(f"Errore nella validazione del limite simulazioni: {e}") from e

        can_proceed = simulation_count < Config.MAX_SIMULATIONS_PER_SCENARIO
        return can_proceed, simulation_count


    def start_simulation(
        self,
        req: ServingEndpointSostituzioneRequest | ServingEndpointSpostamentoRequest,
        simulation_type: str,
        actor_identity: str | None = None,
    ) -> tuple[str, int]:
        now = datetime.now(timezone.utc)
        handler = self._handler_factory.get_handler(simulation_type)

        rows = handler.get_scenario_simulations(req)

        if rows:
            scenario_id = rows[0]["sce_id"]

            sim_rows = [
                r for r in rows
                if r.get("sim_id") is not None and handler.is_same_simulation(r, req)
            ]

            if sim_rows:
                sim = sim_rows[0]
                simulation_id = sim["sim_id"]

                if sim["is_retry"]:
                    update_fields = {
                        "status": "Running",
                        "modified_date": now,
                        "last_error": None,
                        "is_retry": False,
                        "user_email": actor_identity,
                    }

                    handler.update_simulation(simulation_id, **update_fields)
                    self._launch_thread(simulation_id, req.to_payload(), simulation_type)
                    return "", 202

                status = sim["status"]
                if status == "Running":
                    return Messages.SIMULATION_ALREADY_RUNNING, 200
                return Messages.SIMULATION_ALREADY_COMPLETED, 200

            sim_count = len([r for r in rows if r.get("sim_id") is not None])
            if sim_count < Config.MAX_SIMULATIONS_PER_SCENARIO:
                simulation_id = str(uuid.uuid4())
                handler.insert_simulation(simulation_id, scenario_id, req, actor_identity, now)
                self._base_service.update_scenario(scenario_id, modified_date=now)
                self._launch_thread(simulation_id, req.to_payload(), simulation_type)
                return "", 202
            return Messages.SIMULATION_SCENARIO_LIMIT_REACHED, 200

        scenario_id = str(uuid.uuid4())
        self._base_service.insert_scenario({
            "id": scenario_id,
            "scenario_type": req.scenario_type,
            "program_id": req.program_id,
            "program_name": req.program_name,
            "program_channel": req.program_channel,
            "program_share_predict": req.program_share_predict,
            "program_date": req.program_date,
            "program_from_time": req.program_from_time,
            "program_to_time": req.program_to_time,
            "creation_date": now,
            "modified_date": now,
        })

        simulation_id = str(uuid.uuid4())
        handler.insert_simulation(simulation_id, scenario_id, req, actor_identity, now)
        self._launch_thread(simulation_id, req.to_payload(), simulation_type)
        return "", 202


    def retry_sostituzione(self, simulation_id: str, actor_identity: str | None = None) -> tuple[str, int]:
        return self._retry_simulation(simulation_id, "sostituzione", actor_identity)


    def retry_spostamento(self, simulation_id: str, actor_identity: str | None = None) -> tuple[str, int]:
        return self._retry_simulation(simulation_id, "spostamento", actor_identity)


    def _retry_simulation(self, simulation_id: str, simulation_type: str, actor_identity: str | None = None) -> tuple[str, int]:
        handler = self._handler_factory.get_handler(simulation_type)

        try:
            row = handler.get_simulation_for_retry(simulation_id)
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero della simulazione: {e}") from e

        if row is None:
            raise ValueError(Messages.SIMULATION_NOT_FOUND)
        if row.get("status") != "Failed" or not row.get("is_retry"):
            raise ValueError(Messages.SIMULATION_RETRY_ON_NOT_FAILED)

        req = handler.build_retry_request(row)

        missing = req.retrieve_missing_parameters()
        if missing:
            raise ValueError(f"Campi obbligatori mancanti: {', '.join(missing)}")

        return self.start_simulation(req, simulation_type, actor_identity)


    def _launch_thread(self, simulation_id: str, body: dict, simulation_type: str) -> None:
        thread = threading.Thread(
            target=self._run_simulation_async,
            args=(simulation_id, body, simulation_type),
            daemon=True,
        )
        thread.start()
        self._logger.info(
            "_launch_thread | simulation_id=%s simulation_type=%s thread started",
            simulation_id,
            simulation_type,
        )


    def _run_simulation_async(self, simulation_id: str, payload: dict, simulation_type: str) -> None:
        """Background thread: calls the AI service and updates the simulation record."""
        logger = logging.getLogger(__name__)
        handler_factory = self._background_handler_factory_provider()
        handler = handler_factory.get_handler(simulation_type)

        try:
            logger.info("_run_simulation_async | simulation_id=%s simulation_type=%s START", simulation_id, simulation_type)
            result = handler.predict(payload)
            now = datetime.now(timezone.utc)
            handler.on_success(simulation_id, result, now)
            predictions = result["predictions"]
            logger.info("_run_simulation_async | simulation_id=%s simulation_type=%s COMPLETED result=%s", simulation_id, simulation_type, predictions["predicted_share_pct"])
        except Exception as exc:
            logger.exception("_run_simulation_async | simulation_id=%s simulation_type=%s FAILED: %s", simulation_id, simulation_type, exc)
            handler.on_failure(simulation_id, str(exc), datetime.now(timezone.utc))
        finally:
            handler_factory.close()