from __future__ import annotations
from dataclasses import dataclass


@dataclass
class SimulationSostRequest:
    """Input data for starting or retrying a sostituzione simulation."""
    program_name: str | None
    program_channel: str | None
    program_date: str | None
    program_from_time: str | None
    scenario_type: str | None
    new_program_name: str | None
    new_program_share_storico: float | None
    program_share_predict: float | None = None

    @classmethod
    def from_body(cls, body: dict) -> "SimulationSostRequest":
        return cls(
            program_name=body.get("program_name"),
            program_channel=body.get("program_channel"),
            program_date=body.get("program_date"),
            program_from_time=body.get("program_from_time"),
            scenario_type=body.get("scenario_type"),
            new_program_name=body.get("new_program_name"),
            new_program_share_storico=body.get("new_program_share_storico"),
            program_share_predict=body.get("program_share_predict"),
        )
    
    def retrieve_missing_parameters(self) -> list[str]:
        return [
            name for name, val in {
                "program_name":              self.program_name,
                "program_channel":           self.program_channel,
                "program_date":              self.program_date,
                "program_from_time":         self.program_from_time,
                "scenario_type":             self.scenario_type,
                "new_program_name":          self.new_program_name,
                "new_program_share_storico": self.new_program_share_storico,
            }.items()
            if val is None
        ]

    def to_payload(self) -> dict:
        return {
            "inputs": {
                "Programma_da_sostituire": {
                    "data_str":     [self.program_date],
                    "Canale":       [self.program_channel],
                    "orario_inizio": [self.program_from_time],
                    "Programma":    [self.program_name],
                },
                "Programma_proposto": {
                    "Programma": [self.new_program_name],
                },
            }
        }
