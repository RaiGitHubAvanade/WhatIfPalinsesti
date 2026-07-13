import logging
from datetime import date

from app.models.scenario import Scenario
from app.services.databricks_service_scenarios import DatabricksServiceScenarios
from app.view_models.scenarios import (
    ScenarioViewModel,
    ScenarioListViewModel,
    ScenCompetitorProgramsViewModel,
)
from app.config import Config
from app.utils.date_time_utils import DateTimeUtils


class BusinessLogicScenarios:
    def __init__(self, service: DatabricksServiceScenarios) -> None:
        self._service = service
        self._logger = logging.getLogger(__name__)


    def get_scenarios(
        self,
        search: str | None = None,
        scenario_type: str | None = None,
        program_date: str | None = None,
    ) -> ScenarioListViewModel:
        run_sost   = not scenario_type or scenario_type == "sostituzione"
        run_sposta = not scenario_type or scenario_type == "spostamento"

        try:
            sost_scenarios: list[Scenario] = (
                self._service.get_sostituzione_scenarios(search=search, program_date=program_date)
                if run_sost else []
            )
            sposta_scenarios: list[Scenario] = (
                self._service.get_spostamento_scenarios(search=search, program_date=program_date)
                if run_sposta else []
            )
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero degli scenari: {e}") from e

        view_models = [
            ScenarioViewModel.MapScenarioViewModelFromScenario(s)
            for s in sost_scenarios + sposta_scenarios
        ]

        sorted_list = sorted(view_models, key=lambda s: s.modified_date or "", reverse=True)
        return ScenarioListViewModel(scenarios=sorted_list, total=len(sorted_list))


    def delete_simulation_sostituzione(self, simulation_id: str) -> None:
        try:
            id_scenario = self._service.get_scenario_id_for_sostituzione_simulation(simulation_id)
            if id_scenario is None:
                raise ValueError(f"Simulazione non trovata: {simulation_id}")

            self._logger.info(
                "delete_simulation_sostituzione | id=%s id_scenario=%s",
                simulation_id,
                id_scenario,
            )

            self._service.delete_simulation_sostituzione(simulation_id)
            self._service.delete_scenario_if_empty(id_scenario)
        except Exception as e:
            raise RuntimeError(f"Errore nell'eliminazione della simulazione: {e}") from e


    def delete_simulation_spostamento(self, simulation_id: str) -> None:
        try:
            id_scenario = self._service.get_scenario_id_for_spostamento_simulation(simulation_id)
            if id_scenario is None:
                raise ValueError(f"Simulazione non trovata: {simulation_id}")

            self._logger.info(
                "delete_simulation_spostamento | id=%s id_scenario=%s",
                simulation_id,
                id_scenario,
            )

            self._service.delete_simulation_spostamento(simulation_id)
            self._service.delete_scenario_if_empty(id_scenario)
        except Exception as e:
            raise RuntimeError(f"Errore nell'eliminazione della simulazione: {e}") from e


    def delete_scenario(self, scenario_id: str) -> None:
        try:
            self._logger.info("delete_scenario | id=%s", scenario_id)

            self._service.delete_scenario(scenario_id)
        except Exception as e:
            raise RuntimeError(f"Errore nell'eliminazione dello scenario: {e}") from e


    def get_competitor_programs(
        self,
        channel: str,
        day: date,
        from_time: str,
    ) -> ScenCompetitorProgramsViewModel:
        """Return competitor programs overlapping the slot starting at from_time.
        to_time is computed as from_time + COMPETITORS_SLOT_DURATION_MINUTES."""
        raw_minutes = int(from_time[:2]) * 60 + int(from_time[3:5])
        to_time = DateTimeUtils.minutes_to_hhmm(raw_minutes + Config.COMPETITORS_SLOT_DURATION_MINUTES)

        channel_order = [c for c in Config.CHANNEL_ORDER_SIMULATION_DETAIL]

        try:
            rows = self._service.get_vw_output_palinsesto_futuro_ui(
                channel_order, day, from_time, to_time
            )
        except Exception as e:
            raise RuntimeError(
                f"Errore durante il recupero dei competitor per '{channel}' in data {day.isoformat()}: {e}"
            ) from e

        def _sort_key(row):
            try:
                priority = (0, channel_order.index(row.canale))
            except ValueError:
                priority = (1, row.canale)
            return (*priority, DateTimeUtils.hhmm_to_minutes(row.orario_inizio))

        rows.sort(key=_sort_key)

        return ScenCompetitorProgramsViewModel.MapFromRows(
            channel=channel,
            day=day.isoformat(),
            from_time=from_time,
            rows=rows,
        )


    def toggle_evento_forte(self, competitor_id: str) -> None:
        """Toggle evento_forte on a competitor program row."""
        try:
            self._service.toggle_evento_forte(competitor_id)
        except Exception as e:
            raise RuntimeError(f"Errore durante il toggle di evento_forte per id '{competitor_id}': {e}") from e


    def get_simulations_status(self, simulation_ids: list[str]) -> list[dict]:
        cleaned_ids = [str(sim_id).strip() for sim_id in simulation_ids if str(sim_id).strip()]
        if not cleaned_ids:
            return []

        try:
            return self._service.get_simulations_status(cleaned_ids)
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero dello stato simulazioni: {e}") from e
