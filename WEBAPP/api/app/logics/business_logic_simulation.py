import logging
import threading
import uuid
from datetime import datetime, timezone

from app.services.databricks_service_simulation import DatabricksServiceSimulation
from app.models.simulation_request import SimulationSostRequest
from app.view_models.simulation import (
    ProgramItemViewModel,
    ProgramListViewModel,
    CompetitorItemViewModel,
    CompetitorListViewModel,
    SimResultSostViewModel,
    SimResultSpostaViewModel,
    ScheduleItemViewModel,
    ChannelScheduleViewModel,
)
from app.view_models.weekly_programming import OtherProgramViewModel


class BusinessLogicSimulation:
    def __init__(self, service: DatabricksServiceSimulation) -> None:
        self._service = service
        self._logger = logging.getLogger(__name__)


    def get_target_programs(
        self,
        day,
    ) -> list[OtherProgramViewModel]:
        try:
            rows = self._service.get_out_palinsesto_predict_all_slots(day=day)
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero del palinsesto RAI: {e}") from e

        return [
            OtherProgramViewModel.MapRaiProgramViewModelFromProgram(row)
            for row in rows
        ]


    def get_candidate_programs(self) -> list[OtherProgramViewModel]:
        try:
            rows = self._service.get_candidate_programs()
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero dei programmi candidati: {e}") from e

        return [
            OtherProgramViewModel.MapOtherProgramViewModelFromProgram(row)
            for row in rows
        ]


    def start_sostituzione(self, req: SimulationSostRequest) -> tuple[str, int]:
        """Apply the decision logic for a new Sostituzione simulation request.

        Returns a (message, http_status) tuple.
        """
        program_name     = req.program_name
        program_channel  = req.program_channel
        program_share_predict = req.program_share_predict
        program_date     = req.program_date
        program_from_time = req.program_from_time
        scenario_type    = req.scenario_type
        new_program_name = req.new_program_name
        new_program_share_storico = req.new_program_share_storico

        missing = [
            k for k, v in {
                "program_name": program_name,
                "program_channel": program_channel,
                "program_date": program_date,
                "program_from_time": program_from_time,
                "scenario_type": scenario_type,
                "new_program_name": new_program_name,
                "new_program_share_storico": new_program_share_storico,
            }.items() if v is None
        ]
        if missing:
            raise ValueError(f"Campi obbligatori mancanti: {', '.join(missing)}")

        now = datetime.now(timezone.utc)

        rows = self._service.get_scenario_simulations(
            program_name=program_name,
            program_channel=program_channel,
            program_date=program_date,
            program_from_time=program_from_time,
            scenario_type=scenario_type,
        )

        # ── Step 1: existing scenario? ────────────────────────────────
        if rows:
            scenario_id = rows[0]["sce_id"]

            # ── Step 2: existing simulation for same new_program_name? ─
            sim_rows = [
                r for r in rows
                if r.get("sim_id") is not None
                and r.get("new_program_name") == new_program_name
            ]

            if sim_rows:
                sim = sim_rows[0]
                simulation_id = sim["sim_id"]

                # ── Step 3: is_retry? ──────────────────────────────────
                if sim["is_retry"]:
                    # 3.Y — reset and restart
                    self._service.update_simulation(
                        simulation_id,
                        status="Running",
                        modified_date=now,
                        last_error=None,
                        is_retry=False,
                    )
                    self._launch_thread(simulation_id, req.to_payload())
                    return "Simulazione avviata. Lo stato può essere verificato nella pagina Scenari.", 202

                else:
                    # 3.N — check current status for a precise message
                    status = sim["status"]
                    if status == "Running":
                        return "Simulazione già in corso.", 409
                    else:  # Completed
                        return "Non è possibile ripetere una simulazione già completata.", 409

            else:
                # ── Step 4: fewer than 3 simulations on this scenario? ─
                sim_count = len([r for r in rows if r.get("sim_id") is not None])
                if sim_count < 3:
                    simulation_id = str(uuid.uuid4())
                    self._service.insert_simulation({
                        "id": simulation_id,
                        "id_scenario": scenario_id,
                        "new_program_name": new_program_name,
                        "new_program_share_storico": new_program_share_storico,
                        "share_result": None,
                        "status": "Running",
                        "creation_date": now,
                        "modified_date": now,
                        "last_error": None,
                        "is_retry": False,
                    })
                    self._launch_thread(simulation_id, req.to_payload())
                    return "Simulazione avviata. Lo stato può essere verificato nella pagina Scenari.", 202
                else:
                    return (
                        "Impossibile avviare la simulazione: "
                        "numero massimo di simulazioni raggiunto per questo scenario.",
                        409,
                    )

        else:
            # ── Step 1.N: create scenario + simulation ─────────────────
            scenario_id = str(uuid.uuid4())
            self._service.insert_scenario({
                "id": scenario_id,
                "scenario_type": scenario_type,
                "program_name": program_name,
                "program_channel": program_channel,
                "program_share_predict": program_share_predict,
                "program_date": program_date,
                "program_from_time": program_from_time,
                "creation_date": now,
            })

            simulation_id = str(uuid.uuid4())
            self._service.insert_simulation({
                "id": simulation_id,
                "id_scenario": scenario_id,
                "new_program_name": new_program_name,
                "new_program_share_storico": new_program_share_storico,
                "share_result": None,
                "status": "Running",
                "creation_date": now,
                "modified_date": now,
                "last_error": None,
                "is_retry": False,
            })
            self._launch_thread(simulation_id, req.to_payload())
            return "Simulazione avviata. Lo stato può essere verificato nella pagina Scenari.", 202


    def retry_simulation(self, simulation_id: str) -> tuple[str, int]:
        """Validate a failed simulation then delegate to start_sostituzione."""
        try:
            row = self._service.get_simulation_for_retry(simulation_id)
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero della simulazione: {e}") from e

        if row is None:
            raise ValueError("Simulazione non trovata")
        if row.get("status") != "Failed" or not row.get("is_retry"):
            raise ValueError("Solo le simulazioni fallite possono essere rilanciate")

        req = SimulationSostRequest(
            program_name=row.get("program_name"),
            program_channel=row.get("program_channel"),
            program_date=str(row.get("program_date")) if row.get("program_date") else None,
            program_from_time=row.get("program_from_time"),
            scenario_type=row.get("scenario_type"),
            new_program_name=row.get("new_program_name"),
            new_program_share_storico=row.get("new_program_share_storico"),
            program_share_predict=row.get("program_share_predict"),
        )
        return self.start_sostituzione(req)


    def _launch_thread(self, simulation_id: str, body: dict) -> None:
        thread = threading.Thread(
            target=self._run_simulation_async,
            args=(simulation_id, body),
            daemon=True,
        )
        thread.start()
        self._logger.info("_launch_thread | simulation_id=%s thread started", simulation_id)


    def _run_simulation_async(self, simulation_id: str, payload: dict) -> None:
        """Background thread: calls the AI service and updates the simulation record."""
        from app.services.databricks_service_simulation import DatabricksServiceSimulation  # noqa: PLC0415
        from app.services.ai_service import AiService  # noqa: PLC0415

        logger = logging.getLogger(__name__)
        svc = DatabricksServiceSimulation()
        ai = AiService()

        try:
            logger.info("_run_simulation_async | simulation_id=%s START", simulation_id)
            result = ai.call_sostituzione(payload)
            svc.update_simulation(
                simulation_id,
                share_result=result["predicted_share_pct"],
                status="Completed",
                modified_date=datetime.now(timezone.utc),
            )
            logger.info("_run_simulation_async | simulation_id=%s COMPLETED result=%s", simulation_id, result["predicted_share_pct"])
        except Exception as exc:
            logger.exception("_run_simulation_async | simulation_id=%s FAILED: %s", simulation_id, exc)
            svc.update_simulation(
                simulation_id,
                status="Failed",
                modified_date=datetime.now(timezone.utc),
                last_error=str(exc),
                is_retry=True,
            )