from app.services.databricks_service import DatabricksService
from app.models.competitor_program import CompetitorProgram
from app.models.scenario import Scenario
from app.models.simulation import SimulationSost, SimulationSposta
from app.utils.date_time_utils import DateTimeUtils


class DatabricksServiceScenarios(DatabricksService):
    """Production scenarios service backed by real Databricks SQL."""


    def _base_params(self, search: str | None, program_date: str | None) -> tuple[list[str], dict]:
        """Build the shared WHERE conditions and named parameters."""
        conditions: list[str] = []
        params: dict = {}

        if search:
            conditions.append("LOWER(sce.program_name) LIKE :search")
            params["search"] = f"%{search.lower()}%"
        if program_date:
            conditions.append("sce.program_date = :program_date")
            params["program_date"] = program_date

        return conditions, params


    def get_sostituzione_scenarios(
        self,
        search: str | None = None,
        program_date: str | None = None,
    ) -> list[Scenario]:
        """Return flat rows from webapp_scenarios LEFT JOIN webapp_simulations_sostituzione."""
        conditions, params = self._base_params(search, program_date)
        extra_where = (" AND " + " AND ".join(conditions)) if conditions else ""

        query = f"""
            SELECT
                sce.id                       AS scenario_id,
                sce.scenario_type,
                sce.program_id,
                sce.program_name,
                sce.program_channel,
                sce.program_date,
                sce.program_from_time,
                sce.program_to_time,
                sce.program_share_predict,
                sce.creation_date            AS scenario_creation_date,
                sce.modified_date            AS scenario_modified_date,
                sim.id                       AS simulation_id,
                sim.new_program_name,
                sim.new_program_share_storico,
                sim.share_result,
                sim.status,
                sim.creation_date            AS simulation_creation_date,
                sim.modified_date            AS simulation_modified_date,
                sim.last_error,
                sim.is_retry,
                sim.user_email
            FROM ta_coll.whatif.webapp_scenarios sce
            LEFT JOIN ta_coll.whatif.webapp_simulations_sostituzione sim
                   ON sce.id = sim.id_scenario
            WHERE sce.scenario_type = 'sostituzione'{extra_where}
            ORDER BY sce.modified_date DESC, sim.creation_date ASC
        """

        self._logger.info(f"get_sostituzione_scenarios | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        scenarios: dict[str, Scenario] = {}
        seen_sim_ids: set[str] = set()
        for row in rows:
            sce_id = str(row["scenario_id"])
            if sce_id not in scenarios:
                scenarios[sce_id] = Scenario.MapScenarioFromDict(row)
            sim_id = row.get("simulation_id")
            if sim_id is not None:
                sim_key = str(sim_id)
                if sim_key not in seen_sim_ids:
                    seen_sim_ids.add(sim_key)
                    scenarios[sce_id].simulations.append(SimulationSost.MapSimulationSostFromDict(row))
        return list(scenarios.values())


    def get_scenario_id_for_sostituzione_simulation(self, simulation_id: str) -> str | None:
        query = """
            SELECT id_scenario
            FROM ta_coll.whatif.webapp_simulations_sostituzione
            WHERE id = :simulation_id
        """
        params = {"simulation_id": simulation_id}

        self._logger.info(f"get_scenario_id_for_sostituzione_simulation | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            row = cursor.fetchone()

        return str(row[0]) if row else None


    def get_scenario_id_for_spostamento_simulation(self, simulation_id: str) -> str | None:
        query = """
            SELECT id_scenario
            FROM ta_coll.whatif.webapp_simulations_spostamento
            WHERE id = :simulation_id
        """
        params = {"simulation_id": simulation_id}

        self._logger.info(f"get_scenario_id_for_spostamento_simulation | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            row = cursor.fetchone()

        return str(row[0]) if row else None


    def delete_simulation_sostituzione(self, simulation_id: str) -> None:
        """Delete a row from webapp_simulations_sostituzione."""
        query = """
            DELETE FROM ta_coll.whatif.webapp_simulations_sostituzione
            WHERE id = :simulation_id
        """
        params = {"simulation_id": simulation_id}

        self._logger.info(f"delete_simulation_sostituzione | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            

    def delete_simulation_spostamento(self, simulation_id: str) -> None:
        """Delete a row from webapp_simulations_spostamento."""
        query = """
            DELETE FROM ta_coll.whatif.webapp_simulations_spostamento
            WHERE id = :simulation_id
        """
        params = {"simulation_id": simulation_id}

        self._logger.info(f"delete_simulation_spostamento | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)


    def delete_scenario_if_empty(self, scenario_id: str) -> None:
        """Delete the scenario if it has no remaining simulations in either table."""
        query = """
            DELETE FROM ta_coll.whatif.webapp_scenarios
            WHERE id = :id_scenario
            AND NOT EXISTS (
                SELECT 1
                    FROM ta_coll.whatif.webapp_simulations_sostituzione
                    WHERE id_scenario = :id_scenario
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM ta_coll.whatif.webapp_simulations_spostamento
                    WHERE id_scenario = :id_scenario
                )
        """
        params = {"id_scenario": scenario_id}

        self._logger.info(f"delete_scenario_if_empty | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)


    def delete_scenario(self, scenario_id: str) -> None:
        """Delete the scenario if it has no remaining simulations in either table."""
        query = """
            DELETE FROM ta_coll.whatif.webapp_scenarios
            WHERE id = :id_scenario
        """
        params = {"id_scenario": scenario_id}

        self._logger.info(f"delete_scenario | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)


    def get_spostamento_scenarios(
        self,
        search: str | None = None,
        program_date: str | None = None,
    ) -> list[Scenario]:
        """Return flat rows from webapp_scenarios LEFT JOIN webapp_simulations_spostamento."""
        conditions, params = self._base_params(search, program_date)
        extra_where = (" AND " + " AND ".join(conditions)) if conditions else ""

        query = f"""
            SELECT
                sce.id                       AS scenario_id,
                sce.scenario_type,
                sce.program_id,
                sce.program_name,
                sce.program_channel,
                sce.program_date,
                sce.program_from_time,
                sce.program_to_time,
                sce.program_share_predict,
                sce.creation_date            AS scenario_creation_date,
                sce.modified_date            AS scenario_modified_date,
                sim.id                       AS simulation_id,
                sim.new_channel,
                sim.new_date,
                sim.new_from_time,
                sim.share_result,
                sim.status,
                sim.creation_date            AS simulation_creation_date,
                sim.modified_date            AS simulation_modified_date,
                sim.last_error,
                sim.is_retry,
                sim.user_email
            FROM ta_coll.whatif.webapp_scenarios sce
            LEFT JOIN ta_coll.whatif.webapp_simulations_spostamento sim
                   ON sce.id = sim.id_scenario
            WHERE sce.scenario_type = 'spostamento'{extra_where}
            ORDER BY sce.modified_date DESC, sim.creation_date ASC
        """
        
        self._logger.info(f"get_spostamento_scenarios | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        scenarios: dict[str, Scenario] = {}
        seen_sim_ids: set[str] = set()
        for row in rows:
            sce_id = str(row["scenario_id"])
            if sce_id not in scenarios:
                scenarios[sce_id] = Scenario.MapScenarioFromDict(row)
            sim_id = row.get("simulation_id")
            if sim_id is not None:
                sim_key = str(sim_id)
                if sim_key not in seen_sim_ids:
                    seen_sim_ids.add(sim_key)
                    scenarios[sce_id].simulations.append(SimulationSposta.MapSimulationSpostaFromDict(row))
        return list(scenarios.values())


    def get_simulations_status(self, simulation_ids: list[str]) -> list[dict]:
        """Return status fields for the provided simulation IDs across both simulation tables."""
        if not simulation_ids:
            return []

        placeholders = ", ".join(f":id{i}" for i in range(len(simulation_ids)))
        params = {f"id{i}": sim_id for i, sim_id in enumerate(simulation_ids)}

        query = f"""
            SELECT
                sim.id,
                sim.status,
                sim.share_result,
                sim.last_error,
                sim.modified_date
            FROM ta_coll.whatif.webapp_simulations_sostituzione sim
            WHERE sim.id IN ({placeholders})

            UNION ALL

            SELECT
                sim.id,
                sim.status,
                sim.share_result,
                sim.last_error,
                sim.modified_date
            FROM ta_coll.whatif.webapp_simulations_spostamento sim
            WHERE sim.id IN ({placeholders})
        """

        self._logger.info("get_simulations_status | ids=%d", len(simulation_ids))

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        unique: dict[str, dict] = {}
        for row in rows:
            sim_id = str(row["id"])
            unique[sim_id] = {
                "id": sim_id,
                "status": row.get("status"),
                "share_result": row.get("share_result"),
                "last_error": row.get("last_error"),
                "modified_date": row.get("modified_date").isoformat() if hasattr(row.get("modified_date"), "isoformat") else str(row.get("modified_date")) if row.get("modified_date") is not None else None,
            }

        return list(unique.values())


    ### --- Competitors --- ###

    def get_vw_output_palinsesto_futuro(
        self,
        channel_order: list[str],
        day,
        from_time: str,
        to_time: str,
    ) -> list[CompetitorProgram]:
        """Fetch future programs overlapping [from_time, to_time] on the given day"""
        channel_params = {f"ch{i}": ch for i, ch in enumerate(channel_order)}
        placeholders = ", ".join(f":ch{i}" for i in range(len(channel_order)))
        query = f"""
            SELECT ID, Canale, Data, Programma, orario_inizio, orario_fine, share_storico, evento_forte
            FROM ta_coll.whatif.vw_output_palinsesto_futuro 
            WHERE Data = :day
            AND Canale IN ({placeholders})
            AND (
                CASE WHEN INT(split(orario_inizio, ':')[0]) < 6
                    THEN INT(split(orario_inizio, ':')[0]) * 60 + INT(split(orario_inizio, ':')[1]) + 1440
                    ELSE INT(split(orario_inizio, ':')[0]) * 60 + INT(split(orario_inizio, ':')[1])
                END
            ) < :overlap_to
            AND (
                CASE WHEN INT(split(orario_fine, ':')[0]) < 6
                    THEN INT(split(orario_fine, ':')[0]) * 60 + INT(split(orario_fine, ':')[1]) + 1440
                    ELSE INT(split(orario_fine, ':')[0]) * 60 + INT(split(orario_fine, ':')[1])
                END
            ) > :overlap_from
        """
        params = {
            "day": day,
            **channel_params,
            "overlap_to": DateTimeUtils.hhmm_to_minutes(to_time),
            "overlap_from": DateTimeUtils.hhmm_to_minutes(from_time),
        }

        self._logger.info(f"get_vw_output_palinsesto_futuro | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        return [CompetitorProgram.map_from_row(row) for row in rows]


    def toggle_evento_forte(self, competitor_id: str) -> None:
        """Toggle the evento_forte boolean on a single row in vw_output_palinsesto_futuro_ui."""
        query = """
            UPDATE ta_coll.whatif.output_palinsesto_competitor
            SET evento_forte = NOT evento_forte
            WHERE ID = :competitor_id
        """
        params = {"competitor_id": competitor_id}
        self._logger.info(f"toggle_evento_forte | with params {params}")
        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)