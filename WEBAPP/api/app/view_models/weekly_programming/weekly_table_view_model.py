from dataclasses import dataclass, field

from app.view_models.weekly_programming.program_view_model import ProgramViewModel


@dataclass
class WeeklyTableViewModel:
    week: str
    channel: str
    rows: list[ProgramViewModel] = field(default_factory=list)
