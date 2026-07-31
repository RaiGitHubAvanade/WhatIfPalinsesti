from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ServingEndpointSostituzioneRequest:
    
    program_id: str | None
    program_name: str | None
    program_channel: str | None
    program_date: str | None
    program_from_time: str | None
    program_to_time: str | None
    program_share_predict: float | None
    scenario_type: str | None
    new_program_name: str | None
    new_program_share_storico: float | None

    @classmethod
    def from_body(cls, body: dict) -> "ServingEndpointSostituzioneRequest":
        return cls(
            program_id=body.get("program_id"),
            program_name=body.get("program_name"),
            program_channel=body.get("program_channel"),
            program_date=body.get("program_date"),
            program_from_time=body.get("program_from_time"),
            program_to_time=body.get("program_to_time"),
            program_share_predict=body.get("program_share_predict"),
            scenario_type=body.get("scenario_type"),
            new_program_name=body.get("new_program_name"),
            new_program_share_storico=body.get("new_program_share_storico"),
        )

    def retrieve_missing_parameters(self) -> list[str]:
        return [
            name for name, val in {
                "program_id": self.program_id,
                "program_name": self.program_name,
                "program_channel": self.program_channel,
                "program_date": self.program_date,
                "program_from_time": self.program_from_time,
                "program_to_time": self.program_to_time,
                "program_share_predict": self.program_share_predict,
                "scenario_type": self.scenario_type,
                "new_program_name": self.new_program_name,
            }.items()
            if val is None
        ]

    def to_payload(self) -> dict:
        return {
            "inputs": {
                "Programma_da_sostituire": [self.program_id],
                "Programma_proposto": [self.new_program_name],
            }
        }
