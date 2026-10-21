from app.services.databricks_service import DatabricksService
from app.models.competitor_program import CompetitorProgram
from app.models.simulation_context_occurrence import SimulationContextOccurrence
from app.models.simulation_context_program_anchor import SimulationContextProgramAnchor
from app.models.simulation_context_slot import SimulationContextSlot
from app.models.simulation_context_source_sostituzione import SimulationContextSourceSostituzione
from app.models.simulation_context_source_spostamento import SimulationContextSourceSpostamento
from app.models.scenario import Scenario
from app.models.simulation_sostituzione import SimulationSostituzione
from app.models.simulation_spostamento import SimulationSpostamento
from app.utils.date_time_utils import DateTimeUtils
from app.models.prediction import FeatureExplanation


class DatabricksServiceScenarios(DatabricksService):



    def get_sostituzione_scenarios(
        self,
    ) -> list[Scenario]:
        """Return flat rows from webapp_scenarios LEFT JOIN webapp_simulations_sostituzione."""
        query = """
            SELECT
                sce.id                       AS scenario_id,
                sce.scenario_type,
                sce.scenario_name,
                sce.program_id,
                sce.program_name,
                sce.program_channel,
                sce.program_date,
                sce.program_from_time,
                sce.program_to_time,
                sce.program_share_predict,
                sce.created_by,
                sce.creation_date            AS scenario_creation_date,
                sce.modified_date            AS scenario_modified_date,
                sim.id                       AS simulation_id,
                sim.new_program_name,
                sim.new_program_share_storico,
                sim.share_result,
                sim.status,
                sim.creation_date            AS simulation_creation_date,
                sim.modified_date            AS simulation_modified_date,
                sim.last_error,
                sim.is_retry
            FROM webapp_scenarios sce
            LEFT JOIN webapp_simulations_sostituzione sim
                ON sce.id = sim.id_scenario
            WHERE sce.scenario_type = 'sostituzione'
            ORDER BY sce.modified_date DESC, sim.creation_date ASC
        """

        self._logger.info("get_sostituzione_scenarios")

        with self.cursor() as cursor:
            cursor.execute(query)
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        scenarios: dict[str, Scenario] = {}
        seen_sim_ids: set[str] = set()
        for row in rows:
            sce_id = str(row["scenario_id"])
            if sce_id not in scenarios:
                scenarios[sce_id] = Scenario.MapScenarioFromDict(row)
            sim_id = row.get("simulation_id")
            if sim_id is not None:
                sim_key = str(sim_id)
                if sim_key not in seen_sim_ids:
                    seen_sim_ids.add(sim_key)
                    scenarios[sce_id].simulations.append(SimulationSostituzione.map_simulation_sostituzione_from_dict(row))
        
        return list(scenarios.values())


    def get_scenario_id_for_sostituzione_simulation(self, simulation_id: str, created_by: str | None) -> str | None:
        query = """
            SELECT sim.id_scenario
            FROM webapp_simulations_sostituzione sim
            JOIN webapp_scenarios sce
                ON sim.id_scenario = sce.id
            WHERE sim.id = :simulation_id
                AND sce.created_by <=> :created_by
        """
        params = {"simulation_id": simulation_id, "created_by": created_by}

        self._logger.info(f"get_scenario_id_for_sostituzione_simulation | with params {params}")

        with self.cursor() as cursor:
            cursor.execute(query, parameters=params)
            row = cursor.fetchone()

        return str(row[0]) if row else None


    def get_scenario_id_for_spostamento_simulation(self, simulation_id: str, created_by: str | None) -> str | None:
        query = """
            SELECT sim.id_scenario
            FROM webapp_simulations_spostamento sim
            JOIN webapp_scenarios sce
                ON sim.id_scenario = sce.id
            WHERE sim.id = :simulation_id
                AND sce.created_by <=> :created_by
        """
        params = {"simulation_id": simulation_id, "created_by": created_by}

        self._logger.info(f"get_scenario_id_for_spostamento_simulation | with params {params}")

        with self.cursor() as cursor:
            cursor.execute(query, parameters=params)
            row = cursor.fetchone()

        return str(row[0]) if row else None


    def delete_simulation_sostituzione(self, simulation_id: str) -> None:
        query = """
            DELETE FROM webapp_simulations_sostituzione
            WHERE id = :simulation_id
        """
        params = {"simulation_id": simulation_id}

        self._logger.info(f"delete_simulation_sostituzione | with params {params}")

        with self.cursor() as cursor:
            cursor.execute(query, parameters=params)
            

    def delete_simulation_spostamento(self, simulation_id: str) -> None:
        query = """
            DELETE FROM webapp_simulations_spostamento
            WHERE id = :simulation_id
        """
        params = {"simulation_id": simulation_id}

        self._logger.info(f"delete_simulation_spostamento | with params {params}")

        with self.cursor() as cursor:
            cursor.execute(query, parameters=params)


    def delete_scenario_if_empty(self, scenario_id: str) -> None:
        query = """
            DELETE FROM webapp_scenarios
            WHERE id = :id_scenario
                AND NOT EXISTS (
                    SELECT 1
                    FROM webapp_simulations_sostituzione
                    WHERE id_scenario = :id_scenario
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM webapp_simulations_spostamento
                    WHERE id_scenario = :id_scenario
                )
        """
        params = {"id_scenario": scenario_id}

        self._logger.info(f"delete_scenario_if_empty | with params {params}")

        with self.cursor() as cursor:
            cursor.execute(query, parameters=params)


    def delete_scenario(self, scenario_id: str) -> None:
        delete_sostituzione_query = """
            DELETE FROM webapp_simulations_sostituzione
            WHERE id_scenario = :id_scenario
        """
        delete_spostamento_query = """
            DELETE FROM webapp_simulations_spostamento
            WHERE id_scenario = :id_scenario
        """
        delete_scenario_query = """
            DELETE FROM webapp_scenarios
            WHERE id = :id_scenario
        """
        params = {"id_scenario": scenario_id}

        self._logger.info(f"delete_scenario | with params {params}")

        with self.cursor() as cursor:
            cursor.execute(delete_sostituzione_query, parameters=params)
            cursor.execute(delete_spostamento_query, parameters=params)
            cursor.execute(delete_scenario_query, parameters=params)


    def delete_all_owned_scenarios(self, created_by: str | None) -> None:
        delete_sostituzione_query = """
            DELETE FROM webapp_simulations_sostituzione
            WHERE id_scenario IN (
                SELECT id
                FROM webapp_scenarios
                WHERE created_by <=> :created_by
            )
        """
        delete_spostamento_query = """
            DELETE FROM webapp_simulations_spostamento
            WHERE id_scenario IN (
                SELECT id
                FROM webapp_scenarios
                WHERE created_by <=> :created_by
            )
        """
        delete_scenarios_query = """
            DELETE FROM webapp_scenarios
            WHERE created_by <=> :created_by
        """
        params = {"created_by": created_by}

        self._logger.info("delete_all_owned_scenarios | created_by=%s", created_by)

        with self.cursor() as cursor:
            cursor.execute(delete_sostituzione_query, parameters=params)
            cursor.execute(delete_spostamento_query, parameters=params)
            cursor.execute(delete_scenarios_query, parameters=params)


    def is_scenario_owned(self, scenario_id: str, created_by: str | None) -> bool:
        query = """
            SELECT 1
            FROM webapp_scenarios
            WHERE id = :scenario_id
                AND created_by <=> :created_by
            LIMIT 1
        """
        params = {"scenario_id": scenario_id, "created_by": created_by}

        self._logger.info("is_scenario_owned | with params %s", {"scenario_id": scenario_id})

        with self.cursor() as cursor:
            cursor.execute(query, parameters=params)
            row = cursor.fetchone()

        return row is not None


    def get_spostamento_scenarios(
        self,
    ) -> list[Scenario]:
        query = """
            SELECT
                sce.id                       AS scenario_id,
                sce.scenario_type,
                sce.scenario_name,
                sce.program_id,
                sce.program_name,
                sce.program_channel,
                sce.program_date,
                sce.program_from_time,
                sce.program_to_time,
                sce.program_share_predict,
                sce.created_by,
                sce.creation_date            AS scenario_creation_date,
                sce.modified_date            AS scenario_modified_date,
                sim.id                       AS simulation_id,
                sim.new_channel,
                sim.new_date,
                sim.new_from_time,
                sim.share_result,
                sim.status,
                sim.creation_date            AS simulation_creation_date,
                sim.modified_date            AS simulation_modified_date,
                sim.last_error,
                sim.is_retry
            FROM webapp_scenarios sce
            LEFT JOIN webapp_simulations_spostamento sim
                ON sce.id = sim.id_scenario
            WHERE sce.scenario_type = 'spostamento'
            ORDER BY sce.modified_date DESC, sim.creation_date ASC
        """

        self._logger.info("get_spostamento_scenarios")

        with self.cursor() as cursor:
            cursor.execute(query)
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        scenarios: dict[str, Scenario] = {}
        seen_sim_ids: set[str] = set()
        for row in rows:
            sce_id = str(row["scenario_id"])
            if sce_id not in scenarios:
                scenarios[sce_id] = Scenario.MapScenarioFromDict(row)
            sim_id = row.get("simulation_id")
            if sim_id is not None:
                sim_key = str(sim_id)
                if sim_key not in seen_sim_ids:
                    seen_sim_ids.add(sim_key)
                    scenarios[sce_id].simulations.append(SimulationSpostamento.map_simulation_spostamento_from_dict(row))
        return list(scenarios.values())


    def edit_scenario_name(self, scenario_id: str, scenario_name: str, modified_date) -> None:
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


    def get_simulations_status(self, simulation_ids: list[str]) -> list[dict]:
        if not simulation_ids:
            return []

        placeholders = ", ".join(f":id{i}" for i in range(len(simulation_ids)))
        params = {f"id{i}": sim_id for i, sim_id in enumerate(simulation_ids)}

        query = f"""
            SELECT
                sim.id,
                sim.status,
                sim.share_result,
                sim.last_error,
                sim.modified_date
            FROM webapp_simulations_sostituzione sim
            WHERE sim.id IN ({placeholders})

            UNION ALL

            SELECT
                sim.id,
                sim.status,
                sim.share_result,
                sim.last_error,
                sim.modified_date
            FROM webapp_simulations_spostamento sim
            WHERE sim.id IN ({placeholders})
        """

        self._logger.info("get_simulations_status | ids=%d", len(simulation_ids))

        with self.cursor() as cursor:
            cursor.execute(query, parameters=params)
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        unique: dict[str, dict] = {}
        for row in rows:
            sim_id = str(row["id"])
            unique[sim_id] = {
                "id": sim_id,
                "status": row.get("status"),
                "share_result": row.get("share_result"),
                "last_error": row.get("last_error"),
                "modified_date": row.get("modified_date").isoformat() if hasattr(row.get("modified_date"), "isoformat") else str(row.get("modified_date")) if row.get("modified_date") is not None else None,
            }

        return list(unique.values())


    def get_features_and_shap(self, simulations: list[dict]) -> list[dict]:
        results = []
        tables = {
            "sostituzione": "webapp_simulations_sostituzione",
            "spostamento": "webapp_simulations_spostamento",
        }
        for simulation_type, table in tables.items():
            ids = list(dict.fromkeys(item["id"] for item in simulations if item["simulation_type"] == simulation_type))
            if not ids:
                continue
            params = {f"id{index}": simulation_id for index, simulation_id in enumerate(ids)}
            placeholders = ", ".join(f":{key}" for key in params)
            query = f"""
                SELECT sim.id, to_json(sim.feature_explanations)
                FROM {table} sim
                WHERE sim.id IN ({placeholders})
            """
            with self.cursor() as cursor:
                cursor.execute(query, parameters=params)
                rows = cursor.fetchall()
            for row in rows:
                results.append({
                    "id": str(row[0]),
                    "simulation_type": simulation_type,
                    "feature_explanations": FeatureExplanation.payload_from_storage_map(row[1]) if row[1] is not None else None,
                })
        return results


    ### --- Simulation context (detail page / Scarica Dettaglio) --- ###

    def _fetch_rows(self, query: str, params: dict | None = None) -> list:
        with self.cursor() as cursor:
            cursor.execute(query, parameters=params or {})
            return cursor.fetchall()

    @staticmethod
    def _to_minutes_expr(field_name: str) -> str:
        return (
            f"CASE WHEN INT(split({field_name}, ':')[0]) < 6 "
            f"THEN INT(split({field_name}, ':')[0]) * 60 + INT(split({field_name}, ':')[1]) + 1440 "
            f"ELSE INT(split({field_name}, ':')[0]) * 60 + INT(split({field_name}, ':')[1]) END"
        )

    def get_simulation_context_source_sostituzione(self, simulation_id: str) -> SimulationContextSourceSostituzione | None:
        query = """
            SELECT sce.program_id, sim.new_program_name, sim.new_program_share_storico
            FROM webapp_simulations_sostituzione sim
            JOIN webapp_scenarios sce
                ON sim.id_scenario = sce.id
            WHERE sim.id = :simulation_id
        """
        self._logger.info("get_simulation_context_source_sostituzione | id=%s", simulation_id)
        rows = self._fetch_rows(query, {"simulation_id": simulation_id})
        return SimulationContextSourceSostituzione.map_from_row(rows[0]) if rows else None

    def get_simulation_context_source_spostamento(self, simulation_id: str) -> SimulationContextSourceSpostamento | None:
        query = """
            SELECT sce.program_id, sim.previous_program, sim.next_program, sim.impacted_programs
            FROM webapp_simulations_spostamento sim
            JOIN webapp_scenarios sce
                ON sim.id_scenario = sce.id
            WHERE sim.id = :simulation_id
        """
        self._logger.info("get_simulation_context_source_spostamento | id=%s", simulation_id)
        rows = self._fetch_rows(query, {"simulation_id": simulation_id})
        return SimulationContextSourceSpostamento.map_from_row(rows[0]) if rows else None

    def get_context_slot_by_program_id(self, role: str, program_id: str) -> SimulationContextSlot | None:
        query = """
            SELECT :role AS ruolo, ID, Canale, Data, Programma, programma_norm, TipoGiorno,
                   orario_inizio, orario_fine, durata_minuti, StoricoShare,
                   Programma_prev, StoricoShare_prev, Programma_next, StoricoShare_next,
                   Programma_competitor, Canale_competitor, StoricoShare_competitor
            FROM out_palinsesto_predict_all_slots
            WHERE ID = :program_id
            LIMIT 1
        """
        params = {"role": role, "program_id": program_id}
        self._logger.info("get_context_slot_by_program_id | with params %s", params)
        rows = self._fetch_rows(query, params)
        return SimulationContextSlot.map_from_row(rows[0]) if rows else None

    def get_context_slots_by_program_ids(self, role: str, program_ids: list[str]) -> list[SimulationContextSlot]:
        if not program_ids:
            return []

        params = {"role": role}
        placeholders = []
        for index, program_id in enumerate(program_ids):
            key = f"id{index}"
            params[key] = program_id
            placeholders.append(f":{key}")

        query = f"""
            SELECT :role AS ruolo, ID, Canale, Data, Programma, programma_norm, TipoGiorno,
                   orario_inizio, orario_fine, durata_minuti, StoricoShare,
                   Programma_prev, StoricoShare_prev, Programma_next, StoricoShare_next,
                   Programma_competitor, Canale_competitor, StoricoShare_competitor
            FROM out_palinsesto_predict_all_slots
            WHERE ID IN ({", ".join(placeholders)})
            ORDER BY Data ASC, orario_inizio ASC
        """
        self._logger.info("get_context_slots_by_program_ids | role=%s count=%d", role, len(program_ids))
        rows = self._fetch_rows(query, params)
        return [SimulationContextSlot.map_from_row(row) for row in rows]

    def get_prev_next_program_anchors(
        self,
        data_rif,
        canale: str,
        program_prev: str | None,
        program_next: str | None,
        orario_inizio: str,
        orario_fine: str,
    ) -> list[SimulationContextProgramAnchor]:
        if not program_prev and not program_next:
            return []

        query = """
            WITH candidati AS (
                SELECT Programma, programma_norm, Canale, Data, TipoGiorno, orario_inizio, orario_fine, StoricoShare,
                       CASE WHEN Programma = :program_prev THEN 'prev' ELSE 'next' END AS ruolo,
                       ROW_NUMBER() OVER (
                           PARTITION BY CASE WHEN Programma = :program_prev THEN 'prev' ELSE 'next' END
                           ORDER BY CASE WHEN Programma = :program_prev
                                         THEN ABS(({start_expr_ref}) - ({end_expr}))
                                         ELSE ABS(({start_expr}) - ({end_expr_ref}))
                           END
                       ) AS rn
                FROM out_palinsesto_predict_all_slots
                WHERE Data = :data_rif
                  AND Canale = :canale
                  AND (
                    (:program_prev IS NOT NULL AND Programma = :program_prev AND ({start_expr}) < ({start_expr_ref}))
                    OR (:program_next IS NOT NULL AND Programma = :program_next AND ({start_expr}) > ({start_expr_ref}))
                  )
            )
            SELECT ruolo, Programma, programma_norm, Canale, Data, TipoGiorno, orario_inizio, orario_fine, StoricoShare
            FROM candidati
            WHERE rn = 1
        """.format(
            start_expr=self._to_minutes_expr("orario_inizio"),
            end_expr=self._to_minutes_expr("orario_fine"),
            start_expr_ref=self._to_minutes_expr(":orario_inizio"),
            end_expr_ref=self._to_minutes_expr(":orario_fine"),
        )
        params = {
            "program_prev": program_prev,
            "program_next": program_next,
            "data_rif": data_rif,
            "canale": canale,
            "orario_inizio": orario_inizio,
            "orario_fine": orario_fine,
        }
        self._logger.info("get_prev_next_program_anchors | with params %s", params)
        rows = self._fetch_rows(query, params)
        return [SimulationContextProgramAnchor.map_from_row(row) for row in rows]

    def get_competitor_anchor(
        self,
        programma_competitor: str | None,
        canale_competitor: str | None,
        data_rif,
        orario_inizio_rif: str,
    ) -> SimulationContextProgramAnchor | None:
        if not programma_competitor or not canale_competitor:
            return None

        rai_channels = {"Rai 1", "Rai 2", "Rai 3"}
        if canale_competitor in rai_channels:
            query = """
                WITH candidati AS (
                    SELECT 'competitor' AS ruolo, Programma, programma_norm, Canale, Data, TipoGiorno, orario_inizio, orario_fine,
                           ROW_NUMBER() OVER (
                               ORDER BY ABS(({start_expr}) - ({start_ref_expr}))
                           ) AS rn
                    FROM out_palinsesto_predict_all_slots
                    WHERE Programma = :programma_competitor
                      AND Canale = :canale_competitor
                      AND Data = :data_rif
                )
                SELECT ruolo, Programma, programma_norm, Canale, Data, TipoGiorno, orario_inizio, orario_fine,
                       CAST(NULL AS DOUBLE) AS StoricoShare
                FROM candidati
                WHERE rn = 1
            """.format(
                start_expr=self._to_minutes_expr("orario_inizio"),
                start_ref_expr=self._to_minutes_expr(":orario_inizio_rif"),
            )
        else:
            query = """
                WITH candidati AS (
                    SELECT 'competitor' AS ruolo, Programma, programma_norm, Canale, Data,
                           CASE WHEN weekday(Data) IN (0, 1, 2, 3, 4) THEN 'Weekday' ELSE 'Weekend' END AS TipoGiorno,
                           ora AS orario_inizio,
                           CAST(NULL AS STRING) AS orario_fine,
                           ROW_NUMBER() OVER (
                               ORDER BY ABS(({start_expr}) - ({start_ref_expr}))
                           ) AS rn
                    FROM output_palinsesto_competitor
                    WHERE Programma = :programma_competitor
                      AND Canale = :canale_competitor
                      AND Data = :data_rif
                )
                SELECT ruolo, Programma, programma_norm, Canale, Data, TipoGiorno, orario_inizio, orario_fine,
                       CAST(NULL AS DOUBLE) AS StoricoShare
                FROM candidati
                WHERE rn = 1
            """.format(
                start_expr=self._to_minutes_expr("ora"),
                start_ref_expr=self._to_minutes_expr(":orario_inizio_rif"),
            )

        params = {
            "programma_competitor": programma_competitor,
            "canale_competitor": canale_competitor,
            "data_rif": data_rif,
            "orario_inizio_rif": orario_inizio_rif,
        }
        self._logger.info("get_competitor_anchor | with params %s", params)
        rows = self._fetch_rows(query, params)
        return SimulationContextProgramAnchor.map_from_row(rows[0]) if rows else None

    def get_occurrences_normal(
        self,
        role: str,
        programma_norm: str,
        canale: str,
        data_rif,
        ora_rif: int,
        tipo_giorno: str,
        start_date,
        time_tolerance: int,
        cutoff_days: int,
        cutoff_num_occurrences: int,
    ) -> list[SimulationContextOccurrence]:
        query = """
            WITH derivate AS (
                SELECT :ruolo AS ruolo, Data, Canale, Programma, programma_norm, ORA_INIZIO_TRX, ORA_FINE_TRX, Share,
                       Tipo_Trasmissione, Direzione_Di_Genere,
                       `1st_Screen_LiveVOSDAL_Uomini` AS Share_Uomini_Pct,
                       `1st_Screen_LiveVOSDAL_Donne`  AS Share_Donne_Pct,
                       CAST(NULL AS DOUBLE) AS AMR,
                       CAST(NULL AS DOUBLE) AS Platea,
                       CAST(NULL AS DOUBLE) AS AMR_Uomini,
                       CAST(NULL AS DOUBLE) AS AMR_Donne,
                       CAST(BROUND(ORA_INIZIO_TRX / 3600, 0) AS INT) AS Ora,
                       CASE WHEN weekday(Data) IN (0, 1, 2, 3, 4) THEN 'Weekday' ELSE 'Weekend' END AS TipoGiorno
                FROM storico_programmi
                WHERE Data >= :start_date
            )
            SELECT *
            FROM derivate
            WHERE programma_norm = :programma_norm
                AND Canale = :canale
                AND TipoGiorno = :tipo_giorno
                AND Data <= date_sub(:data_rif, :cutoff_days)
                AND Ora BETWEEN :ora_rif - :time_tolerance AND :ora_rif + :time_tolerance
            ORDER BY Data DESC, ORA_INIZIO_TRX DESC
            LIMIT CAST(:cutoff_num_occurrences AS INT)
        """
        params = {
            "ruolo": role,
            "programma_norm": programma_norm,
            "canale": canale,
            "data_rif": data_rif,
            "ora_rif": int(ora_rif),
            "tipo_giorno": tipo_giorno,
            "start_date": start_date,
            "time_tolerance": time_tolerance,
            "cutoff_days": cutoff_days,
            "cutoff_num_occurrences": cutoff_num_occurrences,
        }
        self._logger.info("get_occurrences_normal | role=%s programma_norm=%s", role, programma_norm)
        rows = self._fetch_rows(query, params)
        return [SimulationContextOccurrence.map_from_row(row) for row in rows]

    def get_occurrences_new_program_name(
        self,
        programma: str,
        time_tolerance: int,
        cutoff_days: int,
        cutoff_num_occurrences: int,
    ) -> list[SimulationContextOccurrence]:
        query = """
            WITH programma_riferimento AS (
                SELECT
                    Data AS data_rif,
                    CAST(ROUND(ORA_INIZIO_TRX / 3600.0) AS INT) AS ora_rif
                FROM storico_programmi
                WHERE Programma = :programma
                    AND Canale IN ('Rai 1', 'Rai 2', 'Rai 3')
                    AND ORA_INIZIO_TRX >= 7 * 3600
                    AND ORA_INIZIO_TRX < 24 * 3600
                ORDER BY Data DESC, ORA_INIZIO_TRX DESC
                LIMIT 1
            ),
            derivate AS (
                SELECT 'selected' AS ruolo, Data, Canale, Programma, programma_norm, ORA_INIZIO_TRX, ORA_FINE_TRX, Share,
                       Tipo_Trasmissione, Direzione_Di_Genere,
                       `1st_Screen_LiveVOSDAL_Uomini` AS Share_Uomini_Pct,
                       `1st_Screen_LiveVOSDAL_Donne`  AS Share_Donne_Pct,
                       CAST(NULL AS DOUBLE) AS AMR,
                       CAST(NULL AS DOUBLE) AS Platea,
                       CAST(NULL AS DOUBLE) AS AMR_Uomini,
                       CAST(NULL AS DOUBLE) AS AMR_Donne,
                       CAST(BROUND(ORA_INIZIO_TRX / 3600, 0) AS INT) AS Ora,
                       CASE WHEN weekday(Data) IN (0, 1, 2, 3, 4) THEN 'Weekday' ELSE 'Weekend' END AS TipoGiorno
                FROM storico_programmi
            )
            SELECT d.*
            FROM derivate d
            CROSS JOIN programma_riferimento r
            WHERE d.Programma = :programma
                AND d.Canale IN ('Rai 1', 'Rai 2', 'Rai 3')
                AND d.Data <= DATE_SUB(r.data_rif, :cutoff_days)
                AND d.Ora BETWEEN r.ora_rif - :time_tolerance AND r.ora_rif + :time_tolerance
            ORDER BY d.Data DESC, d.ORA_INIZIO_TRX DESC
            LIMIT CAST(:cutoff_num_occurrences AS INT)
        """
        params = {
            "programma": programma,
            "time_tolerance": time_tolerance,
            "cutoff_days": cutoff_days,
            "cutoff_num_occurrences": cutoff_num_occurrences,
        }
        self._logger.info("get_occurrences_new_program_name | programma=%s", programma)
        rows = self._fetch_rows(query, params)
        return [SimulationContextOccurrence.map_from_row(row) for row in rows]


    ### --- Competitors --- ###

    def get_vw_output_palinsesto_futuro(
        self,
        channel_order: list[str],
        day,
        from_time: str,
        to_time: str,
    ) -> list[CompetitorProgram]:
        """Fetch future programs overlapping [from_time, to_time] on the given day"""
        channel_params = {f"ch{i}": ch for i, ch in enumerate(channel_order)}
        placeholders = ", ".join(f":ch{i}" for i in range(len(channel_order)))
        query = f"""
            SELECT ID, Canale, Data, Programma, orario_inizio, orario_fine, share_storico, evento_forte
            FROM vw_output_palinsesto_futuro 
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

        with self.cursor() as cursor:
            cursor.execute(query, parameters=params)
            rows = cursor.fetchall()

        return [CompetitorProgram.map_from_row(row) for row in rows]


    def toggle_evento_forte(self, competitor_id: str) -> None:
        query = """
            UPDATE output_palinsesto_competitor
            SET evento_forte = NOT evento_forte
            WHERE ID = :competitor_id
        """
        params = {"competitor_id": competitor_id}
        self._logger.info(f"toggle_evento_forte | with params {params}")
        with self.cursor() as cursor:
            cursor.execute(query, parameters=params)