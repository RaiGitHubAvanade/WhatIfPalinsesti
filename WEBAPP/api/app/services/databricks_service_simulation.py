from datetime import date

from app.models.program import Program
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
