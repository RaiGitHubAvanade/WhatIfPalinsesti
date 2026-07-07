from __future__ import annotations

from dataclasses import dataclass

from app.models.simulation import SimulationSposta


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

    @classmethod
    def MapSimulationSpostaViewModelFromSimulationSposta(cls, sim: SimulationSposta) -> "SimulationSpostViewModel":
        return cls(
            id=sim.id,
            new_channel=sim.new_channel,
            new_date=sim.new_date,
            new_from_time=sim.new_from_time,
            share_result=sim.share_result,
            status=sim.status,
            creation_date=sim.creation_date,
            modified_date=sim.modified_date,
            last_error=sim.last_error,
            is_retry=sim.is_retry,
        )
