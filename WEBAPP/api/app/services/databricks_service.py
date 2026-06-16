"""Databricks service — queries Unity Catalog via the Databricks SQL Connector."""

from databricks import sql
from databricks.sdk.core import Config as DatabricksConfig
from datetime import date, timedelta

from app.models.palinsesto import Palinsesto
from app.models.other_channel import OtherChannel
from app.utils.date_time_utils import DateTimeUtils
from app.utils.sql_helper import SqlHelper


class DatabricksService:
    """Service that opens a single SQL Connector connection for its lifetime.

    Authentication is handled by the Databricks SDK Config, which automatically
    picks up Service Principal credentials from environment variables:
      DATABRICKS_HOST, DATABRICKS_CLIENT_ID, DATABRICKS_CLIENT_SECRET

    The SQL connector maps Spark types to Python types automatically:
      date   → datetime.date
      double → float
      string → str
    """

    def __init__(self) -> None:
        cfg = DatabricksConfig()
        self._connection = sql.connect(
            server_hostname=cfg.host,
            http_path=f"/sql/1.0/warehouses/{cfg.warehouse_id}",
            credentials_provider=lambda: cfg.authenticate,
        )

    def close(self) -> None:
        """Close the underlying connection."""
        self._connection.close()

    def __enter__(self) -> "DatabricksService":
        return self

    def __exit__(self, *_) -> None:
        self.close()

    ### --- Weekly Table --- ###

    def get_palinsesto_delta(self, channel: str, from_day: date, to_day: date) -> list[Palinsesto]:
        """Execute the query and return rows for the week containing *day*."""

        query = """
            SELECT Canale, Data, Programma, orario_inizio, orario_fine, share_predetto, 
                share_manuale, share_reale 
            FROM ta_coll.whatif.output_palinsesto_delta 
            WHERE Canale = %s 
                AND Data BETWEEN %s AND %s 
        """

        with self._connection.cursor() as cursor:
            cursor.execute(query, [channel, from_day, to_day])
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
            WHERE Canale = %s 
                AND Data BETWEEN %s AND %s 
        """

        with self._connection.cursor() as cursor:
            cursor.execute(query, [channel, from_day, to_day])
            rows = cursor.fetchall()

        result = []
        for row in rows:
            palinsesto = Palinsesto.MapPalinsestoPredictFromRow(row)
            result.append(palinsesto)
        return result

    def edit_manual_share_predict(
        self,
        channel: str,
        program_name: str,
        from_time: str,
        to_time: str,
        day: date,
        value: float | None,
    ) -> None:
        """Update the share_manuale field on a single row in out_palinsesto_predict."""
        query = """
            UPDATE ta_coll.whatif.out_palinsesto_predict
            SET share_manuale = %s
            WHERE Canale = %s
              AND Programma = %s
              AND orario_inizio = %s
              AND orario_fine = %s
              AND Data = %s
        """
        with self._connection.cursor() as cursor:
            cursor.execute(query, [value, channel, program_name, from_time, to_time, day])

    ### --- Competitors --- ###

    def get_storico_programmi(
        self,
        channel: str,
        day: date,
        from_time: str,
        to_time: str,
    ) -> list[OtherChannel]:
        """Fetch historical competitor programs overlapping [from_time, to_time] on the given day."""
        query = """
            SELECT Canale, Programma, ORA_INIZIO_TRX, ORA_FINE_TRX 
            FROM ta_coll.whatif.storico_programmi 
            WHERE Data = %s 
            AND Canale != %s 
            AND ORA_INIZIO_TRX < %s 
            AND ORA_FINE_TRX > %s 
        """
        params = [
            day,
            channel,
            DateTimeUtils.hhmm_to_seconds(to_time),
            DateTimeUtils.hhmm_to_seconds(from_time),
        ]
        with self._connection.cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()

        result = []
        for row in rows:
            result.append(OtherChannel.MapOtherChannelFromRowTRX(row))
        return result

    def get_vw_output_palinsesto_futuro(
        self,
        channel: str,
        day: date,
        from_time: str,
        to_time: str,
    ) -> list[OtherChannel]:
        """Fetch RAI programs overlapping [from_time, to_time] on the given day."""
        query = """
            SELECT Canale, Programma, orario_inizio, orario_fine 
            FROM ta_coll.whatif.vw_output_palinsesto_futuro 
            WHERE Data = %s 
            AND Canale != %s 
            """ + SqlHelper.overlap_where_clause()
        params = [
            day,
            channel,
            DateTimeUtils.hhmm_to_minutes(to_time),
            DateTimeUtils.hhmm_to_minutes(from_time),
        ]
        with self._connection.cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()

        result = []
        for row in rows:
            otherChannel = OtherChannel.MapOtherChannelFromRow(row)
            result.append(otherChannel)
        return result
    
    def get_rai_competitor_programs(
        self,
        channel: str,
        day: date,
        from_time: str,
        to_time: str,
    ) -> list[OtherChannel]:
        """Fetch RAI programs overlapping [from_time, to_time] on the given day."""
        query = """
            SELECT Canale, Programma, orario_inizio, orario_fine 
            FROM ta_coll.whatif.output_palinsesto_rai 
            WHERE Data = %s 
            AND Canale != %s 
            """ + SqlHelper.overlap_where_clause()
        params = [
            day,
            channel,
            DateTimeUtils.hhmm_to_minutes(to_time),
            DateTimeUtils.hhmm_to_minutes(from_time),
        ]
        with self._connection.cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()

        result = []
        for row in rows:
            otherChannel = OtherChannel.MapOtherChannelFromRow(row)
            result.append(otherChannel)
        return result

    def get_external_competitor_programs(
        self,
        channel: str,
        day: date,
        from_time: str,
        to_time: str,
    ) -> list[OtherChannel]:
        """Fetch non-RAI competitor programs overlapping [from_time, to_time] on the given day."""
        query = """
            SELECT Canale, Programma, orario_inizio, orario_fine 
            FROM ta_coll.whatif.output_palinsesto_competitor 
            WHERE Data = %s 
            AND Canale != %s 
            """ + SqlHelper.overlap_where_clause()
        params = [
            day,
            channel,
            DateTimeUtils.hhmm_to_minutes(to_time),
            DateTimeUtils.hhmm_to_minutes(from_time),
        ]
        with self._connection.cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()

        result = []
        for row in rows:
            otherChannel = OtherChannel.MapOtherChannelFromRow(row)
            result.append(otherChannel)
        return result
    