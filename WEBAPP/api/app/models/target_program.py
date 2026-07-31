from dataclasses import dataclass
from datetime import date


@dataclass
class TargetProgram:
    
    ID: str | None
    Canale: str
    Data: date
    Programma: str | None
    orario_inizio: str | None
    orario_fine: str | None
    share_predetto: float | None
    target_genere: str | None
    target_eta: str | None
    DES_GENERE_ESTESA_INT: str | None
    durata_minuti: int | None

    @classmethod
    def map_from_row(cls, row) -> "TargetProgram":
        return cls(
            ID=str(row.ID) if row.ID is not None else None,
            Canale=row.Canale,
            Data=row.Data,
            Programma=row.Programma,
            orario_inizio=row.orario_inizio,
            orario_fine=row.orario_fine,
            share_predetto=row.share_predetto,
            target_genere=getattr(row, 'target_genere', None),
            target_eta=getattr(row, 'target_eta', None),
            DES_GENERE_ESTESA_INT=getattr(row, 'DES_GENERE_ESTESA_INT', None),
            durata_minuti=int(row.durata_minuti) if getattr(row, 'durata_minuti', None) is not None else None,
        )
