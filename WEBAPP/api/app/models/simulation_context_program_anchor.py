from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass
class SimulationContextProgramAnchor:
    ruolo: str
    programma: str | None
    programma_norm: str | None
    canale: str | None
    data: date | None
    tipo_giorno: str | None
    orario_inizio: str | None
    orario_fine: str | None = None
    storico_share: float | None = None

    @classmethod
    def map_from_row(cls, row) -> "SimulationContextProgramAnchor":
        return cls(
            ruolo=getattr(row, "ruolo"),
            programma=getattr(row, "Programma", None),
            programma_norm=getattr(row, "programma_norm", None),
            canale=getattr(row, "Canale", None),
            data=getattr(row, "Data", None),
            tipo_giorno=getattr(row, "TipoGiorno", None),
            orario_inizio=getattr(row, "orario_inizio", None),
            orario_fine=getattr(row, "orario_fine", None),
            storico_share=getattr(row, "StoricoShare", None),
        )
