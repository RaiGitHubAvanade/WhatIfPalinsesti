from dataclasses import dataclass, field

from app.view_models.palinsesto_view_model import PalinsestoViewModel


@dataclass
class WeeklyTableViewModel:
    week: str
    channel: str
    rows: list[PalinsestoViewModel] = field(default_factory=list)
