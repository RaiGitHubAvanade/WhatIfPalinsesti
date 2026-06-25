from dataclasses import dataclass
from app.models.program import Program


@dataclass
class OtherProgramViewModel:
    canale: str
    program_name: str | None
    from_time: str
    to_time: str
    share_storico: float | None
    target_genere: str | None
    target_eta: str | None
    genere_predominante: str | None

    @classmethod
    def MapOtherProgramViewModelFromProgram(cls, row: Program) -> "OtherProgramViewModel":
        return cls(
            canale=row.canale,
            program_name=row.programma,
            from_time=row.orario_inizio,
            to_time=row.orario_fine,
            share_storico=row.share_storico,
            target_genere=row.target_genere,
            target_eta=row.target_eta,
            genere_predominante=row.genere_predominante,
        )
