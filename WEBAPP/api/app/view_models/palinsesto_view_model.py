from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from app.models.palinsesto import Palinsesto

_DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]


@dataclass
class PalinsestoViewModel:
    day: str
    from_time: str | None
    to_time: str | None
    program_name: str | None
    share_expected: float | None
    share_manual: float | None
    share_real: float | None

    @classmethod
    def MapPalinsestoViewModelFromPalinsesto(cls, row: Palinsesto) -> "PalinsestoViewModel":
        d = row.data
        day_label = _DAY_NAMES[d.weekday()] + " " + d.strftime("%d/%m") if isinstance(d, date) else str(d)
        return cls(
            day=day_label,
            from_time=row.orario_inizio or None,
            to_time=row.orario_fine or None,
            program_name=row.programma,
            share_expected=row.share_predetto,
            share_manual=row.share_manuale,
            share_real=row.share_reale,
        )
