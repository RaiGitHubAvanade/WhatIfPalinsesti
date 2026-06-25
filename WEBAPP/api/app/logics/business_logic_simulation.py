"""Business logic for the simulation feature."""

import logging
import threading
import uuid
from datetime import datetime, timezone

from app.services.databricks_service_simulation import DatabricksServiceSimulation
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
from app.models.program import Program
from app.view_models.weekly_programming import OtherProgramViewModel


# ------------------------------------------------------------------ #
# Async simulation runner (module-level to avoid circular imports)
# ------------------------------------------------------------------ #

def _run_simulation_async(simulation_id: str, payload: dict) -> None:
    """Background thread: calls the AI service and updates the simulation record."""
    from app.services.databricks_service_simulation import DatabricksServiceSimulation  # noqa: PLC0415
    from app.services.ai_service import AiService  # noqa: PLC0415

    logger = logging.getLogger(__name__)
    svc = DatabricksServiceSimulation()
    ai = AiService()

    try:
        logger.info("_run_simulation_async | simulation_id=%s START", simulation_id)
        result = ai.call_spostamento(payload)
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


class BusinessLogicSimulation:
    def __init__(self, service: DatabricksServiceSimulation) -> None:
        self._service = service
        self._logger = logging.getLogger(__name__)


    def get_palinsesto_futuro_rai(
        self,
        day,
        channel: str | None = None,
        from_time: str | None = None,
        to_time: str | None = None,
    ) -> list[OtherProgramViewModel]:
        try:
            rows = self._service.get_output_palinsesto_rai(
                day=day, channel=channel, from_time=from_time, to_time=to_time
            )
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero del palinsesto RAI: {e}") from e

        return [
            OtherProgramViewModel.MapOtherProgramViewModelFromProgram(row)
            for row in rows
        ]

    def get_candidate_programs(
        self,
        program_name: str | None = None,
        channel: str | None = None,
        target_sex: str | None = None,
        target_age: str | None = None,
        min_share: float | None = None,
    ) -> list[OtherProgramViewModel]:
        try:
            rows = self._service.get_candidate_programs(
                program_name=program_name,
                channel=channel,
                target_sex=target_sex,
                target_age=target_age,
                min_share=min_share,
            )
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero dei programmi candidati: {e}") from e

        return [
            OtherProgramViewModel.MapOtherProgramViewModelFromProgram(row)
            for row in rows
        ]


    def start_spostamento(self, body: dict) -> tuple[str, int]:
        """Apply the decision logic for a new Spostamento simulation request.

        Returns a (message, http_status) tuple.
        """
        program_name     = body.get("program_name")
        program_channel  = body.get("program_channel")
        program_share_predict = body.get("program_share_predict")
        program_date     = body.get("program_date")
        program_from_time = body.get("program_from_time")
        scenario_type    = body.get("scenario_type")
        new_program_name = body.get("new_program_name")
        new_program_share_storico = body.get("new_program_share_storico")

        missing = [
            k for k, v in {
                "program_name": program_name,
                "program_channel": program_channel,
                "program_share_predict": program_share_predict,
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
                    self._launch_thread(simulation_id, body)
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
                    self._launch_thread(simulation_id, body)
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
            self._launch_thread(simulation_id, body)
            return "Simulazione avviata. Lo stato può essere verificato nella pagina Scenari.", 202

    def _launch_thread(self, simulation_id: str, body: dict) -> None:
        thread = threading.Thread(
            target=_run_simulation_async,
            args=(simulation_id, body),
            daemon=True,
        )
        thread.start()
        self._logger.info("_launch_thread | simulation_id=%s thread started", simulation_id)



# # ------------------------------------------------------------------ #
# # MOCKED
# # ------------------------------------------------------------------ #

    def get_programs(
        self,
        ch: str | None = None,
        date: str | None = None,
        from_time: str | None = None,
        to_time: str | None = None,
        search: str | None = None,
    ) -> ProgramListViewModel:
        try:
            rows = self._service.get_programs(
                ch=ch, date=date, from_time=from_time, to_time=to_time, search=search
            )
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero dei programmi: {e}") from e

        items = [
            ProgramItemViewModel(
                id=p["id"],
                title=p["title"],
                genre=p.get("genre"),
                time=p.get("time"),
                end=p.get("end"),
                dur=p.get("dur"),
                ch=p.get("ch", ""),
                share=p.get("share"),
                eta=p.get("eta"),
                sesso=p.get("sesso"),
                tipo=p.get("tipo"),
                slot=p.get("slot"),
            )
            for p in rows
        ]
        return ProgramListViewModel(programs=items, total=len(items))


    def get_candidates(
        self,
        exclude_id: str | None = None,
        ch: str | None = None,
        search: str | None = None,
        genere: str | None = None,
        eta: str | None = None,
        share_min: float | None = None,
        target_dur: int | None = None,
    ) -> ProgramListViewModel:
        try:
            rows = self._service.get_candidates(
                exclude_id=exclude_id,
                ch=ch,
                search=search,
                genere=genere,
                eta=eta,
                share_min=share_min,
                target_dur=target_dur,
            )
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero dei candidati: {e}") from e

        items = [
            ProgramItemViewModel(
                id=p["id"],
                title=p["title"],
                genre=p.get("genre"),
                time=p.get("time"),
                end=p.get("end"),
                dur=p.get("dur"),
                ch=p.get("ch", ""),
                share=p.get("share"),
                eta=p.get("eta"),
                sesso=p.get("sesso"),
                tipo=p.get("tipo"),
                slot=p.get("slot"),
            )
            for p in rows
        ]
        return ProgramListViewModel(programs=items, total=len(items))


    def get_competitors(self, slot: str | None = None) -> CompetitorListViewModel:
        try:
            rows = self._service.get_competitors(slot=slot)
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero dei competitor: {e}") from e

        items = [
            CompetitorItemViewModel(
                title=c["title"],
                ch=c.get("ch", ""),
                tipo=c.get("tipo"),
                share=c.get("share"),
                evento=c.get("evento", False),
            )
            for c in rows
        ]
        return CompetitorListViewModel(competitors=items)


    def simulate_sostituzione(
        self,
        orig_id: str,
        cand_id: str,
    ) -> SimResultSostViewModel:
        try:
            pred = self._service.predict_sostituzione(orig_id, cand_id)
        except Exception as e:
            raise RuntimeError(f"Errore nella simulazione di sostituzione: {e}") from e

        from app.data.mocked_data import PROGS  # noqa: PLC0415
        orig = next((p for p in PROGS if p["id"] == orig_id), {})
        cand = next((p for p in PROGS if p["id"] == cand_id), {})

        return SimResultSostViewModel(
            mode="sostituzione",
            orig_title=orig.get("title", orig_id),
            orig_share=orig.get("share"),
            orig_ch=orig.get("ch", ""),
            orig_time=orig.get("time"),
            orig_end=orig.get("end"),
            cand_title=cand.get("title", cand_id),
            cand_share=cand.get("share"),
            predicted_share=pred.get("pred"),
            delta=pred.get("delta"),
        )


    def simulate_spostamento(
        self,
        prog_id: str,
        dest_ch: str,
        dest_day: str,
        dest_time: str,
    ) -> SimResultSpostaViewModel:
        try:
            pred = self._service.predict_spostamento(prog_id, dest_ch, dest_time)
        except Exception as e:
            raise RuntimeError(f"Errore nella simulazione di spostamento: {e}") from e

        from app.data.mocked_data import PROGS  # noqa: PLC0415
        prog = next((p for p in PROGS if p["id"] == prog_id), {})

        return SimResultSpostaViewModel(
            mode="spostamento",
            prog_title=prog.get("title", prog_id),
            orig_ch=prog.get("ch", ""),
            orig_date=prog.get("date", ""),
            orig_time=prog.get("time"),
            orig_end=prog.get("end"),
            orig_slot_share=pred.get("orig_slot_share"),
            dest_ch=dest_ch,
            dest_date=dest_day,
            dest_time=dest_time,
            dest_slot_share=pred.get("dest_slot_share"),
            delta=pred.get("delta"),
        )


    def get_channel_schedule(
        self,
        ch: str,
        dest_time: str,
    ) -> ChannelScheduleViewModel:
        try:
            rows = self._service.get_channel_schedule(ch=ch, dest_time=dest_time)
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero del palinsesto: {e}") from e

        items = [
            ScheduleItemViewModel(
                id=p["id"],
                title=p["title"],
                time=p.get("time", ""),
                end=p.get("end"),
                dur=p.get("dur"),
                share=p.get("share"),
                tipo=p.get("tipo"),
                genre=p.get("genre"),
            )
            for p in rows
        ]
        return ChannelScheduleViewModel(
            ch=ch, date="", dest_time=dest_time, programs=items
        )