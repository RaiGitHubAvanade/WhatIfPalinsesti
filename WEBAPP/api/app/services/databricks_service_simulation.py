"""Databricks simulation service — production implementation.

Queries ta_coll.whatif.* tables via the Databricks SQL Connector.
Authentication is handled by DatabricksService (SDK Config picks up
DATABRICKS_HOST, DATABRICKS_CLIENT_ID, DATABRICKS_CLIENT_SECRET).
"""

from datetime import date
import logging

from app.models.program import Program
from app.utils.date_time_utils import DateTimeUtils
from app.services.databricks_service import DatabricksService


class DatabricksServiceSimulation(DatabricksService):
    """Production simulation service backed by real Databricks SQL."""


    def get_output_palinsesto_rai(
        self,
        day: date,
        channel: str | None = None,
        from_time: str | None = None,
        to_time: str | None = None,
    ) -> list[Program]:
        """Fetch programs overlapping [from_time, to_time] on the given day.
        All filters except *day* are optional."""
        conditions: list[str] = ["Data = :day"]
        params: dict = {"day": day}

        if channel:
            conditions.append("Canale = :channel")
            params["channel"] = channel

        if from_time is not None:
            conditions.append(
                "(CASE WHEN INT(split(orario_fine, ':')[0]) < 6 "
                "THEN INT(split(orario_fine, ':')[0]) * 60 + INT(split(orario_fine, ':')[1]) + 1440 "
                "ELSE INT(split(orario_fine, ':')[0]) * 60 + INT(split(orario_fine, ':')[1]) END) > :overlap_from"
            )
            params["overlap_from"] = DateTimeUtils.hhmm_to_minutes(from_time)

        if to_time is not None:
            conditions.append(
                "(CASE WHEN INT(split(orario_inizio, ':')[0]) < 6 "
                "THEN INT(split(orario_inizio, ':')[0]) * 60 + INT(split(orario_inizio, ':')[1]) + 1440 "
                "ELSE INT(split(orario_inizio, ':')[0]) * 60 + INT(split(orario_inizio, ':')[1]) END) < :overlap_to"
            )
            params["overlap_to"] = DateTimeUtils.hhmm_to_minutes(to_time)

        query = f"""
            SELECT Canale, Programma, orario_inizio, orario_fine,
                   share_storico, target_genere, target_eta, genere_predominante
            FROM ta_coll.whatif.output_palinsesto_rai
            WHERE {' AND '.join(conditions)}
            ORDER BY orario_inizio
        """
        self._logger.info(f"Query: {query} with params {params}")

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        return [Program.MapProgramFromFutureRow(row) for row in rows]
    # ------------------------------------------------------------------ #
    # Programs
    # ------------------------------------------------------------------ #

    def get_programs(
        self,
        ch: str | None = None,
        date: str | None = None,
        from_time: str | None = None,
        to_time: str | None = None,
        search: str | None = None,
    ) -> list[dict]:
        # TODO: replace with actual table and column names
        conditions = ["1=1"]
        params: dict = {}

        if ch:
            conditions.append("channel = :ch")
            params["ch"] = ch
        if date:
            conditions.append("program_date = :date")
            params["date"] = date
        if from_time:
            conditions.append("end_time >= :from_time")
            params["from_time"] = from_time
        if to_time:
            conditions.append("start_time <= :to_time")
            params["to_time"] = to_time
        if search:
            conditions.append("(LOWER(title) LIKE :search OR LOWER(genre) LIKE :search)")
            params["search"] = f"%{search.lower()}%"

        query = f"""
            SELECT id, title, genre, start_time, end_time, duration_min,
                   channel, share, eta, sesso, tipo, slot
            FROM ta_coll.whatif.programs
            WHERE {' AND '.join(conditions)}
            ORDER BY start_time
        """
        self._logger.info("get_programs | params=%s", params)

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

    # ------------------------------------------------------------------ #
    # Candidates
    # ------------------------------------------------------------------ #

    def get_candidates(
        self,
        exclude_id: str | None = None,
        ch: str | None = None,
        search: str | None = None,
        genere: str | None = None,
        eta: str | None = None,
        share_min: float | None = None,
        target_dur: int | None = None,
    ) -> list[dict]:
        # TODO: replace with actual table and column names
        conditions = ["1=1"]
        params: dict = {}

        if exclude_id:
            conditions.append("id != :exclude_id")
            params["exclude_id"] = exclude_id
        if ch:
            conditions.append("channel = :ch")
            params["ch"] = ch
        if search:
            conditions.append("(LOWER(title) LIKE :search OR LOWER(genre) LIKE :search)")
            params["search"] = f"%{search.lower()}%"
        if genere and genere not in ("Tutti", "All"):
            conditions.append("sesso IN (:genere, 'All', 'Tutti')")
            params["genere"] = genere
        if share_min is not None:
            conditions.append("share >= :share_min")
            params["share_min"] = share_min
        if target_dur is not None:
            conditions.append("ABS(duration_min - :target_dur) <= 60")
            params["target_dur"] = target_dur

        query = f"""
            SELECT id, title, genre, start_time, end_time, duration_min,
                   channel, share, eta, sesso, tipo, slot
            FROM ta_coll.whatif.programs
            WHERE {' AND '.join(conditions)}
            ORDER BY share DESC
        """
        self._logger.info("get_candidates | params=%s", params)

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

    # ------------------------------------------------------------------ #
    # Competitors
    # ------------------------------------------------------------------ #

    def get_competitors(self, slot: str | None = None) -> list[dict]:
        # TODO: replace with actual table and column names
        params: dict = {"slot": slot or "prime"}
        query = """
            SELECT title, channel, tipo, share, is_event
            FROM ta_coll.whatif.competitors
            WHERE slot = :slot
            ORDER BY share DESC
            LIMIT 6
        """
        self._logger.info("get_competitors | slot=%s", params["slot"])

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

    # ------------------------------------------------------------------ #
    # Channel schedule (for spostamento destination)
    # ------------------------------------------------------------------ #

    def get_channel_schedule(
        self,
        ch: str,
        dest_time: str,
    ) -> list[dict]:
        # TODO: replace with actual table and column names
        query = """
            SELECT id, title, start_time, end_time, duration_min, share, tipo, genre
            FROM ta_coll.whatif.programs
            WHERE channel = :ch
              AND start_time <= :range_end
              AND end_time   >= :range_start
            ORDER BY start_time
        """
        h, m = int(dest_time[:2]), int(dest_time[3:5])
        dest_min = h * 60 + m
        range_start = f"{(dest_min - 120) // 60:02d}:{(dest_min - 120) % 60:02d}"
        range_end   = f"{(dest_min + 120) // 60:02d}:{(dest_min + 120) % 60:02d}"
        params = {"ch": ch, "range_start": range_start, "range_end": range_end}

        self._logger.info("get_channel_schedule | ch=%s dest_time=%s", ch, dest_time)

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

    # ------------------------------------------------------------------ #
    # Predictions (legacy — consider migrating to AiService)
    # ------------------------------------------------------------------ #

    def predict_sostituzione(self, orig_id: str, cand_id: str) -> dict:
        # TODO: call Databricks Serving Endpoint or delegate to AiService
        raise NotImplementedError("predict_sostituzione: migrate to AiService")

    def predict_spostamento(self, prog_id: str, dest_ch: str, dest_time: str) -> dict:
        # TODO: call Databricks Serving Endpoint or delegate to AiService
        raise NotImplementedError("predict_spostamento: migrate to AiService")

    # ------------------------------------------------------------------ #
    # Scenarios & Simulations
    # ------------------------------------------------------------------ #

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
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

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
        self._logger.info("insert_scenario | id=%s", scenario.get("id"))

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
        self._logger.info("insert_simulation | id=%s id_scenario=%s", simulation.get("id"), simulation.get("id_scenario"))

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
            else:
                set_parts.append(f"{key} = :{key}")
                params[key] = value

        query = f"""
            UPDATE ta_coll.whatif.webapp_simulations_sostituzione
            SET    {', '.join(set_parts)}
            WHERE  id = :simulation_id
        """
        self._logger.info("update_simulation | id=%s fields=%s", simulation_id, list(fields.keys()))

        with self._connection.cursor() as cursor:
            cursor.execute(query, parameters=params)
