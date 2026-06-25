from __future__ import annotations

from dataclasses import dataclass, field


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


@dataclass
class ScenarioViewModel:
    """One scenario with its nested simulations."""
    id: str
    scenario_type: str           # 'sostituzione' | 'spostamento'
    program_name: str
    program_channel: str
    program_date: str | None
    program_from_time: str | None
    program_share_predict: float | None
    creation_date: str | None
    simulations: list[SimulationSostViewModel | SimulationSpostViewModel] = field(default_factory=list)


@dataclass
class ScenarioListViewModel:
    scenarios: list[ScenarioViewModel] = field(default_factory=list)
    total: int = 0
