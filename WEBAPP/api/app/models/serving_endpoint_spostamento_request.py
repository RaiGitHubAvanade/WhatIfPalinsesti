from __future__ import annotations

from dataclasses import dataclass
from collections.abc import Iterable


@dataclass
class ServingEndpointSpostamentoRequest:
    
    program_id: str | None
    program_name: str | None
    program_channel: str | None
    program_date: str | None
    program_from_time: str | None
    program_to_time: str | None
    program_share_predict: float | None
    scenario_type: str | None
    new_date: str | None
    new_channel: str | None
    new_from_time: str | None
    previous_program: str | None
    impacted_programs: list[str] | None
    next_program: str | None

    def __post_init__(self) -> None:
        self.previous_program = _normalize_id(self.previous_program)
        self.impacted_programs = _normalize_ids(self.impacted_programs)
        self.next_program = _normalize_id(self.next_program)

    @classmethod
    def from_body(cls, body: dict) -> "ServingEndpointSpostamentoRequest":
        return cls(
            program_id=body.get("program_id"),
            program_name=body.get("program_name"),
            program_channel=body.get("program_channel"),
            program_date=body.get("program_date"),
            program_from_time=body.get("program_from_time"),
            program_to_time=body.get("program_to_time"),
            program_share_predict=body.get("program_share_predict"),
            scenario_type=body.get("scenario_type"),
            new_date=body.get("new_date"),
            new_channel=body.get("new_channel"),
            new_from_time=body.get("new_from_time"),
            previous_program=body.get("previous_program"),
            impacted_programs=body.get("impacted_programs"),
            next_program=body.get("next_program"),
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
                "program_share_predict": self.program_share_predict,
                "scenario_type": self.scenario_type,
                "new_date": self.new_date,
                "new_channel": self.new_channel,
                "new_from_time": self.new_from_time,
                "impacted_programs": self.impacted_programs,
            }.items()
            if val is None
        ]

    def to_payload(self, impacted_programs_override: list[str] | None = None) -> dict:
        impacted_programs = self.impacted_programs if impacted_programs_override is None else impacted_programs_override
        return {
            "inputs": {
                "Programma_da_spostare": [self.program_id],
                "Destinazione": {
                    "Canale": [self.new_channel],
                    "data_str": [self.new_date],
                    "orario": [self.new_from_time],
                    "programmi_contesto": impacted_programs,
                },
            }
        }


def _normalize_id(value) -> str | None:
    if value is None:
        return None

    if isinstance(value, str):
        return value

    return str(value)


def _normalize_ids(value) -> list[str] | None:
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
