"""Databricks service for Weekly Programming — extends DatabricksService."""

from datetime import date

from app.models.palinsesto import Palinsesto
from app.models.other_channel import OtherChannel
from app.services.databricks_service import DatabricksService
from app.utils.date_time_utils import DateTimeUtils


class DatabricksServiceWeeklyProgramming(DatabricksService):

    ### --- Weekly Table --- ###

    def get_palinsesto_delta(self, channel: str, from_day: date, to_day: date) -> list[Palinsesto]:
        """Execute the query and return rows for the week containing *day*."""

        query = """
            SELECT Canale, Data, Programma, orario_inizio, orario_fine, share_predetto, 
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
        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        result = []
        for row in rows:
            palinsesto_delta = Palinsesto.MapPalinsestoDeltaFromRow(row)
            result.append(palinsesto_delta)
        return result

    def get_palinsesto_predict(self, channel: str, from_day: date, to_day: date) -> list[Palinsesto]:
        """Execute the query and return rows for the week containing *day*."""
        query = """
            SELECT Canale, Data, Programma, orario_inizio, orario_fine, share_predetto, 
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
        
        self._logger.info(f"Query: {query} with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        result = []
        for row in rows:
            palinsesto = Palinsesto.MapPalinsestoPredictFromRow(row)
            result.append(palinsesto)
        return result



    ### --- Edit Share_Manuale --- ###

    def edit_manual_share_predict(
        self,
        channel: str,
        program_name: str,
        from_time: str,
        to_time: str,
        day: date,
        db_value: float | None,
    ) -> None:
        """Update the share_manuale field on a single row in out_palinsesto_predict."""
        query_set = "share_manuale = NULL" if db_value is None else "share_manuale = :db_value"
        query = f"""
            UPDATE ta_coll.whatif.out_palinsesto_predict
            SET {query_set}
            WHERE Canale = :channel
              AND Programma = :program_name
              AND orario_inizio = :from_time
              AND orario_fine = :to_time
              AND Data = :day
        """
        params = {
            "channel": channel,
            "program_name": program_name,
            "from_time": from_time,
            "to_time": to_time,
            "day": day,
        }

        self._logger.info(f"Query: {query} with params {params}")

        if db_value is not None:
            params["db_value"] = db_value
        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)



    ### --- Competitors --- ###

    def get_storico_programmi(
        self,
        channel_order: list[str],
        day: date,
        from_time: str,
        to_time: str,
    ) -> list[OtherChannel]:
        """Fetch historical competitor programs overlapping [from_time, to_time] on the given day."""
        channel_params = {f"ch{i}": ch for i, ch in enumerate(channel_order)}
        placeholders = ", ".join(f":ch{i}" for i in range(len(channel_order)))
        query = f"""
            SELECT Canale, Programma, ORA_INIZIO_TRX, ORA_FINE_TRX 
            FROM ta_coll.whatif.storico_programmi 
            WHERE Data = :day 
            AND Canale IN ({placeholders}) 
            AND ORA_INIZIO_TRX < :to_seconds 
            AND ORA_FINE_TRX > :from_seconds 
        """
        params = {
            "day": day,
            **channel_params,
            "to_seconds": DateTimeUtils.hhmm_to_seconds(to_time),
            "from_seconds": DateTimeUtils.hhmm_to_seconds(from_time),
        }
        
        self._logger.info(f"Query: {query} with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        result = []
        for row in rows:
            result.append(OtherChannel.MapOtherChannelFromRowTRX(row))
        return result

    def get_vw_output_palinsesto_futuro(
        self,
        channel_order: list[str],
        day: date,
        from_time: str,
        to_time: str,
    ) -> list[OtherChannel]:
        """Fetch RAI programs overlapping [from_time, to_time] on the given day."""
        channel_params = {f"ch{i}": ch for i, ch in enumerate(channel_order)}
        placeholders = ", ".join(f":ch{i}" for i in range(len(channel_order)))
        query = f"""
            SELECT Canale, Programma, orario_inizio, orario_fine 
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

        self._logger.info(f"Query: {query} with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        result = []
        for row in rows:
            otherChannel = OtherChannel.MapOtherChannelFromRow(row)
            result.append(otherChannel)
        return result
