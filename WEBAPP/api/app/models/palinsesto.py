from dataclasses import dataclass
from datetime import date


@dataclass
class Palinsesto:
    canale: str
    data: date
    programma: str
    orario_inizio: str
    orario_fine: str
    share_predetto: float | None
    share_manuale: float | None
    share_reale: float | None

    @classmethod
    def MapPalinsestoPredictFromRow(cls, row) -> "Palinsesto":
        """Create a Palinsesto instance from a Databricks SQL connector Row."""
        return cls(
            canale=row.Canale,
            data=row.Data,
            programma=row.Programma,
            orario_inizio=row.orario_inizio,
            orario_fine=row.orario_fine,
            share_predetto=row.share_predetto,
            share_manuale=row.share_manuale,
            share_reale=None,
        )
    
    @classmethod
    def MapPalinsestoDeltaFromRow(cls, row) -> "Palinsesto":
        """Create a PalinsestoDelta instance from a Databricks SQL connector Row."""
        return cls(
            canale=row.Canale,
            data=row.Data,
            programma=row.Programma,
            orario_inizio=row.orario_inizio,
            orario_fine=row.orario_fine,
            share_predetto=row.share_predetto,
            share_manuale=row.share_manuale,
            share_reale=row.share_reale,
        )
