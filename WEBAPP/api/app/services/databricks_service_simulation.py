from datetime import date, datetime

from app.models.program import Program
from app.services.databricks_service import DatabricksService


class DatabricksServiceSimulation(DatabricksService):
    """Production simulation service backed by real Databricks SQL."""


    def get_target_programs(
        self,
        day: date,
    ) -> list[Program]:
        """Fetch all programs for the given day (channel/time filtering done client-side)."""
        query = """
            SELECT ID, Canale, Data, Programma, orario_inizio, orario_fine,
                   share_predetto, target_genere, target_eta, DES_GENERE_ESTESA_INT, durata_minuti
            FROM ta_coll.whatif.out_palinsesto_predict_all_slots
            WHERE Data = :day
            ORDER BY orario_inizio
        """
        params = {"day": day}
        
        self._logger.info(f"get_target_programs | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        return [Program.MapProgramFromRaiPredictRow(row) for row in rows]


    def get_schedule_programs(
        self,
        day: date,
    ) -> list[Program]:
        """Fetch schedule programs for a specific day (client-side channel/time filtering)."""
        query = """
            SELECT ID, Canale, Data, Programma, orario_inizio, orario_fine,
                   share_predetto, target_genere, target_eta, DES_GENERE_ESTESA_INT
            FROM ta_coll.whatif.out_palinsesto_predict_all_slots
            WHERE Data = :day
            ORDER BY orario_inizio
        """
        params = {"day": day}

        self._logger.info(f"get_schedule_programs | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        return [Program.MapProgramFromRaiPredictRow(row) for row in rows]
    

    def get_candidate_programs(self, share_predicted: float, min_duration: int, max_duration: int) -> list[Program]:
        """Fetch all candidate replacement programs (filtering done client-side)."""
        query = """
            SELECT titolo, canale, tipologia, genere, eta, share_storico_pct, durata_minuti
            FROM ta_coll.whatif.output_lista_programmi_sostituzione
            WHERE share_storico_pct >= :share_predicted
              AND durata_minuti BETWEEN :min_duration AND :max_duration
            ORDER BY share_storico_pct DESC
        """
        params = {
            "share_predicted": share_predicted,
            "min_duration": min_duration,
            "max_duration": max_duration,
        }
        self._logger.info(f"get_candidate_programs | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        return [Program.MapProgramFromCandidateRow(row) for row in rows]


    def insert_scenario(self, scenario: dict) -> None:
        """Insert a new row into webapp_scenarios."""
        query = """
            INSERT INTO ta_coll.whatif.webapp_scenarios
                (id, scenario_type, program_id, program_name, program_channel,
                 program_share_predict, program_date, program_from_time, program_to_time,
                 creation_date, modified_date)
            VALUES
                (:id, :scenario_type, :program_id, :program_name, :program_channel,
                 :program_share_predict, :program_date, :program_from_time, :program_to_time,
                 :creation_date, :modified_date)
        """
        self._logger.info(f"insert_scenario | with id {scenario.get('id')}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=scenario)


    def update_scenario(self, scenario_id: str, modified_date: datetime) -> None:
        """Update an existing row in webapp_scenarios."""
        
        query = f"""
            UPDATE ta_coll.whatif.webapp_scenarios
            SET modified_date = :modified_date
            WHERE id = :scenario_id
        """
        params = {"scenario_id": scenario_id, "modified_date": modified_date}
        self._logger.info(f"update_scenario | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
