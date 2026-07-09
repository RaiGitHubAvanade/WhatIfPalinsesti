from dataclasses import dataclass
from datetime import date

from app.utils.date_time_utils import DateTimeUtils
from app.utils.number_utils import NumberUtils


@dataclass
class Program:
    """Unified model for any scheduled TV program slot.

    Fields are named after the lowercased DB column names.
    Only canale is required; all other fields are None when the source table
    does not provide them (e.g. catalog programs have no scheduled airtime).
    """
    canale: str
    programma: str | None = None
    orario_inizio: str | None = None
    orario_fine: str | None = None
    id: str | None = None
    # Weekly programming fields (output_palinsesto_delta / out_palinsesto_predict)
    data: date | None = None
    share_predetto: float | None = None
    share_manuale: float | None = None
    share_reale: float | None = None
    # Competitor / RAI future schedule fields (vw_output_palinsesto_futuro)
    share_storico: float | None = None
    target_sesso: str | None = None
    target_eta: str | None = None
    genere: str | None = None
    evento_forte: bool | None = None

    @classmethod
    def MapProgramFromRow(cls, row) -> "Program":
        """Weekly programming rows (delta/predict tables).
        share_reale is present only in the delta table; getattr handles both cases."""
        return cls(
            canale=row.Canale,
            id=row.ID,
            data=row.Data,
            programma=row.Programma,
            orario_inizio=row.orario_inizio,
            orario_fine=row.orario_fine,
            share_predetto=row.share_predetto,
            share_manuale=row.share_manuale,
            share_reale=getattr(row, 'share_reale', None),
        )

    @classmethod
    def MapProgramFromRaiPredictRow(cls, row) -> "Program":
        """RAI predict schedule (out_palinsesto_predict_all_slots)."""
        return cls(
            canale=row.Canale,
            id=row.ID,
            data=row.Data,
            programma=row.Programma,
            orario_inizio=row.orario_inizio,
            orario_fine=row.orario_fine,
            share_predetto=NumberUtils.float_to_percent(row.share_predetto),
            target_sesso=row.target_genere,
            target_eta=row.target_eta,
            genere=row.DES_GENERE_ESTESA_INT,
        )

    @classmethod
    def MapProgramFromFutureRow(cls, row) -> "Program":
        """Future competitor overlap view (vw_output_palinsesto_futuro) — scheduling fields only."""
        return cls(
            canale=row.Canale,
            data=row.Data,
            programma=row.Programma,
            orario_inizio=row.orario_inizio,
            orario_fine=row.orario_fine,
        )

    @classmethod
    def MapProgramFromFutureRowDetailed(cls, row) -> "Program":
        """Future competitor overlap view with extended fields for scenario competitor display."""
        return cls(
            canale=row.Canale,
            id=row.ID,
            data=row.Data,
            programma=row.Programma,
            orario_inizio=row.orario_inizio,
            orario_fine=row.orario_fine,
            share_storico=NumberUtils.float_to_percent(row.share_storico),
            evento_forte=bool(row.evento_forte),
        )

    @classmethod
    def MapProgramFromCandidateRow(cls, row) -> "Program":
        """Candidate replacement programs from output_lista_programmi_sostituzione.
        share_storico_pct is already a percentage — no float_to_percent conversion."""
        return cls(
            canale=row.canale,
            programma=row.titolo,
            genere=row.tipologia,
            target_sesso=row.genere,
            target_eta=row.eta,
            share_storico=row.share_storico_pct,
        )

    @classmethod
    def MapProgramFromRowTRX(cls, row) -> "Program":
        """Historical competitor programs from storico_programmi (TRX seconds format)."""
        return cls(
            canale=row.Canale,
            programma=row.Programma,
            orario_inizio=DateTimeUtils.seconds_to_hhmm(row.ORA_INIZIO_TRX),
            orario_fine=DateTimeUtils.seconds_to_hhmm(row.ORA_FINE_TRX),
        )

