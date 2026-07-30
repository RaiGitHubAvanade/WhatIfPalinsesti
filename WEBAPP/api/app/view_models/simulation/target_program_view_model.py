from dataclasses import dataclass
from datetime import date as date_type

from app.models.target_program import TargetProgram
from app.utils.number_utils import NumberUtils


@dataclass
class TargetProgramViewModel:
    channel: str
    id: str | None = None
    program_name: str | None = None
    from_time: str | None = None
    to_time: str | None = None
    date: str | None = None
    share_predicted: float | None = None
    target_sex: str | None = None
    target_age: str | None = None
    genre: str | None = None
    duration_minutes: float | None = None

    @classmethod
    def from_target_program(cls, row: TargetProgram) -> "TargetProgramViewModel":
        d = row.Data
        return cls(
            id=row.ID,
            channel=row.Canale,
            program_name=row.Programma,
            from_time=row.orario_inizio,
            to_time=row.orario_fine,
            date=d.isoformat() if isinstance(d, date_type) else str(d) if d else None,
            share_predicted=NumberUtils.float_to_percent(row.share_predetto),
            target_sex=row.target_genere,
            target_age=NumberUtils.format_age(row.target_eta),
            genre=row.DES_GENERE_ESTESA_INT,
            duration_minutes=row.durata_minuti,
        )
