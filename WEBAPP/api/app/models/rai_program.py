from dataclasses import dataclass
from datetime import date


@dataclass
class RaiProgram:

    ID: str | None
    Canale: str
    Data: date
    Programma: str | None
    orario_inizio: str | None
    orario_fine: str | None
    share_predetto: float | None
    share_manuale: float | None
    share_reale: float | None

    @classmethod
    def map_from_row(cls, row) -> "RaiProgram":
        return cls(
            ID=str(row.ID) if row.ID is not None else None,
            Canale=row.Canale,
            Data=row.Data,
            Programma=row.Programma,
            orario_inizio=row.orario_inizio,
            orario_fine=row.orario_fine,
            share_predetto=row.share_predetto,
            share_manuale=row.share_manuale,
            share_reale=getattr(row, 'share_reale', None),
        )
