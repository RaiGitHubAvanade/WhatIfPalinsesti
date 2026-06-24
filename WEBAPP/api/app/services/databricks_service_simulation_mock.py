"""Databricks simulation service — mock implementation for development.

All data is served from in-memory stores; no real Databricks connection
is opened. Replace usages with DatabricksServiceSimulation (production)
once the ta_coll.whatif.* tables are ready.
"""

import logging
import threading
import uuid
from copy import deepcopy
from datetime import datetime, timezone

from app.services.databricks_service import DatabricksService
from app.data.mocked_data import PROGS, COMPS

# ------------------------------------------------------------------ #
# In-memory stores (mock — replace with real Databricks SQL in production)
# ------------------------------------------------------------------ #
_SCENARIOS: list[dict] = []
_SIMULATIONS: list[dict] = []
_store_lock = threading.Lock()


class DatabricksServiceSimulationMock(DatabricksService):
    """Simulation service backed by mock data.

    Overrides __init__ so no real Databricks connection is opened; close()
    is a no-op. All data is served from the in-memory PROGS / COMPS lists.
    """

    def __init__(self) -> None:  # do NOT call super().__init__()
        self._logger = logging.getLogger(__name__)
        self._connection = None  # not used in mock mode

    def close(self) -> None:
        pass  # nothing to close

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
        """Return programs filtered by optional criteria."""
        results = list(PROGS)

        if ch:
            results = [p for p in results if p.get("ch") == ch]

        if search:
            q = search.lower()
            results = [
                p for p in results
                if q in (
                    (p.get("title") or "")
                    + " " + (p.get("genre") or "")
                    + " " + (p.get("tipo") or "")
                ).lower()
            ]

        if from_time:
            results = [
                p for p in results
                if (p.get("end") or "99:99") >= from_time
            ]

        if to_time:
            results = [
                p for p in results
                if (p.get("time") or "00:00") <= to_time
            ]

        results.sort(key=lambda p: p.get("time") or "00:00")
        return results

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
        """Return programs eligible as candidates for substitution."""
        results = [p for p in PROGS if p.get("id") != exclude_id]

        if ch:
            results = [p for p in results if p.get("ch") == ch]

        if search:
            q = search.lower()
            results = [
                p for p in results
                if q in (
                    (p.get("title") or "")
                    + " " + (p.get("genre") or "")
                    + " " + (p.get("tipo") or "")
                ).lower()
            ]

        if genere and genere not in ("Tutti", "All"):
            results = [
                p for p in results
                if p.get("sesso") in (genere, "All", "Tutti")
            ]

        if eta and eta not in ("Tutti", "All"):
            results = [
                p for p in results
                if self._eta_matches(p.get("eta"), eta)
            ]

        if share_min is not None:
            results = [
                p for p in results
                if (p.get("share") or 0) >= share_min
            ]

        if target_dur is not None:
            results = [
                p for p in results
                if abs((p.get("dur") or 0) - target_dur) <= 60
            ]

        results.sort(key=lambda p: -(p.get("share") or 0))
        return results

    # ------------------------------------------------------------------ #
    # Competitors
    # ------------------------------------------------------------------ #

    def get_competitors(self, slot: str | None = None) -> list[dict]:
        """Return competitor programs for the given slot."""
        slot_key = slot or "prime"
        results = [c for c in COMPS if c.get("slot") == slot_key]
        if not results:
            results = [c for c in COMPS if c.get("slot") == "prime"]
        return results[:6]

    # ------------------------------------------------------------------ #
    # Channel schedule (for spostamento destination)
    # ------------------------------------------------------------------ #

    def get_channel_schedule(
        self,
        ch: str,
        dest_time: str,
    ) -> list[dict]:
        """Return programs for *ch* within ±2 hours of *dest_time*."""
        def to_min(t: str | None) -> int:
            if not t:
                return 0
            h, m = int(t[:2]), int(t[3:5])
            return h * 60 + m

        sel_min = to_min(dest_time)
        range_start = sel_min - 120
        range_end = sel_min + 120

        channel_progs = [p for p in PROGS if p.get("ch") == ch]
        filtered: list[dict] = []
        for p in channel_progs:
            start = to_min(p.get("time"))
            end_t = p.get("end")
            end = to_min(end_t) if end_t else start + (p.get("dur") or 0)
            if end < start:
                end += 1440  # crosses midnight
            if start < range_end and end > range_start:
                filtered.append(p)

        filtered.sort(key=lambda p: to_min(p.get("time")))

        clean: list[dict] = []
        last_end = -1
        for p in filtered:
            start = to_min(p.get("time"))
            end_t = p.get("end")
            end = to_min(end_t) if end_t else start + (p.get("dur") or 0)
            if end < start:
                end += 1440
            if start >= last_end:
                clean.append(p)
                last_end = end

        return clean

    # ------------------------------------------------------------------ #
    # Predictions
    # ------------------------------------------------------------------ #

    def predict_sostituzione(self, orig_id: str, cand_id: str) -> dict:
        """Predict share for replacing orig with cand in the same slot."""
        orig = next((p for p in PROGS if p["id"] == orig_id), None)
        cand = next((p for p in PROGS if p["id"] == cand_id), None)

        if not orig or not cand:
            return {"pred": None, "delta": None}

        orig_share = float(orig.get("share") or 0)
        cand_share = float(cand.get("share") or 0)

        avg_slot_share = 14.0
        context_factor = orig_share / avg_slot_share if avg_slot_share > 0 else 1.0
        pred = round(min(40.0, max(2.0, cand_share * context_factor)), 1)
        delta = round(pred - orig_share, 1)
        return {"pred": pred, "delta": delta}

    def predict_spostamento(
        self,
        prog_id: str,
        dest_ch: str,
        dest_time: str,
    ) -> dict:
        """Compute original vs destination slot share averages."""
        prog = next((p for p in PROGS if p["id"] == prog_id), None)
        if not prog:
            return {"orig_slot_share": None, "dest_slot_share": None, "delta": None}

        orig_share = float(prog.get("share") or 0)

        def to_min(t: str | None) -> int:
            if not t:
                return 0
            h, m = int(t[:2]), int(t[3:5])
            return h * 60 + m

        dest_min = to_min(dest_time)
        dest_progs = [
            p for p in PROGS
            if p.get("ch") == dest_ch
            and p.get("share") is not None
            and abs(to_min(p.get("time")) - dest_min) <= 90
        ]

        if dest_progs:
            dest_slot_share = round(
                sum(float(p["share"]) for p in dest_progs) / len(dest_progs), 1
            )
        else:
            dest_slot_share = round(orig_share, 1)

        delta = round(dest_slot_share - orig_share, 1)
        return {
            "orig_slot_share": round(orig_share, 1),
            "dest_slot_share": dest_slot_share,
            "delta": delta,
        }

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
        with _store_lock:
            scenarios = [
                s for s in _SCENARIOS
                if s["program_name"] == program_name
                and s["program_channel"] == program_channel
                and s["program_date"] == program_date
                and s["program_from_time"] == program_from_time
                and s["scenario_type"] == scenario_type
            ]
            if not scenarios:
                return []

            rows: list[dict] = []
            for sce in scenarios:
                sims = [si for si in _SIMULATIONS if si["id_scenario"] == sce["id"]]
                if sims:
                    for sim in sims:
                        rows.append({
                            "sce_id": sce["id"],
                            "scenario_type": sce["scenario_type"],
                            "program_name": sce["program_name"],
                            "program_channel": sce["program_channel"],
                            "program_date": sce["program_date"],
                            "program_from_time": sce["program_from_time"],
                            "program_share_predict": sce["program_share_predict"],
                            "sce_creation_date": sce["creation_date"],
                            "sim_id": sim["id"],
                            "id_scenario": sim["id_scenario"],
                            "new_program_name": sim["new_program_name"],
                            "new_program_share_storico": sim["new_program_share_storico"],
                            "share_result": sim["share_result"],
                            "status": sim["status"],
                            "sim_creation_date": sim["creation_date"],
                            "modified_date": sim["modified_date"],
                            "last_error": sim["last_error"],
                            "is_retry": sim["is_retry"],
                        })
                else:
                    # LEFT JOIN: scenario exists but has no simulations yet
                    rows.append({
                        "sce_id": sce["id"],
                        "scenario_type": sce["scenario_type"],
                        "program_name": sce["program_name"],
                        "program_channel": sce["program_channel"],
                        "program_date": sce["program_date"],
                        "program_from_time": sce["program_from_time"],
                        "program_share_predict": sce["program_share_predict"],
                        "sce_creation_date": sce["creation_date"],
                        "sim_id": None,
                        "id_scenario": None,
                        "new_program_name": None,
                        "new_program_share_storico": None,
                        "share_result": None,
                        "status": None,
                        "sim_creation_date": None,
                        "modified_date": None,
                        "last_error": None,
                        "is_retry": None,
                    })
            return rows

    def insert_scenario(self, scenario: dict) -> None:
        with _store_lock:
            _SCENARIOS.append(deepcopy(scenario))

    def insert_simulation(self, simulation: dict) -> None:
        with _store_lock:
            _SIMULATIONS.append(deepcopy(simulation))

    def update_simulation(self, simulation_id: str, **fields) -> None:
        with _store_lock:
            for sim in _SIMULATIONS:
                if sim["id"] == simulation_id:
                    sim.update(fields)
                    break

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    @staticmethod
    def _eta_matches(prog_eta: str | None, filter_eta: str) -> bool:
        """Check whether a program's eta field falls within filter_eta range."""
        if not prog_eta or prog_eta in ("All", "Tutti"):
            return True

        def to_range(eta: str) -> str:
            if not eta or eta in ("All", "Tutti"):
                return "Tutti"
            for prefix, rng in [
                ("15", "15-24"), ("18", "15-24"),
                ("25", "25-44"), ("35", "25-44"),
                ("45", "45-64"),
                ("55", "65+"), ("65", "65+"),
            ]:
                if str(eta).startswith(prefix):
                    return rng
            return "Tutti"

        prog_range = to_range(prog_eta)
        return prog_range == filter_eta or prog_range == "Tutti"
