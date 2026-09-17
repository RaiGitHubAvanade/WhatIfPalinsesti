from __future__ import annotations

from dataclasses import dataclass

from app.models.simulation_spostamento import SimulationSpostamento


@dataclass
class SimulationSpostamentoViewModel:
    
    id: str
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
    def map_simulation_spostamento_view_model_from_simulation_spostamento(
        cls,
        sim: SimulationSpostamento,
    ) -> "SimulationSpostamentoViewModel":
        return cls(
            id=sim.id,
            new_channel=sim.new_channel,
            new_date=sim.new_date,
            new_from_time=sim.new_from_time,
            share_result=sim.share_result,
            shap_values=sim.shap_values,
            status=sim.status,
            creation_date=sim.creation_date,
            modified_date=sim.modified_date,
            last_error=sim.last_error,
            is_retry=sim.is_retry,
            user_email=sim.user_email,
        )
