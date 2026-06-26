from app.services.databricks_service import DatabricksService


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
