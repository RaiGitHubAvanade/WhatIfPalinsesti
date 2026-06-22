from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ProgramItemViewModel:
    id: str
    title: str
    genre: str | None
    time: str | None
    end: str | None
    dur: int | None
    ch: str
    share: float | None
    eta: str | None
    sesso: str | None
    tipo: str | None
    slot: str | None


@dataclass
class ProgramListViewModel:
    programs: list[ProgramItemViewModel] = field(default_factory=list)
    total: int = 0


@dataclass
class CompetitorItemViewModel:
    title: str
    ch: str
    tipo: str | None
    share: float | None
    evento: bool = False


@dataclass
class CompetitorListViewModel:
    competitors: list[CompetitorItemViewModel] = field(default_factory=list)


@dataclass
class SimResultSostViewModel:
    """Result of a sostituzione simulation."""
    mode: str  # 'sostituzione'
    orig_title: str
    orig_share: float | None
    orig_ch: str
    orig_time: str | None
    orig_end: str | None
    cand_title: str
    cand_share: float | None
    predicted_share: float | None
    delta: float | None


@dataclass
class SimResultSpostaViewModel:
    """Result of a spostamento simulation."""
    mode: str  # 'spostamento'
    prog_title: str
    orig_ch: str
    orig_date: str
    orig_time: str | None
    orig_end: str | None
    orig_slot_share: float | None
    dest_ch: str | None
    dest_date: str | None
    dest_time: str | None
    dest_slot_share: float | None
    delta: float | None


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
