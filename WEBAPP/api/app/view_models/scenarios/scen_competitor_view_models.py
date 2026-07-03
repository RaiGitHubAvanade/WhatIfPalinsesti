from dataclasses import dataclass, field

from app.models.program import Program


@dataclass
class ScenCompetitorProgramViewModel:
    id: str | None
    program_name: str | None
    from_time: str | None
    to_time: str | None
    share_storico: float | None
    evento_forte: bool

    @classmethod
    def MapFromProgram(cls, row: Program) -> "ScenCompetitorProgramViewModel":
        return cls(
            id=row.id,
            program_name=row.programma,
            from_time=row.orario_inizio,
            to_time=row.orario_fine,
            share_storico=row.share_storico,
            evento_forte=row.evento_forte or False,
        )


@dataclass
class ScenCompetitorChannelViewModel:
    channel: str
    channel_type: str
    programs: list[ScenCompetitorProgramViewModel] = field(default_factory=list)

    @staticmethod
    def _get_channel_type(channel: str) -> str:
        return "RAI" if channel.startswith("Rai") else "Competitor"

    @classmethod
    def MapFromRows(cls, channel: str, rows: list[Program]) -> "ScenCompetitorChannelViewModel":
        return cls(
            channel=channel,
            channel_type=cls._get_channel_type(channel),
            programs=[ScenCompetitorProgramViewModel.MapFromProgram(r) for r in rows],
        )


@dataclass
class ScenCompetitorProgramsViewModel:
    channel: str
    day: str
    from_time: str
    other_channels: list[ScenCompetitorChannelViewModel] = field(default_factory=list)

    @classmethod
    def MapFromRows(
        cls,
        channel: str,
        day: str,
        from_time: str,
        rows: list[Program],
    ) -> "ScenCompetitorProgramsViewModel":
        channel_map: dict[str, list[Program]] = {}
        for row in rows:
            channel_map.setdefault(row.canale, []).append(row)
        other_channels = [
            ScenCompetitorChannelViewModel.MapFromRows(ch_name, ch_rows)
            for ch_name, ch_rows in channel_map.items()
        ]
        return cls(
            channel=channel,
            day=day,
            from_time=from_time,
            other_channels=other_channels,
        )
