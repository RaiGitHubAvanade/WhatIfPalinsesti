from __future__ import annotations

from dataclasses import dataclass, field

from app.models.scenario import Scenario
from app.models.simulation import SimulationSost
from app.view_models.simulation import SimulationSostViewModel, SimulationSpostViewModel


@dataclass
class ScenarioViewModel:
    
    id: str
    scenario_type: str           # 'sostituzione' | 'spostamento'
    program_id: str
    program_name: str
    program_channel: str
    program_date: str | None
    program_from_time: str | None
    program_to_time: str | None
    program_share_predict: float | None
    creation_date: str | None
    modified_date: str | None
    simulations: list[SimulationSostViewModel | SimulationSpostViewModel] = field(default_factory=list)

    @classmethod
    def MapScenarioViewModelFromScenario(cls, s: Scenario) -> "ScenarioViewModel":
        return cls(
            id=s.id,
            scenario_type=s.scenario_type,
            program_id=s.program_id,
            program_name=s.program_name,
            program_channel=s.program_channel,
            program_date=s.program_date,
            program_from_time=s.program_from_time,
            program_to_time=s.program_to_time,
            program_share_predict=s.program_share_predict,
            creation_date=s.creation_date,
            modified_date=s.modified_date,
            simulations=[
                SimulationSostViewModel.MapSimulationSostViewModelFromSimulationSost(sim)
                if isinstance(sim, SimulationSost)
                else SimulationSpostViewModel.MapSimulationSpostaViewModelFromSimulationSposta(sim)
                for sim in s.simulations
            ],
        )


@dataclass
class ScenarioListViewModel:
    scenarios: list[ScenarioViewModel] = field(default_factory=list)
    total: int = 0
