from dataclasses import dataclass


@dataclass
class CandidateProgram:
    
    titolo: str | None
    canale: str
    tipologia: str | None
    genere: str | None
    eta: str | None
    share_storico_pct: float | None
    durata_minuti: int | None

    @classmethod
    def map_from_row(cls, row) -> "CandidateProgram":
        return cls(
            titolo=getattr(row, 'titolo', None),
            canale=row.canale,
            tipologia=getattr(row, 'tipologia', None),
            genere=getattr(row, 'genere', None),
            eta=getattr(row, 'eta', None),
            share_storico_pct=getattr(row, 'share_storico_pct', None),
            durata_minuti=getattr(row, 'durata_minuti', None),
        )
