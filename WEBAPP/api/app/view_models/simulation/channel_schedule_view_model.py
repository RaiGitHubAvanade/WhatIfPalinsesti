from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ScheduleItemViewModel:
    id: str
    title: str
    time: str
    end: str | None
    dur: int | None
    share: float | None
    tipo: str | None
    genre: str | None


@dataclass
class ChannelScheduleViewModel:
    ch: str
    date: str
    dest_time: str
    programs: list[ScheduleItemViewModel] = field(default_factory=list)
