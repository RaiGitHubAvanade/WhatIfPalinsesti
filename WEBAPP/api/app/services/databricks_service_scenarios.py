from app.services.databricks_service import DatabricksService
from app.models.program import Program
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
    ) -> list[dict]:
        """Return flat rows from webapp_scenarios LEFT JOIN webapp_simulations_sostituzione."""
        conditions, params = self._base_params(search, program_date)
        extra_where = (" AND " + " AND ".join(conditions)) if conditions else ""

        query = f"""
            SELECT
                sce.id                       AS scenario_id,
                sce.scenario_type,
                sce.program_name,
                sce.program_channel,
                sce.program_date,
                sce.program_from_time,
                sce.program_share_predict,
                sce.creation_date            AS scenario_creation_date,
                sim.id                       AS simulation_id,
                sim.new_program_name,
                sim.new_program_share_storico,
                sim.share_result,
                sim.status,
                sim.creation_date            AS simulation_creation_date,
                sim.modified_date,
                sim.last_error,
                sim.is_retry
            FROM ta_coll.whatif.webapp_scenarios sce
            LEFT JOIN ta_coll.whatif.webapp_simulations_sostituzione sim
                   ON sce.id = sim.id_scenario
            WHERE sce.scenario_type = 'sostituzione'{extra_where}
            ORDER BY sce.creation_date DESC, sim.creation_date ASC
        """

        self._logger.info(f"Query: {query} with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return rows


    def get_delete_informations(self, simulation_id: str) -> tuple[str, str] | None:
        """Return (id_scenario, scenario_type) for the given simulation_id, searching both tables."""
        query = """
            SELECT sim.id_scenario, sce.scenario_type
            FROM ta_coll.whatif.webapp_simulations_sostituzione sim
            JOIN ta_coll.whatif.webapp_scenarios sce ON sce.id = sim.id_scenario
            WHERE sim.id = :simulation_id
            UNION ALL
            SELECT sim.id_scenario, sce.scenario_type
            FROM ta_coll.whatif.webapp_simulations_spostamento sim
            JOIN ta_coll.whatif.webapp_scenarios sce ON sce.id = sim.id_scenario
            WHERE sim.id = :simulation_id
        """
        params = {"simulation_id": simulation_id}

        self._logger.info(f"Query: {query} with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            row = cursor.fetchone()

        if row is None:
            return None
        return str(row[0]), str(row[1])


    def delete_simulation_sostituzione(self, simulation_id: str) -> None:
        """Delete a row from webapp_simulations_sostituzione."""
        query = """
            DELETE FROM ta_coll.whatif.webapp_simulations_sostituzione
            WHERE id = :simulation_id
        """
        params = {"simulation_id": simulation_id}

        self._logger.info(f"Query: {query} with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            

    def delete_simulation_spostamento(self, simulation_id: str) -> None:
        """Delete a row from webapp_simulations_spostamento."""
        query = """
            DELETE FROM ta_coll.whatif.webapp_simulations_spostamento
            WHERE id = :simulation_id
        """
        params = {"simulation_id": simulation_id}

        self._logger.info(f"Query: {query} with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)


    def delete_scenario(self, scenario_id: str) -> None:
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

        self._logger.info(f"Query: {query} with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)


    def get_spostamento_scenarios(
        self,
        search: str | None = None,
        program_date: str | None = None,
    ) -> list[dict]:
        """Return flat rows from webapp_scenarios LEFT JOIN webapp_simulations_spostamento."""
        conditions, params = self._base_params(search, program_date)
        extra_where = (" AND " + " AND ".join(conditions)) if conditions else ""

        query = f"""
            SELECT
                sce.id                       AS scenario_id,
                sce.scenario_type,
                sce.program_name,
                sce.program_channel,
                sce.program_date,
                sce.program_from_time,
                sce.program_share_predict,
                sce.creation_date            AS scenario_creation_date,
                sim.id                       AS simulation_id,
                sim.new_channel,
                sim.new_date,
                sim.new_from_time,
                sim.share_result,
                sim.status,
                sim.creation_date            AS simulation_creation_date,
                sim.modified_date,
                sim.last_error,
                sim.is_retry
            FROM ta_coll.whatif.webapp_scenarios sce
            LEFT JOIN ta_coll.whatif.webapp_simulations_spostamento sim
                   ON sce.id = sim.id_scenario
            WHERE sce.scenario_type = 'spostamento'{extra_where}
            ORDER BY sce.creation_date DESC, sim.creation_date ASC
        """
        
        self._logger.info(f"Query: {query} with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return rows


    ### --- Competitors --- ###

    def get_vw_output_palinsesto_futuro_detailed(
        self,
        channel_order: list[str],
        day,
        from_time: str,
        to_time: str,
    ) -> list[Program]:
        """Fetch future programs overlapping [from_time, to_time] on the given day,
        including ID, share_storico and evento_forte for competitor display."""
        channel_params = {f"ch{i}": ch for i, ch in enumerate(channel_order)}
        placeholders = ", ".join(f":ch{i}" for i in range(len(channel_order)))
        query = f"""
            SELECT Canale, Data, Programma, orario_inizio, orario_fine, ID, share_storico, evento_forte
            FROM ta_coll.whatif.vw_output_palinsesto_futuro_ui
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

        self._logger.info(f"Query: {query} with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        return [Program.MapProgramFromFutureRowDetailed(row) for row in rows]