import logging
from datetime import date

from app.services.databricks_service_scenarios import DatabricksServiceScenarios
from app.view_models.scenarios import (
    SimulationSostViewModel,
    SimulationSpostViewModel,
    ScenarioViewModel,
    ScenarioListViewModel,
    ScenCompetitorProgramsViewModel,
)
from app.config import Config
from app.utils.date_time_utils import DateTimeUtils


def _to_iso(val) -> str | None:
    """Convert a DB date/datetime/time value to an ISO string, or None."""
    if val is None:
        return None
    if hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val)


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
            sost_rows: list[dict] = (
                self._service.get_sostituzione_scenarios(search=search, program_date=program_date)
                if run_sost else []
            )
            sposta_rows: list[dict] = (
                self._service.get_spostamento_scenarios(search=search, program_date=program_date)
                if run_sposta else []
            )
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero degli scenari: {e}") from e

        scenarios_map: dict[str, ScenarioViewModel] = {}
        seen_sim_ids: set[str] = set()

        for row in sost_rows:
            self._upsert_scenario(scenarios_map, row)
            sim_id = row.get("simulation_id")
            if sim_id is not None:
                sim_key = str(sim_id)
                if sim_key not in seen_sim_ids:
                    seen_sim_ids.add(sim_key)
                    scenarios_map[str(row["scenario_id"])].simulations.append(
                        SimulationSostViewModel(
                            id=sim_key,
                            new_program_name=row.get("new_program_name"),
                            new_program_share_storico=row.get("new_program_share_storico"),
                            share_result=row.get("share_result"),
                            status=row.get("status") or "Unknown",
                            creation_date=_to_iso(row.get("simulation_creation_date")),
                            modified_date=_to_iso(row.get("modified_date")),
                            last_error=row.get("last_error"),
                            is_retry=bool(row.get("is_retry", False)),
                        )
                    )

        for row in sposta_rows:
            self._upsert_scenario(scenarios_map, row)
            sim_id = row.get("simulation_id")
            if sim_id is not None:
                sim_key = str(sim_id)
                if sim_key not in seen_sim_ids:
                    seen_sim_ids.add(sim_key)
                    scenarios_map[str(row["scenario_id"])].simulations.append(
                        SimulationSpostViewModel(
                            id=sim_key,
                            new_channel=row.get("new_channel"),
                            new_date=_to_iso(row.get("new_date")),
                            new_from_time=_to_iso(row.get("new_from_time")),
                            share_result=row.get("share_result"),
                            status=row.get("status") or "Unknown",
                            creation_date=_to_iso(row.get("simulation_creation_date")),
                            modified_date=_to_iso(row.get("modified_date")),
                            last_error=row.get("last_error"),
                            is_retry=bool(row.get("is_retry", False)),
                        )
                    )

        sorted_list = sorted(
            scenarios_map.values(),
            key=lambda s: s.creation_date or "",
            reverse=True,
        )
        return ScenarioListViewModel(scenarios=sorted_list, total=len(sorted_list))


    def delete_simulation(self, simulation_id: str) -> None:
        try:
            info = self._service.get_delete_informations(simulation_id)
            if info is None:
                raise ValueError(f"Simulazione non trovata: {simulation_id}")
            id_scenario, scenario_type = info

            self._logger.info(
                "delete_simulation | id=%s id_scenario=%s scenario_type=%s",
                simulation_id, id_scenario, scenario_type,
            )

            if scenario_type == "sostituzione":
                self._service.delete_simulation_sostituzione(simulation_id)
            elif scenario_type == "spostamento":
                self._service.delete_simulation_spostamento(simulation_id)
            else:
                raise ValueError(f"Tipo di scenario sconosciuto: {scenario_type}")

            self._service.delete_scenario_if_empty(id_scenario)
        except Exception as e:
            raise RuntimeError(f"Errore nell'eliminazione della simulazione: {e}") from e


    def delete_scenario(self, scenario_id: str) -> None:
        try:
            self._logger.info("delete_scenario | id=%s", scenario_id)

            self._service.delete_scenario(scenario_id)
        except Exception as e:
            raise RuntimeError(f"Errore nell'eliminazione dello scenario: {e}") from e


    def _upsert_scenario(self, scenarios_map: dict, row: dict) -> None:
        """Insert a ScenarioViewModel into the map if not already present."""
        sce_id = str(row["scenario_id"])
        if sce_id not in scenarios_map:
            scenarios_map[sce_id] = ScenarioViewModel(
                id=sce_id,
                scenario_type=row.get("scenario_type") or "",
                program_name=row.get("program_name") or "",
                program_channel=row.get("program_channel") or "",
                program_date=_to_iso(row.get("program_date")),
                program_from_time=_to_iso(row.get("program_from_time")),
                program_share_predict=row.get("program_share_predict"),
                creation_date=_to_iso(row.get("scenario_creation_date")),
                simulations=[],
            )


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
            rows = self._service.get_vw_output_palinsesto_futuro_detailed(
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
