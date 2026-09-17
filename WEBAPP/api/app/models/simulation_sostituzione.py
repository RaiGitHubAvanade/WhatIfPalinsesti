from dataclasses import dataclass

from app.utils.serialization_utils import to_iso_string
from app.utils.value_parsing_utils import parse_string_float_map


@dataclass
class SimulationSostituzione:
    id: str
    id_scenario: str
    new_program_name: str | None
    new_program_share_storico: float | None
    share_result: float | None
    shap_values: dict[str, float] | None
    status: str
    creation_date: str | None
    modified_date: str | None
    last_error: str | None
    is_retry: bool
    user_email: str | None

    @classmethod
    def map_simulation_sostituzione_from_row(cls, row) -> "SimulationSostituzione":
        return cls(
            id=str(row.id),
            id_scenario=str(row.id_scenario),
            new_program_name=row.new_program_name,
            new_program_share_storico=row.new_program_share_storico,
            share_result=row.share_result,
            shap_values=parse_string_float_map(getattr(row, "shap_values", None)),
            status=row.status or "Unknown",
            creation_date=to_iso_string(row.creation_date),
            modified_date=to_iso_string(row.modified_date),
            last_error=row.last_error,
            is_retry=bool(row.is_retry),
            user_email=row.user_email,
        )

    @classmethod
    def map_simulation_sostituzione_from_dict(cls, row: dict) -> "SimulationSostituzione":
        return cls(
            id=str(row["simulation_id"]),
            id_scenario=str(row["scenario_id"]),
            new_program_name=row.get("new_program_name"),
            new_program_share_storico=row.get("new_program_share_storico"),
            share_result=row.get("share_result"),
            shap_values=parse_string_float_map(row.get("shap_values")),
            status=row.get("status") or "Unknown",
            creation_date=to_iso_string(row.get("simulation_creation_date")),
            modified_date=to_iso_string(row.get("simulation_modified_date")),
            last_error=row.get("last_error"),
            is_retry=bool(row.get("is_retry", False)),
            user_email=row.get("user_email"),
        )