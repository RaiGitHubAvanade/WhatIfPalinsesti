from dataclasses import dataclass

from app.models.competitor_program import CompetitorProgram
from app.utils.number_utils import NumberUtils


@dataclass
class CompetitorProgramViewModel:
    id: str | None = None
    program_name: str | None = None
    from_time: str | None = None
    to_time: str | None = None
    share_storico: float | None = None
    evento_forte: bool = False

    @classmethod
    def from_competitor_program(cls, row: CompetitorProgram) -> "CompetitorProgramViewModel":
        return cls(
            id=row.ID,
            program_name=row.Programma,
            from_time=row.orario_inizio,
            to_time=row.orario_fine,
            share_storico=NumberUtils.float_to_percent(row.share_storico),
            evento_forte=bool(row.evento_forte),
        )
