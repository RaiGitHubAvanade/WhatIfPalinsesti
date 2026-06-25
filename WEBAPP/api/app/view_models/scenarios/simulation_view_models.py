from __future__ import annotations

from dataclasses import dataclass


@dataclass
class SimulationSostViewModel:
    """One sostituzione simulation linked to a scenario."""
    id: str
    new_program_name: str | None
    new_program_share_storico: float | None
    share_result: float | None
    status: str                  # 'Running' | 'Completed' | 'Failed'
    creation_date: str | None
    modified_date: str | None
    last_error: str | None
    is_retry: bool


@dataclass
class SimulationSpostViewModel:
    """One spostamento simulation linked to a scenario."""
    id: str
    new_channel: str | None
    new_date: str | None
    new_from_time: str | None
    share_result: float | None
    status: str                  # 'Running' | 'Completed' | 'Failed'
    creation_date: str | None
    modified_date: str | None
    last_error: str | None
    is_retry: bool
