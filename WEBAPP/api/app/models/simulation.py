from dataclasses import dataclass


@dataclass
class SimulationSost:
    """Maps one row of ta_coll.whatif.webapp_simulations_sostituzione."""
    id: str
    id_scenario: str
    new_program_name: str | None
    new_program_share_storico: float | None
    share_result: float | None
    status: str
    creation_date: str | None
    modified_date: str | None
    last_error: str | None
    is_retry: bool

    @classmethod
    def MapSimulationSostFromRow(cls, row) -> "SimulationSost":
        return cls(
            id=str(row.id),
            id_scenario=str(row.id_scenario),
            new_program_name=row.new_program_name,
            new_program_share_storico=row.new_program_share_storico,
            share_result=row.share_result,
            status=row.status or "Unknown",
            creation_date=_to_iso(row.creation_date),
            modified_date=_to_iso(row.modified_date),
            last_error=row.last_error,
            is_retry=bool(row.is_retry),
        )

    @classmethod
    def MapSimulationSostFromDict(cls, row: dict) -> "SimulationSost":
        return cls(
            id=str(row["simulation_id"]),
            id_scenario=str(row["scenario_id"]),
            new_program_name=row.get("new_program_name"),
            new_program_share_storico=row.get("new_program_share_storico"),
            share_result=row.get("share_result"),
            status=row.get("status") or "Unknown",
            creation_date=_to_iso(row.get("simulation_creation_date")),
            modified_date=_to_iso(row.get("simulation_modified_date")),
            last_error=row.get("last_error"),
            is_retry=bool(row.get("is_retry", False)),
        )


@dataclass
class SimulationSposta:
    """Maps one row of ta_coll.whatif.webapp_simulations_spostamento."""
    id: str
    id_scenario: str
    new_channel: str | None
    new_date: str | None
    new_from_time: str | None
    share_result: float | None
    status: str
    creation_date: str | None
    modified_date: str | None
    last_error: str | None
    is_retry: bool

    @classmethod
    def MapSimulationSpostaFromRow(cls, row) -> "SimulationSposta":
        return cls(
            id=str(row.id),
            id_scenario=str(row.id_scenario),
            new_channel=row.new_channel,
            new_date=_to_iso(row.new_date),
            new_from_time=str(row.new_from_time) if row.new_from_time else None,
            share_result=row.share_result,
            status=row.status or "Unknown",
            creation_date=_to_iso(row.creation_date),
            modified_date=_to_iso(row.modified_date),
            last_error=row.last_error,
            is_retry=bool(row.is_retry),
        )

    @classmethod
    def MapSimulationSpostaFromDict(cls, row: dict) -> "SimulationSposta":
        return cls(
            id=str(row["simulation_id"]),
            id_scenario=str(row["scenario_id"]),
            new_channel=row.get("new_channel"),
            new_date=_to_iso(row.get("new_date")),
            new_from_time=str(row["new_from_time"]) if row.get("new_from_time") else None,
            share_result=row.get("share_result"),
            status=row.get("status") or "Unknown",
            creation_date=_to_iso(row.get("simulation_creation_date")),
            modified_date=_to_iso(row.get("simulation_modified_date")),
            last_error=row.get("last_error"),
            is_retry=bool(row.get("is_retry", False)),
        )


def _to_iso(val) -> str | None:
    if val is None:
        return None
    if hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val)
