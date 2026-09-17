from __future__ import annotations

from dataclasses import dataclass

from app.models.simulation_sostituzione import SimulationSostituzione


@dataclass
class SimulationSostituzioneViewModel:
    
    id: str
    new_program_name: str | None
    new_program_share_storico: float | None
    share_result: float | None
    shap_values: dict[str, float] | None
    status: str
    creation_date: str | None
    modified_date: str | None
    last_error: str | None
    is_retry: bool
    user_email: str | None

    @classmethod
    def map_simulation_sostituzione_view_model_from_simulation_sostituzione(
        cls,
        sim: SimulationSostituzione,
    ) -> "SimulationSostituzioneViewModel":
        return cls(
            id=sim.id,
            new_program_name=sim.new_program_name,
            new_program_share_storico=sim.new_program_share_storico,
            share_result=sim.share_result,
            shap_values=sim.shap_values,
            status=sim.status,
            creation_date=sim.creation_date,
            modified_date=sim.modified_date,
            last_error=sim.last_error,
            is_retry=sim.is_retry,
            user_email=sim.user_email,
        )
