from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date


@dataclass
class SimulationContextReference:
    key: str
    label: str
    role: str
    program_name: str | None
    channel: str | None
    share_storico: float | None
    programma_norm: str | None = None
    data_rif: date | None = None
    tipo_giorno: str | None = None
    ora_rif: int | None = None
    from_time: str | None = None
    to_time: str | None = None
    children: list["SimulationContextReference"] = field(default_factory=list)
    is_group: bool = False

    def is_queryable(self) -> bool:
        return (
            self.programma_norm is not None
            and self.channel is not None
            and self.data_rif is not None
            and self.tipo_giorno is not None
            and self.ora_rif is not None
        )
