from dataclasses import dataclass

from app.utils.serialization_utils import to_iso_string
from app.utils.value_parsing_utils import parse_string_float_map


@dataclass
class SimulationSpostamento:
    """Maps one row of ta_coll.whatif.webapp_simulations_spostamento."""

    id: str
    id_scenario: str
    new_channel: str | None
    new_date: str | None
    new_from_time: str | None
    share_result: float | None
    shap_values: dict[str, float] | None
    status: str
    creation_date: str | None
    modified_date: str | None
    last_error: str | None
    is_retry: bool
    user_email: str | None

    @classmethod
    def map_simulation_spostamento_from_row(cls, row) -> "SimulationSpostamento":
        return cls(
            id=str(row.id),
            id_scenario=str(row.id_scenario),
            new_channel=row.new_channel,
            new_date=to_iso_string(row.new_date),
            new_from_time=str(row.new_from_time) if row.new_from_time else None,
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
    def map_simulation_spostamento_from_dict(cls, row: dict) -> "SimulationSpostamento":
        return cls(
            id=str(row["simulation_id"]),
            id_scenario=str(row["scenario_id"]),
            new_channel=row.get("new_channel"),
            new_date=to_iso_string(row.get("new_date")),
            new_from_time=str(row["new_from_time"]) if row.get("new_from_time") else None,
            share_result=row.get("share_result"),
            shap_values=parse_string_float_map(row.get("shap_values")),
            status=row.get("status") or "Unknown",
            creation_date=to_iso_string(row.get("simulation_creation_date")),
            modified_date=to_iso_string(row.get("simulation_modified_date")),
            last_error=row.get("last_error"),
            is_retry=bool(row.get("is_retry", False)),
            user_email=row.get("user_email"),
        )