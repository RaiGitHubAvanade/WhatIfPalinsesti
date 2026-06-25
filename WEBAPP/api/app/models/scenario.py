from dataclasses import dataclass
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
    program_share_predict: float | None
    creation_date: str | None

    @classmethod
    def MapScenarioFromRow(cls, row) -> "Scenario":
        d = row.program_date
        creation = row.creation_date
        return cls(
            id=str(row.id),
            scenario_type=row.scenario_type,
            program_name=row.program_name,
            program_channel=row.program_channel,
            program_date=d.isoformat() if isinstance(d, date) else str(d) if d else None,
            program_from_time=str(row.program_from_time) if row.program_from_time else None,
            program_share_predict=row.program_share_predict,
            creation_date=creation.isoformat() if hasattr(creation, 'isoformat') else str(creation) if creation else None,
        )
