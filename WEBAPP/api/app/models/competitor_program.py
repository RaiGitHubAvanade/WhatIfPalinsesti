from dataclasses import dataclass
from datetime import date


@dataclass
class CompetitorProgram:

    ID: str | None
    Canale: str
    Data: date | None
    Programma: str | None
    orario_inizio: str | None
    orario_fine: str | None
    share_storico: float | None
    evento_forte: bool | None

    @classmethod
    def map_from_row(cls, row) -> "CompetitorProgram":
        return cls(
            ID=str(getattr(row, 'ID', None)) if getattr(row, 'ID', None) is not None else None,
            Canale=row.Canale,
            Data=getattr(row, 'Data', None),
            Programma=row.Programma,
            orario_inizio=row.orario_inizio,
            orario_fine=row.orario_fine,
            share_storico=getattr(row, 'share_storico', None),
            evento_forte=bool(getattr(row, 'evento_forte', False)) if getattr(row, 'evento_forte', None) is not None else None,
        )
