from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass


@dataclass
class SimulationContextSourceSpostamento:
    program_id: str
    previous_program: str | None
    next_program: str | None
    impacted_programs: list[str]

    @classmethod
    def map_from_row(cls, row) -> "SimulationContextSourceSpostamento":
        return cls(
            program_id=str(row.program_id),
            previous_program=_normalize_id(getattr(row, "previous_program", None)),
            next_program=_normalize_id(getattr(row, "next_program", None)),
            impacted_programs=_normalize_ids(getattr(row, "impacted_programs", None)),
        )


def _normalize_id(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return str(value)


def _normalize_ids(value) -> list[str]:
    if value is None:
        return []

    to_list = getattr(value, "tolist", None)
    if callable(to_list):
        value = to_list()

    if isinstance(value, str):
        return [value]

    if isinstance(value, Iterable):
        return [str(item) for item in value]

    return []
