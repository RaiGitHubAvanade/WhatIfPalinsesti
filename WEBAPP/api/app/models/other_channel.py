from dataclasses import dataclass

from app.utils.date_time_utils import DateTimeUtils


@dataclass
class OtherChannel:
    canale: str
    programma: str | None
    orario_inizio: str
    orario_fine: str

    @classmethod
    def MapOtherChannelFromRow(cls, row) -> "OtherChannel":
        return cls(
            canale=row.Canale,
            programma=row.Programma,
            orario_inizio=row.orario_inizio,
            orario_fine=row.orario_fine,
        )

    @classmethod
    def MapOtherChannelFromRowTRX(cls, row) -> "OtherChannel":
        return cls(
            canale=row.Canale,
            programma=row.Programma,
            orario_inizio=DateTimeUtils.seconds_to_hhmm(row.ORA_INIZIO_TRX),
            orario_fine=DateTimeUtils.seconds_to_hhmm(row.ORA_FINE_TRX),
        )
