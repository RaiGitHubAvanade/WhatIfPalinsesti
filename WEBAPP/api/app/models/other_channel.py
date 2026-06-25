from dataclasses import dataclass

from app.utils.date_time_utils import DateTimeUtils
from app.utils.number_utils import NumberUtils


@dataclass
class OtherChannel:
    canale: str
    programma: str | None
    orario_inizio: str
    orario_fine: str
    share_storico: float | None
    target_genere: str | None
    target_eta: str | None
    genere_predominante: str | None

    @classmethod
    def MapOtherChannelFromRow(cls, row) -> "OtherChannel":
        return cls(
            canale=row.Canale,
            programma=row.Programma,
            orario_inizio=row.orario_inizio,
            orario_fine=row.orario_fine,
            share_storico=NumberUtils.float_to_percent(row.share_storico),
            target_genere=row.target_genere,
            target_eta=row.target_eta,
            genere_predominante=row.genere_predominante,
        )

    @classmethod
    def MapOtherChannelFromRowTRX(cls, row) -> "OtherChannel":
        return cls(
            canale=row.Canale,
            programma=row.Programma,
            orario_inizio=DateTimeUtils.seconds_to_hhmm(row.ORA_INIZIO_TRX),
            orario_fine=DateTimeUtils.seconds_to_hhmm(row.ORA_FINE_TRX),
            share_storico=None,
            target_genere=None,
            target_eta=None,
            genere_predominante=None,
        )
