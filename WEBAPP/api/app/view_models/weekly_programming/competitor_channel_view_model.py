from dataclasses import dataclass, field

from app.view_models.weekly_programming.other_program_view_model import OtherProgramViewModel
from app.models.program import Program


@dataclass
class CompetitorChannelViewModel:
    channel: str
    channel_type: str
    programs: list[OtherProgramViewModel] = field(default_factory=list)

    @staticmethod
    def _get_channel_type(channel: str) -> str:
        if channel.startswith("Rai"):
            return "RAI"
        return "Competitor"

    @classmethod
    def MapCompetitorChannelViewModelFromProgram(
        cls,
        canale: str,
        rows: list[Program],
    ) -> "CompetitorChannelViewModel":
        return cls(
            channel=canale,
            channel_type=cls._get_channel_type(canale),
            programs=[
                OtherProgramViewModel.MapOtherProgramViewModelFromProgram(row)
                for row in rows
            ],
        )
