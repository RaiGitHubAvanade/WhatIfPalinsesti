from __future__ import annotations

from dataclasses import dataclass


@dataclass
class SimulationContextSourceSostituzione:
    program_id: str
    new_program_name: str | None
    new_program_share_storico: float | None

    @classmethod
    def map_from_row(cls, row) -> "SimulationContextSourceSostituzione":
        return cls(
            program_id=str(row.program_id),
            new_program_name=row.new_program_name,
            new_program_share_storico=row.new_program_share_storico,
        )
