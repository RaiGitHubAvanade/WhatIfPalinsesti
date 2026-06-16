from dataclasses import dataclass, field

from app.view_models.other_program_view_model import OtherProgramViewModel
from app.models.other_channel import OtherChannel


@dataclass
class OtherChannelViewModel:
    channel: str
    channel_type: str
    programs: list[OtherProgramViewModel] = field(default_factory=list)


    @staticmethod
    def _get_channel_type(channel: str) -> str:
        if channel.startswith("Rai"):
            return "RAI"
        else:
            return "Competitor"
        
    @classmethod
    def MapOtherChannelViewModelFromOtherChannel(
        cls,
        canale: str,
        rows: list[OtherChannel],
    ) -> "OtherChannelViewModel":
        return cls(
            channel=canale,
            channel_type=cls._get_channel_type(canale),
            programs=[
                OtherProgramViewModel.MapOtherProgramViewModelFromOtherChannel(row)
                for row in rows
            ],
        )
