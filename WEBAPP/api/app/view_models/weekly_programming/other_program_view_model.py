from dataclasses import dataclass
from datetime import date as date_type
from app.models.program import Program


@dataclass
class OtherProgramViewModel:
    canale: str
    program_name: str | None = None
    from_time: str | None = None
    to_time: str | None = None
    date: str | None = None
    share_storico: float | None = None
    target_sex: str | None = None
    target_age: str | None = None
    genre: str | None = None

    @classmethod
    def MapOtherProgramViewModelFromProgram(cls, row: Program) -> "OtherProgramViewModel":
        d = row.data
        return cls(
            canale=row.canale,
            program_name=row.programma,
            from_time=row.orario_inizio,
            to_time=row.orario_fine,
            date=d.isoformat() if isinstance(d, date_type) else str(d) if d else None,
            share_storico=row.share_storico,
            target_sex=row.target_sesso,
            target_age=row.target_eta,
            genre=row.genere,
        )
