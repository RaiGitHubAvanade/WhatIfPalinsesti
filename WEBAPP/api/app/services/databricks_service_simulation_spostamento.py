import json

from app.services.databricks_service_simulation import DatabricksServiceSimulation


class DatabricksServiceSimulationSpostamento(DatabricksServiceSimulation):
    """Databricks SQL operations specific to simulazioni spostamento."""

    def get_scenario_simulation_count(self, program_id: str, scenario_type: str) -> int:
        query = """
            SELECT COUNT(sim.id) AS simulation_count
            FROM ta_coll.whatif.webapp_scenarios sce
            LEFT JOIN ta_coll.whatif.webapp_simulations_spostamento sim
                   ON sce.id = sim.id_scenario
            WHERE sce.program_id = :program_id
              AND sce.scenario_type = :scenario_type
        """
        params = {
            "program_id": program_id,
            "scenario_type": scenario_type,
        }

        self._logger.info(f"get_scenario_simulation_count | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            row = cursor.fetchone()

        return int(row[0]) if row else 0

    def get_scenario_simulations(
        self,
        program_id: str,
        program_name: str,
        program_channel: str,
        program_date: str,
        program_from_time: str,
        program_to_time: str | None,
        scenario_type: str,
    ) -> list[dict]:
        query = """
            SELECT
                sce.id               AS sce_id,
                sce.scenario_type,
                sce.program_id,
                sce.program_name,
                sce.program_channel,
                sce.program_date,
                sce.program_from_time,
                sce.program_to_time,
                sce.program_share_predict,
                sce.creation_date    AS sce_creation_date,
                sim.id               AS sim_id,
                sim.id_scenario,
                sim.new_channel,
                sim.new_date,
                sim.new_from_time,
                sim.schedule,
                sim.share_result,
                sim.status,
                sim.creation_date    AS sim_creation_date,
                sim.modified_date,
                sim.last_error,
                sim.is_retry
            FROM ta_coll.whatif.webapp_scenarios sce
            LEFT JOIN ta_coll.whatif.webapp_simulations_spostamento sim
                   ON sce.id = sim.id_scenario
            WHERE sce.program_id        = :program_id
              AND sce.program_name      = :program_name
              AND sce.program_channel   = :program_channel
              AND sce.program_date      = :program_date
              AND sce.program_from_time = :program_from_time
              AND sce.program_to_time   = :program_to_time
              AND sce.scenario_type     = :scenario_type
        """
        params = {
            "program_id": program_id,
            "program_name": program_name,
            "program_channel": program_channel,
            "program_date": program_date,
            "program_from_time": program_from_time,
            "program_to_time": program_to_time,
            "scenario_type": scenario_type,
        }

        self._logger.info(f"get_scenario_simulations | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return rows

    def insert_simulation(self, simulation: dict) -> None:
        params = {
            **simulation,
            "schedule": json.dumps([str(item) for item in (simulation.get("schedule") or [])]),
        }

        query = """
            INSERT INTO ta_coll.whatif.webapp_simulations_spostamento
                (id, id_scenario, new_channel, new_date, new_from_time, schedule,
                 share_result, status, creation_date, modified_date,
                 last_error, is_retry)
            VALUES
                (:id, :id_scenario, :new_channel, :new_date, :new_from_time,
                 from_json(:schedule, 'ARRAY<STRING>'),
                 :share_result, :status, :creation_date, :modified_date,
                 :last_error, :is_retry)
        """

        self._logger.info(f"insert_simulation | with id {simulation.get('id')}, scenario_id {simulation.get('id_scenario')}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)

    def update_simulation(self, simulation_id: str, **fields) -> None:
        # Filter out fields not present in live schema/environment.
        if "shap_values" in fields:
            fields = {k: v for k, v in fields.items() if k != "shap_values"}

        if not fields:
            return

        set_parts: list[str] = []
        params: dict = {"simulation_id": simulation_id}

        for key, value in fields.items():
            if value is None:
                set_parts.append(f"{key} = NULL")
            elif isinstance(value, dict):
                set_parts.append(f"{key} = from_json(:{key}, 'MAP<STRING,DOUBLE>')")
                params[key] = json.dumps(value)
            else:
                set_parts.append(f"{key} = :{key}")
                params[key] = value

        query = f"""
            UPDATE ta_coll.whatif.webapp_simulations_spostamento
            SET    {', '.join(set_parts)}
            WHERE  id = :simulation_id
        """

        self._logger.info(f"update_simulation | with id {simulation_id}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)

    def get_simulation_for_retry(self, simulation_id: str) -> dict | None:
        query = """
            SELECT
                sim.id               AS sim_id,
                sim.new_channel,
                sim.new_date,
                sim.new_from_time,
                sim.schedule,
                sim.status,
                sim.is_retry,
                sce.id               AS sce_id,
                sce.scenario_type,
                sce.program_id,
                sce.program_name,
                sce.program_channel,
                sce.program_date,
                sce.program_from_time,
                sce.program_to_time,
                sce.program_share_predict
            FROM ta_coll.whatif.webapp_simulations_spostamento sim
            JOIN ta_coll.whatif.webapp_scenarios sce
              ON sim.id_scenario = sce.id
            WHERE sim.id = :simulation_id
        """
        params = {"simulation_id": simulation_id}

        self._logger.info(f"get_simulation_for_retry | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            columns = [col[0] for col in cursor.description]
            row = cursor.fetchone()

        return dict(zip(columns, row)) if row else None

