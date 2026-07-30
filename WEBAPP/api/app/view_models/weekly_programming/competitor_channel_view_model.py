from dataclasses import dataclass, field

from app.models.competitor_program import CompetitorProgram
from app.view_models.weekly_programming.competitor_program_view_model import CompetitorProgramViewModel


@dataclass
class CompetitorChannelViewModel:
    channel: str
    channel_type: str
    programs: list[CompetitorProgramViewModel] = field(default_factory=list)

    @staticmethod
    def _get_channel_type(channel: str) -> str:
        if channel.startswith("Rai"):
            return "RAI"
        return "Competitor"

    @classmethod
    def MapCompetitorChannelViewModelFromProgram(
        cls,
        canale: str,
        rows: list[CompetitorProgram],
    ) -> "CompetitorChannelViewModel":
        return cls(
            channel=canale,
            channel_type=cls._get_channel_type(canale),
            programs=[
                CompetitorProgramViewModel.from_competitor_program(row)
                for row in rows
            ],
        )
