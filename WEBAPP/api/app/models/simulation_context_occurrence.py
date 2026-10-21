from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass
class SimulationContextOccurrence:
    ruolo: str
    data: date | None
    canale: str | None
    programma: str | None
    programma_norm: str | None
    ora_inizio_trx: int | None
    ora_fine_trx: int | None
    share: float | None
    tipo_trasmissione: str | None
    direzione_di_genere: str | None
    share_uomini_pct: float | None
    share_donne_pct: float | None
    durata_minuti: int | None
    amr: float | None
    platea: float | None
    amr_uomini: float | None
    amr_donne: float | None
    tipo_giorno: str | None

    @classmethod
    def map_from_row(cls, row) -> "SimulationContextOccurrence":
        return cls(
            ruolo=getattr(row, "ruolo"),
            data=getattr(row, "Data", None),
            canale=getattr(row, "Canale", None),
            programma=getattr(row, "Programma", None),
            programma_norm=getattr(row, "programma_norm", None),
            ora_inizio_trx=getattr(row, "ORA_INIZIO_TRX", None),
            ora_fine_trx=getattr(row, "ORA_FINE_TRX", None),
            share=getattr(row, "Share", None),
            tipo_trasmissione=getattr(row, "Tipo_Trasmissione", None),
            direzione_di_genere=getattr(row, "Direzione_Di_Genere", None),
            share_uomini_pct=getattr(row, "Share_Uomini_Pct", None),
            share_donne_pct=getattr(row, "Share_Donne_Pct", None),
            durata_minuti=getattr(row, "durata_minuti", None),
            amr=getattr(row, "AMR", None),
            platea=getattr(row, "Platea", None),
            amr_uomini=getattr(row, "AMR_Uomini", None),
            amr_donne=getattr(row, "AMR_Donne", None),
            tipo_giorno=getattr(row, "TipoGiorno", None),
        )
