from __future__ import annotations

from dataclasses import dataclass
from collections.abc import Iterable


@dataclass
class ServingEndpointSpostamentoRequest:
    """Input data for starting or retrying a spostamento simulation."""
    program_id: str | None
    program_name: str | None
    program_channel: str | None
    program_date: str | None
    program_from_time: str | None
    scenario_type: str | None
    new_channel: str | None
    new_date: str | None
    new_from_time: str | None
    schedule: list[str] | None
    program_to_time: str | None = None
    program_share_predict: float | None = None

    def __post_init__(self) -> None:
        self.schedule = _normalize_schedule(self.schedule)

    @classmethod
    def from_body(cls, body: dict) -> "ServingEndpointSpostamentoRequest":
        schedule = _normalize_schedule(body.get("schedule"))
        return cls(
            program_id=body.get("program_id"),
            program_name=body.get("program_name"),
            program_channel=body.get("program_channel"),
            program_date=body.get("program_date"),
            program_from_time=body.get("program_from_time"),
            program_to_time=body.get("program_to_time"),
            scenario_type=body.get("scenario_type"),
            new_channel=body.get("new_channel"),
            new_date=body.get("new_date"),
            new_from_time=body.get("new_from_time"),
            schedule=schedule,
            program_share_predict=body.get("program_share_predict"),
        )

    def retrieve_missing_parameters(self) -> list[str]:
        return [
            name for name, val in {
                "program_id": self.program_id,
                "program_name": self.program_name,
                "program_channel": self.program_channel,
                "program_date": self.program_date,
                "program_from_time": self.program_from_time,
                "program_to_time": self.program_to_time,
                "scenario_type": self.scenario_type,
                "new_channel": self.new_channel,
                "new_date": self.new_date,
                "new_from_time": self.new_from_time,
                "schedule": self.schedule,
                "program_share_predict": self.program_share_predict,
            }.items()
            if val is None
        ]

    def to_payload(self) -> dict:
        return {
            "inputs": {
                "Programma_da_spostare": [self.program_id],
                "Destinazione": {
                    "Canale": [self.new_channel],
                    "data_str": [self.new_date],
                    "orario": [self.new_from_time],
                    "programmi_contesto": self.schedule,
                },
            }
        }


def _normalize_schedule(value) -> list[str] | None:
    if value is None:
        return None

    # Databricks/NumPy rows may expose ARRAY fields as ndarray; convert first.
    to_list = getattr(value, "tolist", None)
    if callable(to_list):
        value = to_list()

    if isinstance(value, str):
        return [value]

    if isinstance(value, Iterable):
        return [str(item) for item in value]

    return None
