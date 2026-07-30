from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from app.models.rai_program import RaiProgram
from app.utils.number_utils import NumberUtils


@dataclass
class RaiProgramViewModel:
    day: str
    from_time: str | None
    to_time: str | None
    program_name: str | None
    share_expected: float | None
    share_manual: float | None
    share_real: float | None
    id: str | None = None

    @classmethod
    def from_rai_program(cls, row: RaiProgram) -> "RaiProgramViewModel":
        d = row.Data
        day_iso = d.isoformat() if isinstance(d, date) else str(d)
        return cls(
            id=row.ID,
            day=day_iso,
            from_time=row.orario_inizio or None,
            to_time=row.orario_fine or None,
            program_name=row.Programma,
            share_expected=NumberUtils.float_to_percent(row.share_predetto),
            share_manual=NumberUtils.float_to_percent(row.share_manuale),
            share_real=NumberUtils.float_to_percent(row.share_reale),
        )
