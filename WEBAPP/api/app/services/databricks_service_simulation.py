from datetime import date
import json

from app.models.program import Program
from app.utils.date_time_utils import DateTimeUtils
from app.services.databricks_service import DatabricksService


class DatabricksServiceSimulation(DatabricksService):
    """Production simulation service backed by real Databricks SQL."""


    def get_out_palinsesto_predict_all_slots(
        self,
        day: date,
    ) -> list[Program]:
        """Fetch all programs for the given day (channel/time filtering done client-side)."""
        query = """
            SELECT Canale, Data, Programma, orario_inizio, orario_fine,
                   share_predetto, target_genere, target_eta, DES_GENERE_ESTESA_INT
            FROM ta_coll.whatif.out_palinsesto_predict_all_slots
            WHERE Data = :day
            ORDER BY orario_inizio
        """
        params = {"day": day}
        
        self._logger.info(f"Query: {query} with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        return [Program.MapProgramFromRaiPredictRow(row) for row in rows]
    

    def get_candidate_programs(self) -> list[Program]:
        """Fetch all candidate replacement programs (filtering done client-side)."""
        query = """
            SELECT titolo, canale, tipologia, genere, eta, share_storico_pct
            FROM ta_coll.whatif.output_lista_programmi_sostituzione
            ORDER BY share_storico_pct DESC
        """
        self._logger.info(f"Query: {query}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters={})
            rows = cursor.fetchall()

        return [Program.MapProgramFromCandidateRow(row) for row in rows]


    def get_scenario_simulations(
        self,
        program_name: str,
        program_channel: str,
        program_date: str,
        program_from_time: str,
        scenario_type: str,
    ) -> list[dict]:
        """LEFT JOIN webapp_scenarios + webapp_simulations on matching keys."""
        query = """
            SELECT
                sce.id               AS sce_id,
                sce.scenario_type,
                sce.program_name,
                sce.program_channel,
                sce.program_date,
                sce.program_from_time,
                sce.program_share_predict,
                sce.creation_date    AS sce_creation_date,
                sim.id               AS sim_id,
                sim.id_scenario,
                sim.new_program_name,
                sim.new_program_share_storico,
                sim.share_result,
                sim.status,
                sim.creation_date    AS sim_creation_date,
                sim.modified_date,
                sim.last_error,
                sim.is_retry
            FROM ta_coll.whatif.webapp_scenarios sce
            LEFT JOIN ta_coll.whatif.webapp_simulations_sostituzione sim
                   ON sce.id = sim.id_scenario
            WHERE sce.program_name      = :program_name
              AND sce.program_channel   = :program_channel
              AND sce.program_date      = :program_date
              AND sce.program_from_time = :program_from_time
              AND sce.scenario_type     = :scenario_type
        """
        params = {
            "program_name": program_name,
            "program_channel": program_channel,
            "program_date": program_date,
            "program_from_time": program_from_time,
            "scenario_type": scenario_type,
        }
        
        self._logger.info(f"Query: {query} with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return rows


    def insert_scenario(self, scenario: dict) -> None:
        """Insert a new row into webapp_scenarios."""
        query = """
            INSERT INTO ta_coll.whatif.webapp_scenarios
                (id, scenario_type, program_name, program_channel,
                 program_share_predict, program_date, program_from_time,
                 creation_date)
            VALUES
                (:id, :scenario_type, :program_name, :program_channel,
                 :program_share_predict, :program_date, :program_from_time,
                 :creation_date)
        """
        self._logger.info(f"Query: {query} with id {scenario.get('id')}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=scenario)


    def insert_simulation(self, simulation: dict) -> None:
        """Insert a new row into webapp_simulations_sostituzione."""
        query = """
            INSERT INTO ta_coll.whatif.webapp_simulations_sostituzione
                (id, id_scenario, new_program_name, new_program_share_storico,
                 share_result, status, creation_date, modified_date,
                 last_error, is_retry)
            VALUES
                (:id, :id_scenario, :new_program_name, :new_program_share_storico,
                 :share_result, :status, :creation_date, :modified_date,
                 :last_error, :is_retry)
        """

        self._logger.info(f"Query: {query} with id {simulation.get('id')}, scenario_id {simulation.get('id_scenario')}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=simulation)


    def update_simulation(self, simulation_id: str, **fields) -> None:
        """Update specific fields on a webapp_simulations row.

        None values are rendered as NULL in the SET clause; all other
        values are passed as named parameters to avoid SQL injection.
        """
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
            UPDATE ta_coll.whatif.webapp_simulations_sostituzione
            SET    {', '.join(set_parts)}
            WHERE  id = :simulation_id
        """

        self._logger.info(f"Query: {query} with id {simulation_id}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)


    def get_simulation_for_retry(self, simulation_id: str) -> dict | None:
        """Fetch simulation + parent scenario data needed to relaunch the async job."""
        query = """
            SELECT
                sim.id               AS sim_id,
                sim.new_program_name,
                sim.new_program_share_storico,
                sim.status,
                sim.is_retry,
                sce.id               AS sce_id,
                sce.scenario_type,
                sce.program_name,
                sce.program_channel,
                sce.program_date,
                sce.program_from_time,
                sce.program_share_predict
            FROM ta_coll.whatif.webapp_simulations_sostituzione sim
            JOIN ta_coll.whatif.webapp_scenarios sce
              ON sim.id_scenario = sce.id
            WHERE sim.id = :simulation_id
        """
        params = {"simulation_id": simulation_id}

        self._logger.info(f"Query: {query} with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            columns = [col[0] for col in cursor.description]
            row = cursor.fetchone()
            
        return dict(zip(columns, row)) if row else None