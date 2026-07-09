from dataclasses import dataclass, field
from datetime import date


@dataclass
class Scenario:
    """Maps one row of ta_coll.whatif.webapp_scenarios."""
    id: str
    scenario_type: str
    program_name: str
    program_channel: str
    program_date: str | None
    program_from_time: str | None
    program_to_time: str | None
    program_share_predict: float | None
    creation_date: str | None
    modified_date: str | None
    simulations: list = field(default_factory=list)

    @classmethod
    def MapScenarioFromRow(cls, row) -> "Scenario":
        d = row.program_date
        creation = row.creation_date
        modified = row.modified_date
        return cls(
            id=str(row.id),
            scenario_type=row.scenario_type,
            program_name=row.program_name,
            program_channel=row.program_channel,
            program_date=d.isoformat() if isinstance(d, date) else str(d) if d else None,
            program_from_time=str(row.program_from_time) if row.program_from_time else None,
            program_to_time=str(row.program_to_time) if row.program_to_time else None,
            program_share_predict=row.program_share_predict,
            creation_date=creation.isoformat() if hasattr(creation, 'isoformat') else str(creation) if creation else None,
            modified_date=modified.isoformat() if hasattr(modified, 'isoformat') else str(modified) if modified else None,

        )

    @classmethod
    def MapScenarioFromDict(cls, row: dict) -> "Scenario":
        d = row.get("program_date")
        creation = row.get("scenario_creation_date")
        modified = row.get("scenario_modified_date")
        return cls(
            id=str(row["scenario_id"]),
            scenario_type=row.get("scenario_type") or "",
            program_name=row.get("program_name") or "",
            program_channel=row.get("program_channel") or "",
            program_date=d.isoformat() if hasattr(d, "isoformat") else str(d) if d else None,
            program_from_time=str(row["program_from_time"]) if row.get("program_from_time") else None,
            program_to_time=str(row["program_to_time"]) if row.get("program_to_time") else None,
            program_share_predict=row.get("program_share_predict"),
            creation_date=creation.isoformat() if hasattr(creation, "isoformat") else str(creation) if creation else None,
            modified_date=modified.isoformat() if hasattr(modified, "isoformat") else str(modified) if modified else None,
        )
