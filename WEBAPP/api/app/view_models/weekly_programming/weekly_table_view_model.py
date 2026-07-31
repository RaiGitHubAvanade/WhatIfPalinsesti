from dataclasses import dataclass, field

from app.view_models.weekly_programming.rai_program_view_model import RaiProgramViewModel


@dataclass
class WeeklyTableViewModel:
    
    week: str
    channel: str
    rows: list[RaiProgramViewModel] = field(default_factory=list)
