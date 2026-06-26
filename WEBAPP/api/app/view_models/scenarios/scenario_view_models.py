from __future__ import annotations

from dataclasses import dataclass, field

from app.view_models.scenarios.simulation_view_models import SimulationSostViewModel, SimulationSpostViewModel


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
