from datetime import date, timedelta

from app.models.competitor_program import CompetitorProgram
from app.models.rai_program import RaiProgram
from app.services.databricks_service import DatabricksService
from app.utils.date_time_utils import DateTimeUtils


class DatabricksServiceWeeklyProgramming(DatabricksService):

    ### --- Weekly Table --- ###

    def get_palinsesto_delta(
            self,
            channel: str,
            from_day: date,
            to_day: date
    ) -> list[RaiProgram]:
        query = """
            SELECT ID, Canale, Data, Programma, orario_inizio, orario_fine, share_predetto, 
                share_manuale, share_reale 
            FROM ta_coll.whatif.output_palinsesto_delta 
            WHERE Canale = :channel 
                AND Data BETWEEN :from_day AND :to_day 
            ORDER BY Data, orario_inizio
        """
        params = {
            "channel": channel,
            "from_day": from_day,
            "to_day": to_day,
        }

        self._logger.info(f"get_palinsesto_delta | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        return [RaiProgram.map_from_row(row) for row in rows]

    def get_palinsesto_current_week(
            self,
            channel: str,
            from_day: date,
            to_day: date,
            today: date,
    ) -> list[RaiProgram]:
        yesterday = today - timedelta(days=1)
        query = """
            SELECT ID, Canale, Data, Programma, orario_inizio, orario_fine,
                   share_predetto, share_manuale, share_reale
            FROM ta_coll.whatif.output_palinsesto_delta
            WHERE Canale = :channel
              AND Data BETWEEN :from_day AND :yesterday

            UNION ALL

            SELECT ID, Canale, Data, Programma, orario_inizio, orario_fine,
                   share_predetto, share_manuale, NULL AS share_reale
            FROM ta_coll.whatif.out_palinsesto_predict
            WHERE Canale = :channel
              AND Data BETWEEN :today AND :to_day

            ORDER BY Data, orario_inizio
        """
        params = {
            "channel":  channel,
            "from_day": from_day,
            "yesterday": yesterday,
            "today":    today,
            "to_day":   to_day,
        }

        self._logger.info(f"get_palinsesto_current_week | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        return [RaiProgram.map_from_row(row) for row in rows]

    def get_palinsesto_predict(
            self,
            channel: str,
            from_day: date,
            to_day: date
    ) -> list[RaiProgram]:
        query = """
            SELECT ID, Canale, Data, Programma, orario_inizio, orario_fine, share_predetto, 
                share_manuale 
            FROM ta_coll.whatif.out_palinsesto_predict 
            WHERE Canale = :channel 
                AND Data BETWEEN :from_day AND :to_day 
            ORDER BY Data, orario_inizio
        """
        params = {
            "channel": channel,
            "from_day": from_day,
            "to_day": to_day,
        }
        
        self._logger.info(f"get_palinsesto_predict | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        return [RaiProgram.map_from_row(row) for row in rows]



    ### --- Edit Share_Manuale --- ###

    def edit_manual_share_predict(
        self,
        row_id: str,
        db_value: float | None,
    ) -> None:
        query_set = "share_manuale = NULL" if db_value is None else "share_manuale = :db_value"
        query = f"""
            UPDATE ta_coll.whatif.out_palinsesto_predict
            SET {query_set}
            WHERE ID = :row_id
        """
        params = {"row_id": row_id}
        if db_value is not None:
            params["db_value"] = db_value

        self._logger.info(f"edit_manual_share_predict | with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)



    ### --- Competitors --- ###

    def get_vw_output_palinsesto_futuro(
        self,
        channel_order: list[str],
        day: date,
        from_time: str,
        to_time: str,
    ) -> list[CompetitorProgram]:
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