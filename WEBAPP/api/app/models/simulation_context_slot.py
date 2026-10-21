from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass
class SimulationContextSlot:
    ruolo: str
    id: str | None
    canale: str | None
    data: date | None
    programma: str | None
    programma_norm: str | None
    tipo_giorno: str | None
    orario_inizio: str | None
    orario_fine: str | None
    durata_minuti: int | None
    storico_share: float | None
    programma_prev: str | None = None
    storico_share_prev: float | None = None
    programma_next: str | None = None
    storico_share_next: float | None = None
    programma_competitor: str | None = None
    canale_competitor: str | None = None
    storico_share_competitor: float | None = None

    @classmethod
    def map_from_row(cls, row) -> "SimulationContextSlot":
        raw_id = getattr(row, "ID", None)
        return cls(
            ruolo=getattr(row, "ruolo"),
            id=str(raw_id) if raw_id is not None else None,
            canale=getattr(row, "Canale", None),
            data=getattr(row, "Data", None),
            programma=getattr(row, "Programma", None),
            programma_norm=getattr(row, "programma_norm", None),
            tipo_giorno=getattr(row, "TipoGiorno", None),
            orario_inizio=getattr(row, "orario_inizio", None),
            orario_fine=getattr(row, "orario_fine", None),
            durata_minuti=getattr(row, "durata_minuti", None),
            storico_share=getattr(row, "StoricoShare", None),
            programma_prev=getattr(row, "Programma_prev", None),
            storico_share_prev=getattr(row, "StoricoShare_prev", None),
            programma_next=getattr(row, "Programma_next", None),
            storico_share_next=getattr(row, "StoricoShare_next", None),
            programma_competitor=getattr(row, "Programma_competitor", None),
            canale_competitor=getattr(row, "Canale_competitor", None),
            storico_share_competitor=getattr(row, "StoricoShare_competitor", None),
        )
