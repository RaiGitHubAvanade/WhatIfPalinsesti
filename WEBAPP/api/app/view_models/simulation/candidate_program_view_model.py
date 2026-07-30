from dataclasses import dataclass

from app.models.candidate_program import CandidateProgram
from app.utils.number_utils import NumberUtils


@dataclass
class CandidateProgramViewModel:
    channel: str
    program_name: str | None = None
    share_storico: float | None = None
    target_sex: str | None = None
    target_age: str | None = None
    genre: str | None = None
    duration_minutes: int | None = None

    @classmethod
    def from_candidate_program(cls, row: CandidateProgram) -> "CandidateProgramViewModel":
        return cls(
            channel=row.canale,
            program_name=row.titolo,
            share_storico=row.share_storico_pct,
            target_sex=row.genere,
            target_age=NumberUtils.format_age(row.eta),
            genre=row.tipologia,
            duration_minutes=row.durata_minuti,
        )
