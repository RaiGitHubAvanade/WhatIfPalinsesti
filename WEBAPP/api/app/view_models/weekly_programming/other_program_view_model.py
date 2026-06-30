from dataclasses import dataclass
from datetime import date as date_type
from app.models.program import Program


@dataclass
class OtherProgramViewModel:
    channel: str
    program_name: str | None = None
    from_time: str | None = None
    to_time: str | None = None
    date: str | None = None
    share_predicted: float | None = None
    share_storico: float | None = None
    target_sex: str | None = None
    target_age: str | None = None
    genre: str | None = None

    @classmethod
    def MapRaiProgramViewModelFromProgram(cls, row: Program) -> "OtherProgramViewModel":
        """For get_palinsesto_futuro_rai — populates share_predicted from share_predetto."""
        d = row.data
        return cls(
            channel=row.canale,
            program_name=row.programma,
            from_time=row.orario_inizio,
            to_time=row.orario_fine,
            date=d.isoformat() if isinstance(d, date_type) else str(d) if d else None,
            share_predicted=row.share_predetto,
            target_sex=row.target_sesso,
            target_age=row.target_eta,
            genre=row.genere,
        )

    @classmethod
    def MapOtherProgramViewModelFromProgram(cls, row: Program) -> "OtherProgramViewModel":
        """For get_candidate_programs and weekly competitors — populates share_storico."""
        d = row.data
        return cls(
            channel=row.canale,
            program_name=row.programma,
            from_time=row.orario_inizio,
            to_time=row.orario_fine,
            date=d.isoformat() if isinstance(d, date_type) else str(d) if d else None,
            share_storico=row.share_storico,
            target_sex=row.target_sesso,
            target_age=row.target_eta,
            genre=row.genere,
        )
