from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from app.models.program import Program
from app.utils.number_utils import NumberUtils


@dataclass
class ProgramViewModel:
    day: str
    from_time: str | None
    to_time: str | None
    program_name: str | None
    share_expected: float | None
    share_manual: float | None
    share_real: float | None

    @classmethod
    def MapProgramViewModelFromProgram(cls, row: Program) -> "ProgramViewModel":
        d = row.data
        day_iso = d.isoformat() if isinstance(d, date) else str(d)
        return cls(
            day=day_iso,
            from_time=row.orario_inizio or None,
            to_time=row.orario_fine or None,
            program_name=row.programma,
            share_expected=NumberUtils.float_to_percent(row.share_predetto),
            share_manual=NumberUtils.float_to_percent(row.share_manuale),
            share_real=NumberUtils.float_to_percent(row.share_reale),
        )
