from datetime import date, datetime

from app.models.candidate_program import CandidateProgram
from app.models.destination_program import DestinationProgram
from app.models.target_program import TargetProgram
from app.services.databricks_service import DatabricksService


class DatabricksServiceSimulation(DatabricksService):


    def get_target_programs(
        self,
        day: date,
    ) -> list[TargetProgram]:
        query = """
            SELECT ID, Canale, Data, Programma, orario_inizio, orario_fine,
                   share_predetto, target_genere, target_eta, DES_GENERE_ESTESA_INT, durata_minuti
            FROM out_palinsesto_predict_all_slots
            WHERE Data = :day
            ORDER BY orario_inizio
        """
        params = {"day": day}
        
        self._logger.info(f"get_target_programs | with params {params}")

        with self.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        return [TargetProgram.map_from_row(row) for row in rows]


    def get_schedule_programs(
        self,
        day: date,
    ) -> list[DestinationProgram]:
        query = """
            SELECT ID, Canale, Data, Programma, orario_inizio, orario_fine,
                     share_predetto, target_genere, target_eta, DES_GENERE_ESTESA_INT, durata_minuti
            FROM out_palinsesto_predict_all_slots
            WHERE Data = :day
            ORDER BY orario_inizio
        """
        params = {"day": day}

        self._logger.info(f"get_schedule_programs | with params {params}")

        with self.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        return [DestinationProgram.map_from_row(row) for row in rows]
    

    def get_candidate_programs(self, share_predicted: float, min_duration: int, max_duration: int) -> list[CandidateProgram]:
        query = """
            SELECT titolo, canale, tipologia, genere, eta, share_storico_pct, durata_minuti
            FROM output_lista_programmi_sostituzione
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

        with self.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        return [CandidateProgram.map_from_row(row) for row in rows]


    def insert_scenario(self, scenario: dict) -> None:
        query = """
            INSERT INTO webapp_scenarios
                (id, scenario_type, scenario_name, program_id, program_name, program_channel,
                 program_share_predict, program_date, program_from_time, program_to_time,
                 creation_date, modified_date)
            VALUES
                (:id, :scenario_type, :scenario_name, :program_id, :program_name, :program_channel,
                 :program_share_predict, :program_date, :program_from_time, :program_to_time,
                 :creation_date, :modified_date)
        """
        self._logger.info(f"insert_scenario | with id {scenario.get('id')}")

        with self.cursor() as cursor:
            cursor.execute(query, parameters=scenario)


    def update_scenario(self, scenario_id: str, modified_date: datetime) -> None:
        query = f"""
            UPDATE webapp_scenarios
            SET modified_date = :modified_date
            WHERE id = :scenario_id
        """
        params = {"scenario_id": scenario_id, "modified_date": modified_date}
        self._logger.info(f"update_scenario | with params {params}")

        with self.cursor() as cursor:
            cursor.execute(query, parameters=params)


    def edit_scenario_name(self, scenario_id: str, scenario_name: str, modified_date: datetime) -> None:
        query = """
            UPDATE webapp_scenarios
            SET scenario_name = :scenario_name,
                modified_date = :modified_date
            WHERE id = :scenario_id
        """
        params = {
            "scenario_id": scenario_id,
            "scenario_name": scenario_name,
            "modified_date": modified_date,
        }
        self._logger.info("edit_scenario_name | with params %s", {"scenario_id": scenario_id})

        with self.cursor() as cursor:
            cursor.execute(query, parameters=params)
