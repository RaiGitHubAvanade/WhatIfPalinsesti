"""Business logic for the simulation feature."""

import logging

from app.services.databricks_service_simulation import DatabricksServiceSimulation
from app.view_models.simulation_view_models import (
    ProgramItemViewModel,
    ProgramListViewModel,
    CompetitorItemViewModel,
    CompetitorListViewModel,
    SimResultSostViewModel,
    SimResultSpostaViewModel,
    ScheduleItemViewModel,
    ChannelScheduleViewModel,
)


class BusinessLogicSimulation:
    def __init__(self, service: DatabricksServiceSimulation) -> None:
        self._service = service
        self._logger = logging.getLogger(__name__)

    # ------------------------------------------------------------------ #
    # Programs
    # ------------------------------------------------------------------ #

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

    # ------------------------------------------------------------------ #
    # Candidates
    # ------------------------------------------------------------------ #

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

    # ------------------------------------------------------------------ #
    # Competitors
    # ------------------------------------------------------------------ #

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

    # ------------------------------------------------------------------ #
    # Simulation
    # ------------------------------------------------------------------ #

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

    # ------------------------------------------------------------------ #
    # Channel schedule
    # ------------------------------------------------------------------ #

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
