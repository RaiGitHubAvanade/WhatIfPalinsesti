from dataclasses import dataclass, field

from app.view_models.weekly_programming.competitor_channel_view_model import CompetitorChannelViewModel
from app.models.program import Program


@dataclass
class CompetitorProgramsViewModel:
    channel: str
    day: str
    from_time: str
    to_time: str
    program_name: str
    other_channels: list[CompetitorChannelViewModel] = field(default_factory=list)

    @classmethod
    def MapFromOtherChannels(
        cls,
        channel: str,
        day: str,
        from_time: str,
        to_time: str,
        program_name: str,
        rows: list[Program],
    ) -> "CompetitorProgramsViewModel":
        channel_map: dict[str, list[Program]] = {}
        for row in rows:
            channel_map.setdefault(row.canale, []).append(row)
        other_channels = [
            CompetitorChannelViewModel.MapCompetitorChannelViewModelFromProgram(ch_name, ch_rows)
            for ch_name, ch_rows in channel_map.items()
        ]
        return cls(
            channel=channel,
            day=day,
            from_time=from_time,
            to_time=to_time,
            program_name=program_name,
            other_channels=other_channels,
        )
